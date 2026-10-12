import { PublicKey, SystemProgram, Transaction, TransactionInstruction } from '@solana/web3.js'
import { allowedCardImage } from '@/lib/gacha/card-face'
import { HELD_JOLTEON } from '@/lib/gacha/held-card'
import { solanaAddress } from '@/lib/gacha/solana-address'
import { VAULT_ADDRESS } from '@/lib/gacha/vault-stock'

const TOKEN_ID = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
const TOKEN_2022_ID = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb'
const ATA_ID = 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'
const METADATA_ID = 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'
const USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
const WSOL = 'So11111111111111111111111111111111111111112'
const SOLANA_RPC = 'https://api.mainnet-beta.solana.com'
const CARD_CAP = 24

const TOKEN = new PublicKey(TOKEN_ID)
const TOKEN_2022 = new PublicKey(TOKEN_2022_ID)
const ATA = new PublicKey(ATA_ID)
const METADATA = new PublicKey(METADATA_ID)

export class NftMoveError extends Error {
  readonly status: number
  constructor(message: string, status = 400) {
    super(message)
    this.status = status
  }
}

export type WalletCard = {
  mint: string
  name: string
  imageUrl: string | null
}

type Holding = {
  pubkey: string
  mint: string
  amount: string
  decimals: number
  program: string
}

export function isListableNft(mint: string, amount: string, decimals: number): boolean {
  if (mint === HELD_JOLTEON || mint === USDC || mint === WSOL) return false
  if (!solanaAddress(mint)) return false
  return amount === '1' && decimals === 0
}

export function holdingFromRpc(value: unknown): Holding | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as {
    pubkey?: unknown
    account?: {
      owner?: unknown
      data?: { parsed?: { info?: { mint?: unknown; tokenAmount?: { amount?: unknown; decimals?: unknown } } } }
    }
  }
  const pubkey = typeof raw.pubkey === 'string' ? solanaAddress(raw.pubkey) : null
  const program = typeof raw.account?.owner === 'string' ? raw.account.owner : ''
  const info = raw.account?.data?.parsed?.info
  const mint = typeof info?.mint === 'string' ? solanaAddress(info.mint) : null
  const amount = typeof info?.tokenAmount?.amount === 'string' ? info.tokenAmount.amount : ''
  const decimals = typeof info?.tokenAmount?.decimals === 'number' ? info.tokenAmount.decimals : -1
  if (!pubkey || !mint) return null
  if (program !== TOKEN_ID && program !== TOKEN_2022_ID) return null
  return { pubkey, mint, amount, decimals, program }
}

export function readCardMetadata(data: Uint8Array): { name: string; uri: string } | null {
  if (data.length < 70 || data[0] !== 4) return null
  const name = readBorshString(data, 65)
  if (!name) return null
  const symbol = readBorshString(data, name.offset)
  if (!symbol) return null
  const uri = readBorshString(data, symbol.offset)
  return { name: name.text, uri: uri?.text ?? '' }
}

function readBorshString(data: Uint8Array, offset: number): { text: string; offset: number } | null {
  if (offset + 4 > data.length) return null
  const length = data[offset] + (data[offset + 1] << 8) + (data[offset + 2] << 16) + (data[offset + 3] << 24)
  if (length < 0 || length > 400 || offset + 4 + length > data.length) return null
  const text = new TextDecoder().decode(data.subarray(offset + 4, offset + 4 + length)).replace(/\0/g, '').trim()
  return { text, offset: offset + 4 + length }
}

export function vaultDepositInstructions(input: {
  owner: PublicKey
  vault: PublicKey
  mint: PublicKey
  source: PublicKey
  program: PublicKey
}): TransactionInstruction[] {
  const dest = associatedTokenAddress(input.vault, input.mint, input.program)
  const transfer = Buffer.alloc(9)
  transfer.writeUInt8(3, 0)
  transfer.writeBigUInt64LE(BigInt(1), 1)
  return [
    new TransactionInstruction({
      programId: ATA,
      data: Buffer.from([1]),
      keys: [
        { pubkey: input.owner, isSigner: true, isWritable: true },
        { pubkey: dest, isSigner: false, isWritable: true },
        { pubkey: input.vault, isSigner: false, isWritable: false },
        { pubkey: input.mint, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: input.program, isSigner: false, isWritable: false },
      ],
    }),
    new TransactionInstruction({
      programId: input.program,
      data: transfer,
      keys: [
        { pubkey: input.source, isSigner: false, isWritable: true },
        { pubkey: dest, isSigner: false, isWritable: true },
        { pubkey: input.owner, isSigner: true, isWritable: false },
      ],
    }),
  ]
}

