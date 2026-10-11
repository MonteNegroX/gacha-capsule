import { applyDouble } from './choice'
import { openListing, type CreateDealInput, type LendDeal } from './lend'
import {
  beginOpen,
  chooseBuyback,
  expireChoice,
  failOpen,
  listLend,
  markManualReview,
  queueLend,
  recordOpen,
  refundUnopened,
  requestRefund,
  type ApplyResult,
  type CapsuleOrder,
} from './order'
import { acceptPayment, type InboundTransfer } from './payment'
import { disabledHoldOpen, type HoldOpen } from './ports'
import { planOpen } from './reserve'

export type EngineAction = 'WAIT' | 'REFUND' | 'OPENED' | 'OPEN_FAILED' | 'HOLD' | 'BLOCKED' | 'IN_PROGRESS'

export type EngineStep = { action: EngineAction; order: CapsuleOrder }

export function registerPayment(
  orders: readonly CapsuleOrder[],
  order: CapsuleOrder,
  transfer: InboundTransfer,
  treasury: string | null | undefined,
): ApplyResult | { ok: false; order: CapsuleOrder; error: 'TREASURY_UNCONFIGURED' | 'WRONG_RECIPIENT' } {
  const hash = transfer.hash.trim().toLowerCase()
  const owner = orders.find((item) => item.paymentHash === hash)
  if (owner && owner.id !== order.id) return { ok: false, order, error: 'PAYMENT_REPLAY' }
  return acceptPayment(order, transfer, treasury)
}

export function advanceOpen(
  order: CapsuleOrder,
  others: readonly CapsuleOrder[],
  treasuryBalance: bigint,
  allowOpen = false,
  holdOpen: HoldOpen = disabledHoldOpen,
): EngineStep {
  if (order.status === 'AWAITING_CHOICE') return { action: 'OPENED', order }
  if (order.status === 'OPENING') return { action: 'IN_PROGRESS', order }
  if (order.status !== 'PAYMENT_CONFIRMED') return { action: 'HOLD', order }

  const plan = planOpen(order, others, treasuryBalance)
  if (plan.action === 'REFUND') {
    const refunded = refundUnopened(order)
    return { action: 'REFUND', order: refunded.ok ? refunded.order : order }
  }
  if (plan.action === 'BLOCKED') return { action: 'BLOCKED', order }
  if (plan.action !== 'OPEN') return { action: 'HOLD', order }
  if (!allowOpen) return { action: 'WAIT', order }

  // The port runs before OPENING is persisted. A Collector Crypt opener must not be passed in:
  // a crash after a spent pack and before this return value is saved would ask for a second pack.
  const attempt = holdOpen(order)
  if (!attempt.ok && attempt.reason === 'DISABLED') return { action: 'WAIT', order }

  const begun = beginOpen(order)
  if (!begun.ok) return { action: 'HOLD', order }
  if (!attempt.ok) {
    const failed = failOpen(begun.order, attempt.message)
    if (!failed.ok) return { action: 'OPEN_FAILED', order: begun.order }
    const refund = requestRefund(failed.order)
    return { action: 'OPEN_FAILED', order: refund.ok ? refund.order : failed.order }
  }

  const recorded = recordOpen(begun.order, attempt.card)
  if (recorded.ok) return { action: 'OPENED', order: recorded.order }
  const review = markManualReview(begun.order, recorded.error)
  return { action: 'IN_PROGRESS', order: review.ok ? review.order : begun.order }
}

export function settleChoice(
  order: CapsuleOrder,
  action: { type: 'BUYBACK' } | { type: 'DOUBLE'; roll: number } | { type: 'EXPIRE' },
  nowMs: number,
): ApplyResult | { ok: false; order: CapsuleOrder; error: 'INVALID_ROLL' } {
  if (action.type === 'BUYBACK') return chooseBuyback(order, nowMs)
  if (action.type === 'EXPIRE') return expireChoice(order, nowMs)
  return applyDouble(order, action.roll, nowMs)
}

export function listLostCard(
  order: CapsuleOrder,
  deals: readonly LendDeal[],
  input: CreateDealInput,
): { ok: true; order: CapsuleOrder; deal: LendDeal; applied: boolean } | { ok: false; order: CapsuleOrder; error: 'ILLEGAL_TRANSITION' | 'INVALID_DEAL' | 'DUPLICATE_DEAL' | 'DEAL_CONFLICT' } {
  if (order.status !== 'DOUBLE_LOST' && order.status !== 'LEND_QUEUED' && order.status !== 'LEND_LISTED') {
    return { ok: false, order, error: 'ILLEGAL_TRANSITION' }
  }
  const listing = openListing(deals, input)
  if (!listing.ok) return { ok: false, order, error: listing.error }
  if (order.status === 'LEND_LISTED') {
    if (order.lendDealId === listing.deal.id) return { ok: true, order, deal: listing.deal, applied: false }
    return { ok: false, order, error: 'DEAL_CONFLICT' }
  }
  const queued = order.status === 'LEND_QUEUED' ? { ok: true as const, order, applied: false } : queueLend(order)
  if (!queued.ok) return { ok: false, order, error: 'ILLEGAL_TRANSITION' }
  const listed = listLend(queued.order, listing.deal.id)
  if (!listed.ok) return { ok: false, order, error: listed.error === 'DEAL_CONFLICT' ? 'DEAL_CONFLICT' : 'ILLEGAL_TRANSITION' }
  return { ok: true, order: listed.order, deal: listing.deal, applied: listing.applied || listed.applied }
}
