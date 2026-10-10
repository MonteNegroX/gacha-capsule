export const ROBINHOOD_CHAIN_ID = 4663
export const ROBINHOOD_CHAIN_HEX = '0x1237'
export const ROBINHOOD_USDG = '0x5fc5360d0400a0fd4f2af552add042d716f1d168'
export const ROBINHOOD_RPC = 'https://rpc.mainnet.chain.robinhood.com'
export const ROBINHOOD_EXPLORER = 'https://robinhoodchain.blockscout.com'

const USDG_DECIMALS = 6

export function usdgAmount(priceUsd: number): bigint {
  if (!Number.isFinite(priceUsd) || priceUsd <= 0) {
    throw new Error('Pack price is not a positive amount')
  }
  const [whole, frac = ''] = priceUsd.toFixed(USDG_DECIMALS).split('.')
  return BigInt(`${whole}${frac.padEnd(USDG_DECIMALS, '0')}`)
}

const USDG_SCALE = BigInt('1000000')

export function parseUsdg(input: string, cap: bigint): bigint | null {
  const text = input.trim()
  if (!/^\d+(\.\d{1,6})?$/.test(text) || cap <= BigInt(0)) return null
  const [whole, frac = ''] = text.split('.')
  if (whole.length > 12) return null
  const raw = BigInt(whole) * USDG_SCALE + BigInt(frac.padEnd(USDG_DECIMALS, '0'))
  if (raw <= BigInt(0) || raw > cap) return null
  return raw
}

export function encodeUsdgTransfer(to: string, amount: bigint): string {
  if (!/^0x[a-fA-F0-9]{40}$/.test(to)) throw new Error('Treasury address is not configured')
  if (amount <= BigInt(0)) throw new Error('Pack price is not a positive amount')
  const addr = to.toLowerCase().replace(/^0x/, '').padStart(64, '0')
  const value = amount.toString(16).padStart(64, '0')
  return `0xa9059cbb${addr}${value}`
}