export function associatedTokenAddress(owner: PublicKey, mint: PublicKey, program: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [owner.toBuffer(), program.toBuffer(), mint.toBuffer()],
    ATA,
  )[0]
}

export function unsignedDepositTransaction(input: {
  owner: PublicKey
  vault: PublicKey
  mint: PublicKey
  source: PublicKey
  program: PublicKey
  blockhash: string
}): Uint8Array {
  const tx = new Transaction()
  tx.feePayer = input.owner
  tx.recentBlockhash = input.blockhash
  for (const ix of vaultDepositInstructions(input)) tx.add(ix)
  return tx.serialize({ requireAllSignatures: false, verifySignatures: false })
}

export async function listWalletCards(ownerText: string): Promise<{ cards: WalletCard[]; truncated: boolean }> {
  const owner = solanaAddress(ownerText)
  if (!owner || owner === VAULT_ADDRESS) throw new NftMoveError('Enter a Solana address.')
  const [classic, modern] = await Promise.all([
    tokenAccounts(owner, { programId: TOKEN_ID }),
    tokenAccounts(owner, { programId: TOKEN_2022_ID }),
  ])
  const found: Holding[] = []
  const seen = new Set<string>()
  for (const item of [...classic, ...modern]) {
    if (seen.has(item.mint) || !isListableNft(item.mint, item.amount, item.decimals)) continue
    seen.add(item.mint)
    found.push(item)
  }
  found.sort((a, b) => a.mint.localeCompare(b.mint))
  const truncated = found.length > CARD_CAP
  const chosen = found.slice(0, CARD_CAP)
  const meta = await metadataFor(chosen.map((item) => item.mint)).catch(() => new Map<string, { name: string; uri: string }>())
  const cards: Array<WalletCard & { uri: string }> = chosen.map((item) => {
    const row = meta.get(item.mint)
    return {
      mint: item.mint,
      name: cleanName(row?.name ?? '', item.mint),
      imageUrl: null,
      uri: row?.uri ?? '',
    }
  })
  await attachImages(cards)
  return {
    truncated,
    cards: cards.map((card) => ({ mint: card.mint, name: card.name, imageUrl: card.imageUrl })),
  }
}

export async function buildVaultDeposit(ownerText: string, mintText: string): Promise<string> {
  const owner = solanaAddress(ownerText)
  const mint = solanaAddress(mintText)
  if (!owner || owner === VAULT_ADDRESS) throw new NftMoveError('Enter a Solana address.')
  if (!mint || !isListableNft(mint, '1', 0)) throw new NftMoveError('This card cannot be listed.')
  const holding = await findHolding(owner, mint)
  if (!holding) throw new NftMoveError('This card is not in that wallet.', 409)
  const blockhash = await latestBlockhash()
  const raw = unsignedDepositTransaction({
    owner: new PublicKey(owner),
    vault: new PublicKey(VAULT_ADDRESS),
    mint: new PublicKey(mint),
    source: new PublicKey(holding.pubkey),
    program: new PublicKey(holding.program),
    blockhash,
  })
  return Buffer.from(raw).toString('base64')
}

async function findHolding(owner: string, mint: string): Promise<Holding | null> {
  const match = (item: Holding) => item.mint === mint && isListableNft(mint, item.amount, item.decimals)
  let classic: Holding[] = []
  let mintFailed = false
  try {
    classic = await tokenAccounts(owner, { mint })
  } catch {
    // The public RPC answers INTERNAL_ERROR for some mint filters. A program scan still works.
    mintFailed = true
  }
  const hit = classic.find(match)
  if (hit) return hit
  if (mintFailed) {
    const [legacy, modern] = await Promise.all([
      tokenAccounts(owner, { programId: TOKEN_ID }),
      tokenAccounts(owner, { programId: TOKEN_2022_ID }),
    ])
    return [...legacy, ...modern].find(match) ?? null
  }
  const modern = await tokenAccounts(owner, { programId: TOKEN_2022_ID })
  return modern.find(match) ?? null
}

