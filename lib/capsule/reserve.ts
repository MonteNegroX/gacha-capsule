import { payoutAmount, refundDue, type CapsuleOrder } from './order'

const ZERO = BigInt(0)
const TWO = BigInt(2)

export type ReserveIssue = { orderId: string; reason: 'UNKNOWN_OBLIGATION' }

export function obligation(order: CapsuleOrder): { ok: true; amount: bigint } | { ok: false; reason: 'UNKNOWN_OBLIGATION' } {
  if (order.status === 'MANUAL_REVIEW') return { ok: false, reason: 'UNKNOWN_OBLIGATION' }
  if (order.status === 'AWAITING_CHOICE') {
    if (order.buybackQuote == null || order.buybackQuote <= ZERO) return { ok: false, reason: 'UNKNOWN_OBLIGATION' }
    return { ok: true, amount: order.buybackQuote * TWO }
  }
  if (order.status === 'BUYBACK_CONFIRMED') {
    if (order.actualRefund != null) return { ok: true, amount: order.actualRefund }
    if (order.buybackQuote == null || order.buybackQuote <= ZERO) return { ok: false, reason: 'UNKNOWN_OBLIGATION' }
    return { ok: true, amount: order.buybackQuote }
  }
  if (order.status === 'OPENING' || order.status === 'PAYMENT_CONFIRMED') return { ok: true, amount: order.packPrice }
  if (order.status === 'OPENING_FAILED' || order.status === 'REFUND_PENDING') {
    const due = refundDue(order)
    if (due == null) return { ok: false, reason: 'UNKNOWN_OBLIGATION' }
    return { ok: true, amount: due }
  }
  if (order.status === 'DOUBLE_WON' || order.status === 'PAYOUT_PENDING' || order.status === 'PAYOUT_FAILED') {
    const owed = payoutAmount(order)
    if (owed == null) return { ok: false, reason: 'UNKNOWN_OBLIGATION' }
    return { ok: true, amount: owed }
  }
  return { ok: true, amount: ZERO }
}

export function reserved(orders: readonly CapsuleOrder[]): { ok: true; amount: bigint } | { ok: false; issues: ReserveIssue[] } {
  let amount = ZERO
  const issues: ReserveIssue[] = []
  for (const order of orders) {
    const row = obligation(order)
    if (!row.ok) issues.push({ orderId: order.id, reason: row.reason })
    else amount += row.amount
  }
  if (issues.length > 0) return { ok: false, issues }
  return { ok: true, amount }
}

export type OpenPlan =
  | { action: 'OPEN' }
  | { action: 'REFUND' }
  | { action: 'HOLD' }
  | { action: 'BLOCKED'; issues: ReserveIssue[] }

export function planOpen(order: CapsuleOrder, others: readonly CapsuleOrder[], treasuryBalance: bigint): OpenPlan {
  if (order.status !== 'PAYMENT_CONFIRMED') return { action: 'HOLD' }
  if (typeof treasuryBalance !== 'bigint' || treasuryBalance < ZERO) {
    return { action: 'BLOCKED', issues: [{ orderId: order.id, reason: 'UNKNOWN_OBLIGATION' }] }
  }
  const held = reserved(others.filter((item) => item.id !== order.id))
  if (!held.ok) return { action: 'BLOCKED', issues: held.issues }
  if (treasuryBalance < held.amount) return { action: 'REFUND' }
  return { action: 'OPEN' }
}

export function playerResult(order: CapsuleOrder, laterCardProceeds: bigint | null = null): bigint | null {
  if (order.status === 'PAID_OUT' && order.choice === 'BUYBACK' && order.actualRefund != null) {
    return order.packPrice - order.actualRefund
  }
  if (order.choice === 'DOUBLE' && order.draw === 'WIN' && order.buybackQuote != null && (order.status === 'PAID_OUT' || order.status === 'DOUBLE_WON' || order.status === 'PAYOUT_PENDING' || order.status === 'PAYOUT_FAILED')) {
    if (laterCardProceeds == null) return null
    if (laterCardProceeds < ZERO) return null
    return order.packPrice - order.buybackQuote * TWO + laterCardProceeds
  }
  if (order.status === 'DOUBLE_LOST' || order.status === 'LEND_QUEUED' || order.status === 'LEND_LISTED') {
    return order.packPrice
  }
  return null
}
