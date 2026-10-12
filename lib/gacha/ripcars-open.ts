import { createPrivateKey, sign as signEd25519 } from 'node:crypto'
import { Connection, Keypair, VersionedTransaction } from '@solana/web3.js'
import { GARAGE_PACK } from '@/lib/gacha/ripcars-pack'
import { base58Decode } from '@/lib/gacha/solana-address'

const PRIVY_APP = 'cmquiko7e00ay0djrtzabzx09'
const PRIVY = 'https://auth.privy.io'
const RIP = 'https://app.ripcars.io'
const PKCS8 = Buffer.from('302e020100300506032b657004220420', 'hex')
const RPC = () => process.env.SOLANA_RPC?.trim() || 'https://api.mainnet-beta.solana.com'

export class RipCarsOpenError extends Error {
  readonly spent: boolean
  readonly code: string | null
  constructor(message: string, spent: boolean, code: string | null = null) {
    super(message)
    this.spent = spent
    this.code = code
  }
}

export type GarageCard = {
  mint: string
  name: string
  rarity: string
  imageUrl: string | null
  fmvUsd: number | null
  buybackUsd: unknown
  paySignature: string
  buybackSignature: string
}

type Json = Record<string, unknown>

let cached: { token: string; until: number } | null = null

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function garageSiwsMessage(address: string, nonce: string, issuedAt: string): string {
  return [
    'app.ripcars.io wants you to sign in with your Solana account:',
    address,
    '',
    `You are proving you own ${address}.`,
    '',
    'URI: https://app.ripcars.io',
    'Version: 1',
    'Chain ID: mainnet',
    `Nonce: ${nonce}`,
    `Issued At: ${issuedAt}`,
    'Resources:',
    '- https://privy.io',
  ].join('\n')
}

export function signSiwsMessage(message: string, keypair: Keypair): string {
  const seed = Buffer.from(keypair.secretKey.subarray(0, 32))
  const key = createPrivateKey({ key: Buffer.concat([PKCS8, seed]), format: 'der', type: 'pkcs8' })
  return signEd25519(null, Buffer.from(message, 'utf8'), key).toString('base64')
}

export function keypairFromSecret(raw: string): Keypair {
  const secret = raw.trim()
  try {
    if (secret.startsWith('[')) {
      const parsed = JSON.parse(secret) as unknown
      if (!Array.isArray(parsed) || parsed.some((item) => typeof item !== 'number')) throw new Error('bad')
      return Keypair.fromSecretKey(Uint8Array.from(parsed))
    }
    const base64 = /^[A-Za-z0-9+/]+=*$/.test(secret) && (secret.includes('+') || secret.includes('/') || secret.endsWith('='))
    const bytes = base64 ? Buffer.from(secret, 'base64') : base58Decode(secret)
    if (bytes.length === 64) return Keypair.fromSecretKey(bytes)
    if (bytes.length === 32) return Keypair.fromSeed(bytes)
  } catch {
    throw new Error('Solana opener key is not valid')
  }
  throw new Error('Solana opener key is not valid')
}

function openerKey(): Keypair {
  const secret = process.env.SOLANA_PRIVATE_KEY?.trim()
  if (!secret) throw new RipCarsOpenError('Solana opener key is not configured', false)
  try {
    return keypairFromSecret(secret)
  } catch {
    throw new RipCarsOpenError('Solana opener key is not valid', false)
  }
}

function asRecord(value: unknown): Json | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Json
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null
}

function finite(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) return Number(value)
  return null
}

function txId(given: unknown, sent: string): string {
  if (typeof given === 'string' && /^[1-9A-HJ-NP-Za-km-z]{64,100}$/.test(given)) return given
  return sent
}

export function readGarageCard(openBody: unknown, offer: unknown): Omit<GarageCard, 'paySignature' | 'buybackSignature'> | null {
  const body = asRecord(openBody)
  const car = asRecord(body?.car)
  const mint = text(car?.id)
  const name = text(car?.name)
  if (!mint || !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(mint) || !name) return null
  const image = text(car?.image)
  return {
    mint,
    name,
    rarity: text(body?.rarity) || text(car?.rarity) || 'unknown',
    imageUrl: image?.startsWith('https://') ? image : null,
    fmvUsd: finite(car?.fmv),
    buybackUsd: offer ?? car?.buyback ?? null,
  }
}

