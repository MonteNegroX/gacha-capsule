import { confirmPayment, type ApplyResult, type CapsuleOrder } from './order'

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

export function isConfiguredTreasury(address: string | null | undefined): address is string {
  const value = address?.trim().toLowerCase() ?? ''
  return /^0x[a-f0-9]{40}$/.test(value) && value !== ZERO_ADDRESS
}

export type InboundTransfer = {
  hash: string
  chainId: number
  token: string
  from: string
  to: string
  amount: bigint
}

export function acceptPayment(
  order: CapsuleOrder,
  transfer: InboundTransfer,
  treasury: string | null | undefined,
): ApplyResult | { ok: false; order: CapsuleOrder; error: 'TREASURY_UNCONFIGURED' | 'WRONG_RECIPIENT' } {
  if (!isConfiguredTreasury(treasury)) return { ok: false, order, error: 'TREASURY_UNCONFIGURED' }
  if (transfer.to.trim().toLowerCase() !== treasury.trim().toLowerCase()) {
    return { ok: false, order, error: 'WRONG_RECIPIENT' }
  }
  return confirmPayment(order, {
    hash: transfer.hash,
    chainId: transfer.chainId,
    token: transfer.token,
    payer: transfer.from,
    amount: transfer.amount,
  })
}
