export const LEND_ADDRESS = '0xa7F89DE1FE71Aa4D37A9179231787b2aC1a4DcFc'
export const FUNDER_BPS = 300
export const PROTOCOL_BPS = 100
export const LEND_TERM_SECONDS = 7 * 24 * 60 * 60

const FUND = 'bf14c119'
const REPAY = '563dd613'
const MARK_DEFAULT = '4b689a60'
const WITHDRAW = '10d3f898'
const DEAL = 'e067eb71'
const REPAY_DUE = 'ba5d806a'
const APPROVE = '095ea7b3'
const ALLOWANCE = 'dd62ed3e'

function pad(value: string): string {
  return value.toLowerCase().replace(/^0x/, '').padStart(64, '0')
}

function wordCall(selector: string, id: string): string {
  if (!/^0x[a-fA-F0-9]{64}$/.test(id)) throw new Error('Bad deal id')
  return `0x${selector}${pad(id)}`
}

export function encodeFund(dealId: string): string {
  return wordCall(FUND, dealId)
}

export function encodeRepay(dealId: string): string {
  return wordCall(REPAY, dealId)
}

export function encodeMarkDefault(dealId: string): string {
  return wordCall(MARK_DEFAULT, dealId)
}

export function encodeWithdrawPrincipal(dealId: string): string {
  return wordCall(WITHDRAW, dealId)
}

export function encodeDeal(dealId: string): string {
  return wordCall(DEAL, dealId)
}

export function encodeRepayDue(dealId: string): string {
  return wordCall(REPAY_DUE, dealId)
}

export function encodeApprove(spender: string, amount: bigint): string {
  if (!/^0x[a-fA-F0-9]{40}$/.test(spender)) throw new Error('Bad spender')
  if (amount < BigInt(0)) throw new Error('Bad amount')
  return `0x${APPROVE}${pad(spender)}${pad(amount.toString(16))}`
}

export function encodeAllowance(owner: string, spender: string): string {
  if (!/^0x[a-fA-F0-9]{40}$/.test(owner) || !/^0x[a-fA-F0-9]{40}$/.test(spender)) {
    throw new Error('Bad allowance address')
  }
  return `0x${ALLOWANCE}${pad(owner)}${pad(spender)}`
}

export type OnchainDeal = {
  owner: string
  funder: string
  principal: bigint
  funderFee: bigint
  protocolFee: bigint
  held: bigint
  fundedAt: bigint
  expiresAt: bigint
  term: bigint
  status: number
}

export function decodeDeal(data: string): OnchainDeal | null {
  if (!/^0x[a-fA-F0-9]+$/.test(data) || data.length < 2 + 64 * 10) return null
  const word = (index: number) => BigInt(`0x${data.slice(2 + index * 64, 2 + (index + 1) * 64)}`)
  const address = (index: number) => `0x${data.slice(2 + index * 64 + 24, 2 + (index + 1) * 64)}`
  return {
    owner: address(0),
    funder: address(1),
    principal: word(2),
    funderFee: word(3),
    protocolFee: word(4),
    held: word(5),
    fundedAt: word(6),
    expiresAt: word(7),
    term: word(8),
    status: Number(word(9)),
  }
}

export function decodeUint(data: string): bigint | null {
  if (!/^0x[a-fA-F0-9]{64}$/.test(data)) return null
  return BigInt(data)
}