async function privy(path: string, body: Json): Promise<Json> {
  const res = await fetch(`${PRIVY}${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'privy-app-id': PRIVY_APP,
      'privy-client': 'react-auth:3.44.0',
      origin: 'https://app.ripcars.io',
    },
    body: JSON.stringify(body),
  })
  const parsed = asRecord(await res.json().catch(() => null))
  if (!res.ok || !parsed) throw new RipCarsOpenError('Rip Cars login failed', false)
  return parsed
}

async function accessToken(keypair: Keypair): Promise<string> {
  if (cached && cached.until > Date.now()) return cached.token
  const address = keypair.publicKey.toBase58()
  const init = await privy('/api/v1/siws/init', { address })
  const nonce = text(init.nonce)
  if (!nonce) throw new RipCarsOpenError('Rip Cars login failed', false)
  const issuedAt = new Date().toISOString()
  const message = garageSiwsMessage(address, nonce, issuedAt)
  const auth = await privy('/api/v1/siws/authenticate', {
    message,
    signature: signSiwsMessage(message, keypair),
    walletClientType: 'unknown',
    connectorType: 'solana_adapter',
    mode: 'login-or-sign-up',
    message_type: 'plain',
  })
  const token = text(auth.token)
  if (!token) throw new RipCarsOpenError('Rip Cars login failed', false)
  cached = { token, until: Date.now() + 45 * 60_000 }
  return token
}

async function rip(path: string, token: string, body: Json): Promise<{ ok: boolean; status: number; body: Json }> {
  const res = await fetch(`${RIP}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  const parsed = asRecord(await res.json().catch(() => null)) ?? {}
  if (res.status === 401) {
    cached = null
    throw new RipCarsOpenError('Rip Cars login expired', false, 'AUTH')
  }
  return { ok: res.ok, status: res.status, body: parsed }
}

function codeOf(body: Json): string | null {
  return text(body.code)
}

async function sendSigned(base64Tx: string, keypair: Keypair, preset: unknown, spentAfterSend: boolean): Promise<string> {
  const tx = VersionedTransaction.deserialize(Buffer.from(base64Tx, 'base64'))
  const connection = new Connection(RPC(), 'confirmed')
  let sent = ''
  try {
    tx.sign([keypair])
    sent = await connection.sendRawTransaction(tx.serialize(), { maxRetries: 3 })
  } catch {
    throw new RipCarsOpenError(spentAfterSend ? 'The car sale was not sent' : 'The Solana payment was not sent', spentAfterSend)
  }
  const signature = txId(preset, sent)
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const status = await connection.getSignatureStatuses([signature])
      const value = status.value[0]
      if (value?.err) {
        throw new RipCarsOpenError(spentAfterSend ? 'The car sale failed' : 'The Solana payment failed', spentAfterSend)
      }
      if (value?.confirmationStatus === 'confirmed' || value?.confirmationStatus === 'finalized') return signature
    } catch (err) {
      if (err instanceof RipCarsOpenError) throw err
    }
    await sleep(2_000)
  }
  throw new RipCarsOpenError(spentAfterSend ? 'The car sale is still confirming' : 'The Solana payment is still confirming', true)
}

async function openPaid(token: string, wallet: string, txSignature: string): Promise<Json> {
  let last = 'OPEN'
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const res = await rip('/api/gacha/open', token, { machine: GARAGE_PACK.code, txSignature, wallet })
    if (res.ok) return res.body
    last = codeOf(res.body) ?? 'OPEN'
    if (last === 'PAYMENT_REFUNDED') throw new RipCarsOpenError('Rip Cars returned the Solana payment', false, last)
    if (last === 'PAYMENT_PENDING' && attempt < 1) {
      await sleep(2_000)
      continue
    }
    if (last === 'CARD_PENDING' && attempt < 2) {
      await sleep(3_000)
      continue
    }
    throw new RipCarsOpenError('Rip Cars did not open the pack', true, last)
  }
  throw new RipCarsOpenError('Rip Cars did not open the pack', true, last)
}

