export const ROBINHOOD = {
  chainId: 4663,
  rpcUrl: process.env.ROBINHOOD_RPC_URL?.trim() || 'https://rpc.mainnet.chain.robinhood.com',
  usdg: '0x5fc5360d0400a0fd4f2af552add042d716f1d168',
  decimals: 6,
  confirmations: Number(process.env.GACHA_PAYMENT_CONFIRMATIONS ?? 1),
}

export const HYPERLIQUID = {
  chainId: 999,
  rpcUrl: process.env.HYPERLIQUID_RPC_URL?.trim() || 'https://rpc.hyperliquid.xyz/evm',
  usdc: (process.env.HYPERLIQUID_USDC_ADDRESS?.trim() || '').toLowerCase(),
  decimals: 6,
  confirmations: Number(process.env.GACHA_PAYMENT_CONFIRMATIONS ?? 1),
}


const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'

export type TransferLog = {
  address: string
  topics: string[]
  data: string
}

export type TxReceipt = {
  status: string
  blockNumber?: string
  logs: TransferLog[]
}

export type PaymentCheck = {
  ok: boolean
  /** A finished chain result. Pending receipts and bad hashes stay false so they are not stored. */
  terminal: boolean
  error?: string
  from?: string
  amountRaw?: string
  amountUsd?: number
}

export function treasuryAddress(): string {
  const treasury = process.env.GACHA_TREASURY_ADDRESS?.trim().toLowerCase() ?? ''
  if (!/^0x[a-fA-F0-9]{40}$/.test(treasury) || /^0x0{40}$/.test(treasury)) return ''
  return treasury
}

export function toTokenUnits(amount: number, decimals: number): bigint {
  const [whole, frac = ''] = amount.toFixed(decimals).split('.')
  return BigInt(whole) * 10n ** BigInt(decimals) + BigInt(frac)
}

export function fromTokenUnits(raw: bigint, decimals: number): number {
  const base = 10n ** BigInt(decimals)
  const whole = raw / base
  const frac = raw % base
  return Number(whole) + Number(frac) / Number(base)
}

function topicAddress(address: string): string {
  return '0x' + address.toLowerCase().replace(/^0x/, '').padStart(64, '0')
}

export function readUsdgTransfer(
  receipt: TxReceipt | null,
  token: string,
  treasury: string,
  minRaw: bigint,
): PaymentCheck {
  if (!receipt) return { ok: false, terminal: false, error: 'Transaction receipt not found yet' }
  if (receipt.status !== '0x1') return { ok: false, terminal: true, error: 'Transaction failed' }

  const treasuryTopic = topicAddress(treasury)
  const log = receipt.logs.find((row) => {
    return (
      row.address.toLowerCase() === token.toLowerCase() &&
      row.topics[0]?.toLowerCase() === TRANSFER_TOPIC &&
      row.topics[2]?.toLowerCase() === treasuryTopic
    )
  })
  if (!log) return { ok: false, terminal: true, error: 'No USDG transfer to the treasury in this transaction' }

  const raw = BigInt(log.data === '0x' || log.data === '0x0' ? '0' : log.data)
  const from = '0x' + (log.topics[1] ?? '').slice(-40).toLowerCase()
  if (raw < minRaw) {
    return {
      ok: false,
      terminal: true,
      error: 'USDG amount is below the pack price',
      from,
      amountRaw: raw.toString(),
      amountUsd: fromTokenUnits(raw, ROBINHOOD.decimals),
    }
  }

  return {
    ok: true,
    terminal: true,
    from,
    amountRaw: raw.toString(),
    amountUsd: fromTokenUnits(raw, ROBINHOOD.decimals),
  }
}

async function rpc<T>(rpcUrl: string, method: string, params: unknown[]): Promise<T> {
  const res = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  })
  if (!res.ok) throw new Error(`RPC HTTP ${res.status}`)
  const body = (await res.json()) as { result?: T; error?: { message?: string } }
  if (body.error) throw new Error(body.error.message || 'RPC error')
  return body.result as T
}

export async function verifyRobinhoodPayment(txHash: string, priceUsd: number): Promise<PaymentCheck> {
  const treasury = treasuryAddress()
  if (!/^0x[a-fA-F0-9]{40}$/.test(treasury)) {
    return { ok: false, terminal: false, error: 'Treasury address is not configured' }
  }
  if (!/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
    return { ok: false, terminal: false, error: 'Transaction hash is not a 32-byte hex value' }
  }

  const receipt = await rpc<TxReceipt | null>(ROBINHOOD.rpcUrl, 'eth_getTransactionReceipt', [txHash])
  const check = readUsdgTransfer(receipt, ROBINHOOD.usdg, treasury, toTokenUnits(priceUsd, ROBINHOOD.decimals))
  if (!check.ok || !receipt?.blockNumber) return check

  const latest = await rpc<string>(ROBINHOOD.rpcUrl, 'eth_blockNumber', [])
  const confirmations = Number(BigInt(latest) - BigInt(receipt.blockNumber)) + 1
  if (confirmations < ROBINHOOD.confirmations) {
    return {
      ok: false,
      terminal: false,
      error: `Waiting for confirmations (${confirmations}/${ROBINHOOD.confirmations})`,
    }
  }
  return check
}

export async function verifyHyperliquidPayment(txHash: string, priceUsd: number): Promise<PaymentCheck> {
  const treasury = treasuryAddress()
  if (!/^0x[a-fA-F0-9]{40}$/.test(treasury)) {
    return { ok: false, terminal: false, error: 'Treasury address is not configured' }
  }
  if (!/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
    return { ok: false, terminal: false, error: 'Transaction hash is not a 32-byte hex value' }
  }
  if (!HYPERLIQUID.usdc) {
    return { ok: false, terminal: false, error: 'HYPERLIQUID_USDC_ADDRESS is not configured' }
  }

  const receipt = await rpc<TxReceipt | null>(HYPERLIQUID.rpcUrl, 'eth_getTransactionReceipt', [txHash])
  const check = readUsdgTransfer(receipt, HYPERLIQUID.usdc, treasury, toTokenUnits(priceUsd, HYPERLIQUID.decimals))
  if (!check.ok || !receipt?.blockNumber) return check

  const latest = await rpc<string>(HYPERLIQUID.rpcUrl, 'eth_blockNumber', [])
  const confirmations = Number(BigInt(latest) - BigInt(receipt.blockNumber)) + 1
  if (confirmations < HYPERLIQUID.confirmations) {
    return {
      ok: false,
      terminal: false,
      error: `Waiting for confirmations (${confirmations}/${HYPERLIQUID.confirmations})`,
    }
  }
  return check
}
