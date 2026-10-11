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

export const BUYOUT_FEE_PERCENT = 3

export function buyoutCharge(principal: bigint): { fee: bigint; total: bigint } {
  const fee = (principal * BigInt(BUYOUT_FEE_PERCENT)) / BigInt(100)
  return { fee, total: principal + fee }
}

export function parseUsdg(input: string, cap: bigint): bigint | null {
  const text = input.trim()
  if (!/^\d+(\.\d{1,6})?$/.test(text) || cap <= BigInt(0)) return null
  const [whole, frac = ''] = text.split('.')
  if (whole.length > 12) return null
  const raw = BigInt(whole) * USDG_SCALE + BigInt(frac.padEnd(USDG_DECIMALS, '0'))
  if (raw <= BigInt(0) || raw > cap) return null
  return raw
}

type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
}

function walletErrorCode(err: unknown): number | null {
  if (typeof err === 'object' && err !== null && 'code' in err && typeof err.code === 'number') return err.code
  return null
}

export async function ensureRobinhood(provider: EthereumProvider): Promise<string> {
  try {
    await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: ROBINHOOD_CHAIN_HEX }] })
  } catch (err) {
    if (walletErrorCode(err) !== 4902) throw err
    await provider.request({
      method: 'wallet_addEthereumChain',
      params: [{
        chainId: ROBINHOOD_CHAIN_HEX,
        chainName: 'Robinhood Chain',
        nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
        rpcUrls: [ROBINHOOD_RPC],
        blockExplorerUrls: [ROBINHOOD_EXPLORER],
      }],
    })
  }
  const accounts = await provider.request({ method: 'eth_requestAccounts' })
  const from = Array.isArray(accounts) ? accounts[0] : ''
  if (typeof from !== 'string' || !/^0x[a-fA-F0-9]{40}$/.test(from)) {
    throw new Error('Wallet did not return an account')
  }
  return from
}

export async function sendRobinhoodCall(provider: EthereumProvider, from: string, to: string, data: string): Promise<string> {
  const hash = await provider.request({
    method: 'eth_sendTransaction',
    params: [{ from, to, data, value: '0x0' }],
  })
  if (typeof hash !== 'string' || !/^0x[a-fA-F0-9]{64}$/.test(hash)) {
    throw new Error('Wallet did not return a transaction hash')
  }
  return hash
}

export function encodeUsdgTransfer(to: string, amount: bigint): string {
  if (!/^0x[a-fA-F0-9]{40}$/.test(to)) throw new Error('Treasury address is not configured')
  if (amount <= BigInt(0)) throw new Error('Pack price is not a positive amount')
  const addr = to.toLowerCase().replace(/^0x/, '').padStart(64, '0')
  const value = amount.toString(16).padStart(64, '0')
  return `0xa9059cbb${addr}${value}`
}