async function freshToken(keypair: Keypair, token: string): Promise<string> {
  cached = null
  return accessToken(keypair).catch(() => token)
}

async function sellCar(token: string, wallet: string, mint: string, keypair: Keypair): Promise<{ signature: string; offer: unknown }> {
  let session = token
  let built = await rip('/api/gacha/buyback/tx', session, { mint, wallet }).catch(async (err) => {
    if (!(err instanceof RipCarsOpenError) || err.code !== 'AUTH') throw err
    session = await freshToken(keypair, session)
    return rip('/api/gacha/buyback/tx', session, { mint, wallet })
  })
  const raw = text(built.body.tx)
  if (!built.ok || !raw) throw new RipCarsOpenError('The car sale was not built', true)
  const offer = built.body.offer
  const signature = await sendSigned(raw, keypair, built.body.signature, true)
  for (let attempt = 0; attempt < 14; attempt += 1) {
    if (attempt > 0) await sleep(2_500)
    let res: { ok: boolean; status: number; body: Json }
    try {
      res = await rip('/api/gacha/buyback/confirm', session, { mint, signature })
    } catch (err) {
      if (!(err instanceof RipCarsOpenError) || err.code !== 'AUTH') throw new RipCarsOpenError('The car sale did not settle', true)
      session = await freshToken(keypair, session)
      continue
    }
    if (res.ok && res.body.status === 'settled') {
      return { signature: txId(res.body.signature, signature), offer: res.body.offer ?? offer }
    }
    if (res.status === 400 || res.status === 404) throw new RipCarsOpenError('The car sale was rejected', true)
  }
  throw new RipCarsOpenError('The car sale did not settle', true)
}

async function openAfterPay(keypair: Keypair, token: string, wallet: string, paySignature: string): Promise<{ token: string; body: Json }> {
  const failed = (err: unknown): never => {
    if (err instanceof RipCarsOpenError && err.code === 'PAYMENT_REFUNDED') throw err
    if (err instanceof RipCarsOpenError && err.spent) throw err
    throw new RipCarsOpenError('Rip Cars did not open the pack', true)
  }
  try {
    return { token, body: await openPaid(token, wallet, paySignature) }
  } catch (err) {
    if (!(err instanceof RipCarsOpenError) || err.code !== 'AUTH') return failed(err)
    const next = await freshToken(keypair, token)
    try {
      return { token: next, body: await openPaid(next, wallet, paySignature) }
    } catch (again) {
      return failed(again)
    }
  }
}

/** Spends the vault USDC on one Garage Pack, then sells the car back to Rip Cars. */
export async function openGaragePack(): Promise<GarageCard> {
  const keypair = openerKey()
  const wallet = keypair.publicKey.toBase58()
  let token = await accessToken(keypair)
  let built = await rip('/api/gacha/pay-tx', token, { machine: GARAGE_PACK.code, wallet, quantity: 1 }).catch(async (err) => {
    if (!(err instanceof RipCarsOpenError) || err.code !== 'AUTH') throw err
    token = await freshToken(keypair, token)
    return rip('/api/gacha/pay-tx', token, { machine: GARAGE_PACK.code, wallet, quantity: 1 })
  })
  const raw = text(built.body.tx)
  if (!built.ok || !raw) throw new RipCarsOpenError('Rip Cars did not build the payment', false)
  const paySignature = await sendSigned(raw, keypair, built.body.signature, false)
  const opened = await openAfterPay(keypair, token, wallet, paySignature)
  token = opened.token
  const preview = readGarageCard(opened.body, null)
  if (!preview) throw new RipCarsOpenError('The open did not return a car', true)
  const sold = await sellCar(token, wallet, preview.mint, keypair).catch((err: unknown) => {
    if (err instanceof RipCarsOpenError && err.spent) throw err
    throw new RipCarsOpenError('The car sale did not settle', true)
  })
  const card = readGarageCard(opened.body, sold.offer)
  if (!card) throw new RipCarsOpenError('The open did not return a car', true)
  return { ...card, paySignature, buybackSignature: sold.signature }
}