async function tokenAccounts(owner: string, filter: { mint: string } | { programId: string }): Promise<Holding[]> {
  const result = await rpc<{ value?: unknown[] }>('getTokenAccountsByOwner', [owner, filter, { encoding: 'jsonParsed' }])
  return (result.value ?? []).flatMap((item) => {
    const holding = holdingFromRpc(item)
    return holding ? [holding] : []
  })
}

async function latestBlockhash(): Promise<string> {
  const result = await rpc<{ value?: { blockhash?: string } }>('getLatestBlockhash', [{ commitment: 'confirmed' }])
  const blockhash = result.value?.blockhash ?? ''
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(blockhash)) {
    throw new NftMoveError('Solana did not return a blockhash.', 502)
  }
  return blockhash
}

async function metadataFor(mints: string[]): Promise<Map<string, { name: string; uri: string }>> {
  const out = new Map<string, { name: string; uri: string }>()
  if (mints.length === 0) return out
  const addresses = mints.map((mint) => metadataAddress(mint))
  const result = await rpc<{ value?: Array<{ data?: [string, string] | string } | null> }>('getMultipleAccounts', [
    addresses,
    { encoding: 'base64' },
  ])
  mints.forEach((mint, index) => {
    const data = accountBytes(result.value?.[index])
    if (!data) return
    const meta = readCardMetadata(data)
    if (meta) out.set(mint, meta)
  })
  return out
}

function metadataAddress(mint: string): string {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('metadata'), METADATA.toBuffer(), new PublicKey(mint).toBuffer()],
    METADATA,
  )[0].toBase58()
}

function accountBytes(value: { data?: [string, string] | string } | null | undefined): Uint8Array | null {
  const data = value?.data
  if (!Array.isArray(data) || typeof data[0] !== 'string') return null
  return Buffer.from(data[0], 'base64')
}

async function attachImages(cards: Array<WalletCard & { uri: string }>): Promise<void> {
  let pending = true
  const jobs = cards.map(async (card) => {
    const image = await imageFor(card.uri)
    if (pending && image) card.imageUrl = image
  })
  await Promise.race([
    Promise.all(jobs),
    new Promise((resolve) => setTimeout(resolve, 3000)),
  ])
  pending = false
}

async function imageFor(uri: string): Promise<string | null> {
  const direct = allowedCardImage(uri)
  if (!direct) return null
  if (/\.(png|jpe?g|webp|gif)(\?|$)/i.test(direct)) return direct
  try {
    const res = await fetch(direct, {
      headers: { accept: 'application/json' },
      redirect: 'manual',
      signal: AbortSignal.timeout(2500),
    })
    if (res.status >= 300 && res.status < 400) return null
    if (!res.ok) return null
    const type = res.headers.get('content-type') ?? ''
    if (type.startsWith('image/')) return direct
    const body = (await res.json()) as { image?: unknown }
    return allowedCardImage(body.image)
  } catch {
    return null
  }
}

function cleanName(value: string, mint: string): string {
  const text = value.replace(/[\u0000-\u001f]/g, '').trim().slice(0, 80)
  if (text) return text
  return `${mint.slice(0, 4)}…${mint.slice(-4)}`
}

async function rpc<T>(method: string, params: unknown[]): Promise<T> {
  let res: Response
  try {
    res = await fetch(SOLANA_RPC, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
      signal: AbortSignal.timeout(8000),
    })
  } catch {
    throw new NftMoveError('The wallet could not be read.', 502)
  }
  if (!res.ok) throw new NftMoveError('The wallet could not be read.', 502)
  const body = (await res.json()) as { result?: T; error?: { message?: string } }
  if (body.error) throw new NftMoveError('The wallet could not be read.', 502)
  return body.result as T
}

export { TOKEN_ID, TOKEN_2022_ID }
