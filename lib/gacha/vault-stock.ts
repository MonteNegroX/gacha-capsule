export const VAULT_ADDRESS = '41NaNu6LNhDStmzEqGZHvHsawjtaBTVbR9GZdnQJ3193'
const BOT = VAULT_ADDRESS
const USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
const TOKEN_2022 = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb'
const SOLANA_RPC = 'https://api.mainnet-beta.solana.com'
const MIN_LAMPORTS = BigInt('15000000')

type TokenResponse = {
  result?: {
    value?: Array<{
      account?: { data?: { parsed?: { info?: { mint?: string; tokenAmount?: { amount?: string } } } } }
    }>
  }
}

async function solana<T>(method: string, params: unknown[]): Promise<T> {
  const res = await fetch(SOLANA_RPC, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  })
  if (!res.ok) throw new Error(`Solana RPC HTTP ${res.status}`)
  const body = (await res.json()) as { result?: T; error?: { message?: string } }
  if (body.error) throw new Error(body.error.message || 'Solana RPC error')
  return body.result as T
}

export function lamportsOf(result: unknown): bigint {
  if (typeof result === 'number' && Number.isFinite(result)) return BigInt(Math.trunc(result))
  if (typeof result === 'bigint') return result
  if (result && typeof result === 'object' && 'value' in result) {
    return lamportsOf((result as { value?: unknown }).value)
  }
  return BigInt(0)
}

async function tokenAmount(mint: string): Promise<bigint> {
  const accounts = await solana<TokenResponse['result']>('getTokenAccountsByOwner', [
    BOT,
    { mint },
    { encoding: 'jsonParsed' },
  ])
  const amount = accounts?.value?.[0]?.account?.data?.parsed?.info?.tokenAmount?.amount ?? '0'
  return /^\d+$/.test(amount) ? BigInt(amount) : BigInt(0)
}

export async function vaultUsdcRaw(): Promise<bigint> {
  return tokenAmount(USDC)
}

function amountOf(info: { tokenAmount?: { amount?: string } } | undefined): bigint {
  const amount = info?.tokenAmount?.amount ?? '0'
  return /^\d+$/.test(amount) ? BigInt(amount) : BigInt(0)
}

export async function vaultHoldsMint(mint: string): Promise<boolean> {
  if ((await tokenAmount(mint)) > BigInt(0)) return true
  const accounts = await solana<TokenResponse['result']>('getTokenAccountsByOwner', [
    BOT,
    { programId: TOKEN_2022 },
    { encoding: 'jsonParsed' },
  ])
  for (const item of accounts?.value ?? []) {
    const info = item.account?.data?.parsed?.info
    if (info?.mint === mint && amountOf(info) > BigInt(0)) return true
  }
  return false
}

export async function vaultCanOpen(priceRaw: bigint): Promise<boolean> {
  if ((await vaultUsdcRaw()) < priceRaw) return false
  const lamports = lamportsOf(await solana<unknown>('getBalance', [BOT]))
  return lamports >= MIN_LAMPORTS
}
