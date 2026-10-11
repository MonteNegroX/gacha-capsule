export const CHOICE_WINDOW_MS = 24 * 60 * 60 * 1000
export const WIN_UNFUNDED_MS = 2 * 24 * 60 * 60 * 1000

const ZERO = BigInt(0)
const TWO = BigInt(2)

export const ORDER_STATUSES = [
  'PENDING_PAYMENT',
  'PAYMENT_CONFIRMED',
  'OPENING',
  'AWAITING_CHOICE',
  'BUYBACK_CONFIRMED',
  'DOUBLE_WON',
  'DOUBLE_LOST',
  'PAYOUT_PENDING',
  'PAID_OUT',
  'LEND_QUEUED',
  'LEND_LISTED',
  'OPENING_FAILED',
  'REFUND_PENDING',
  'REFUNDED',
  'PAYOUT_FAILED',
  'MANUAL_REVIEW',
] as const

export type OrderStatus = (typeof ORDER_STATUSES)[number]
export type Choice = 'BUYBACK' | 'DOUBLE'
export type ChoiceSource = 'PLAYER' | 'TIMEOUT'
export type DrawResult = 'WIN' | 'LOSS'

export type OrderError =
  | 'INVALID_ORDER'
  | 'ILLEGAL_TRANSITION'
  | 'ALREADY_OPENED'
  | 'PAYMENT_REPLAY'
  | 'PAYMENT_MISMATCH'
  | 'CHOICE_ALREADY_MADE'
  | 'CHOICE_EXPIRED'
  | 'DRAW_ALREADY_SET'
  | 'MISSING_QUOTE'
  | 'MISSING_NFT'
  | 'MISSING_DEADLINE'
  | 'SIGNATURE_CONFLICT'
  | 'PAYOUT_CONFLICT'
  | 'REFUND_CONFLICT'
  | 'DEAL_CONFLICT'
  | 'NOTHING_TO_PAY'

export type CapsuleOrder = {
  id: string
  status: OrderStatus
  chainId: number
  token: string
  payer: string
  machineCode: string
  memo: string
  packPrice: bigint
  paymentHash: string | null
  nftAddress: string | null
  cardName: string | null
  rarity: string | null
  buybackQuote: bigint | null
  actualRefund: bigint | null
  choice: Choice | null
  choiceSource: ChoiceSource | null
  draw: DrawResult | null
  buybackSignature: string | null
  payoutHash: string | null
  refundHash: string | null
  lendDealId: string | null
  openedAtMs: number | null
  choiceDeadlineMs: number | null
  error: string | null
}

export type ApplyResult =
  | { ok: true; order: CapsuleOrder; applied: boolean }
  | { ok: false; order: CapsuleOrder; error: OrderError }

export type CreateOrderInput = {
  id: string
  chainId: number
  token: string
  payer: string
  machineCode: string
  memo: string
  packPrice: bigint
}

const MANUAL_FROM: ReadonlySet<OrderStatus> = new Set([
  'OPENING',
  'AWAITING_CHOICE',
  'BUYBACK_CONFIRMED',
  'DOUBLE_WON',
  'DOUBLE_LOST',
  'PAYOUT_PENDING',
  'PAYOUT_FAILED',
  'LEND_QUEUED',
  'OPENING_FAILED',
])

function fail(order: CapsuleOrder, error: OrderError): ApplyResult {
  return { ok: false, order, error }
}

function done(order: CapsuleOrder, applied: boolean): ApplyResult {
  return { ok: true, order, applied }
}

function next(order: CapsuleOrder, patch: Partial<CapsuleOrder>): ApplyResult {
  return done({ ...order, ...patch }, true)
}

function text(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function normHash(value: string): string {
  return value.trim().toLowerCase()
}

function normToken(value: string): string {
  const trimmed = value.trim()
  return trimmed.startsWith('0x') || trimmed.startsWith('0X') ? trimmed.toLowerCase() : trimmed
}

function sameText(left: string, right: string): boolean {
  return left.trim().toLowerCase() === right.trim().toLowerCase()
}

export function createOrder(input: CreateOrderInput): { ok: true; order: CapsuleOrder } | { ok: false; error: 'INVALID_ORDER' } {
  const id = text(input.id)
  const token = text(input.token)
  const payer = text(input.payer)
  const machineCode = text(input.machineCode)
  const memo = text(input.memo)
  if (!id || !token || !payer || !machineCode || !memo) return { ok: false, error: 'INVALID_ORDER' }
  if (!/^0x[a-fA-F0-9]{40}$/.test(payer)) return { ok: false, error: 'INVALID_ORDER' }
  if (!/^[a-z0-9_]+$/.test(machineCode)) return { ok: false, error: 'INVALID_ORDER' }
  if (!Number.isInteger(input.chainId) || input.chainId <= 0) return { ok: false, error: 'INVALID_ORDER' }
  if (typeof input.packPrice !== 'bigint' || input.packPrice <= ZERO) return { ok: false, error: 'INVALID_ORDER' }

  return {
    ok: true,
    order: {
      id,
      status: 'PENDING_PAYMENT',
      chainId: input.chainId,
      token: normToken(token),
      payer: payer.toLowerCase(),
      machineCode,
      memo,
      packPrice: input.packPrice,
      paymentHash: null,
      nftAddress: null,
      cardName: null,
      rarity: null,
      buybackQuote: null,
      actualRefund: null,
      choice: null,
      choiceSource: null,
      draw: null,
      buybackSignature: null,
      payoutHash: null,
      refundHash: null,
      lendDealId: null,
      openedAtMs: null,
      choiceDeadlineMs: null,
      error: null,
    },
  }
}

export type PaymentFact = {
  hash: string
  chainId: number
  token: string
  payer: string
  amount: bigint
}

export function confirmPayment(order: CapsuleOrder, payment: PaymentFact): ApplyResult {
  const hash = text(payment.hash)
  const payer = text(payment.payer)
  const token = text(payment.token)
  if (!hash || !payer || !token || typeof payment.amount !== 'bigint') return fail(order, 'PAYMENT_MISMATCH')
  const matches =
    payment.chainId === order.chainId &&
    sameText(token, order.token) &&
    sameText(payer, order.payer) &&
    payment.amount === order.packPrice
  if (!matches) return fail(order, 'PAYMENT_MISMATCH')

  const normalized = normHash(hash)
  if (order.paymentHash) {
    if (order.paymentHash !== normalized) return fail(order, 'PAYMENT_REPLAY')
    return done(order, false)
  }
  if (order.status !== 'PENDING_PAYMENT') return fail(order, 'ILLEGAL_TRANSITION')
  return next(order, { status: 'PAYMENT_CONFIRMED', paymentHash: normalized, error: null })
}

export function beginOpen(order: CapsuleOrder): ApplyResult {
  if (order.status === 'OPENING') return done(order, false)
  if (order.status !== 'PAYMENT_CONFIRMED') {
    if (order.status === 'PENDING_PAYMENT') return fail(order, 'ILLEGAL_TRANSITION')
    return fail(order, 'ALREADY_OPENED')
  }
  return next(order, { status: 'OPENING', error: null })
}

export type OpenedCard = {
  nftAddress: string
  cardName: string
  rarity: string
  buybackQuote: bigint
  openedAtMs: number
}

export function recordOpen(order: CapsuleOrder, card: OpenedCard): ApplyResult {
  const nftAddress = text(card.nftAddress)
  const cardName = text(card.cardName)
  const rarity = text(card.rarity)
  if (!nftAddress || !cardName || !rarity) return fail(order, 'MISSING_NFT')
  if (typeof card.buybackQuote !== 'bigint' || card.buybackQuote <= ZERO) return fail(order, 'MISSING_QUOTE')
  if (!Number.isFinite(card.openedAtMs)) return fail(order, 'MISSING_DEADLINE')

  if (order.status === 'AWAITING_CHOICE') {
    if (order.nftAddress === nftAddress && order.buybackQuote === card.buybackQuote) return done(order, false)
    return fail(order, 'ALREADY_OPENED')
  }
  if (order.status !== 'OPENING') return fail(order, 'ILLEGAL_TRANSITION')

  return next(order, {
    status: 'AWAITING_CHOICE',
    nftAddress,
    cardName,
    rarity,
    buybackQuote: card.buybackQuote,
    openedAtMs: card.openedAtMs,
    choiceDeadlineMs: card.openedAtMs + CHOICE_WINDOW_MS,
    error: null,
  })
}

function choiceStillOpen(order: CapsuleOrder, nowMs: number): ApplyResult | null {
  if (order.status !== 'AWAITING_CHOICE' || order.choice) return null
  if (order.choiceDeadlineMs == null) return fail(order, 'MISSING_DEADLINE')
  if (!Number.isFinite(nowMs)) return fail(order, 'MISSING_DEADLINE')
  if (nowMs >= order.choiceDeadlineMs) return fail(order, 'CHOICE_EXPIRED')
  return null
}

export function chooseBuyback(order: CapsuleOrder, nowMs: number): ApplyResult {
  if (order.choice === 'BUYBACK' && (order.status === 'BUYBACK_CONFIRMED' || order.status === 'PAYOUT_PENDING' || order.status === 'PAID_OUT' || order.status === 'PAYOUT_FAILED')) {
    return done(order, false)
  }
  if (order.choice === 'DOUBLE') return fail(order, 'CHOICE_ALREADY_MADE')
  const blocked = choiceStillOpen(order, nowMs)
  if (blocked) return blocked
  if (order.status !== 'AWAITING_CHOICE') return fail(order, 'ILLEGAL_TRANSITION')
  return next(order, { status: 'BUYBACK_CONFIRMED', choice: 'BUYBACK', choiceSource: 'PLAYER', error: null })
}

export function chooseDouble(order: CapsuleOrder, draw: DrawResult, nowMs: number): ApplyResult {
  if (draw !== 'WIN' && draw !== 'LOSS') return fail(order, 'DRAW_ALREADY_SET')
  if (order.choice === 'DOUBLE' && order.draw) {
    if (order.draw !== draw) return fail(order, 'DRAW_ALREADY_SET')
    return done(order, false)
  }
  if (order.choice === 'BUYBACK') return fail(order, 'CHOICE_ALREADY_MADE')
  const blocked = choiceStillOpen(order, nowMs)
  if (blocked) return blocked
  if (order.status !== 'AWAITING_CHOICE') return fail(order, 'ILLEGAL_TRANSITION')
  return next(order, {
    status: draw === 'WIN' ? 'DOUBLE_WON' : 'DOUBLE_LOST',
    choice: 'DOUBLE',
    choiceSource: 'PLAYER',
    draw,
    error: null,
  })
}

export function expireChoice(order: CapsuleOrder, nowMs: number): ApplyResult {
  if (order.choice) return done(order, false)
  if (order.status !== 'AWAITING_CHOICE') return fail(order, 'ILLEGAL_TRANSITION')
  if (order.choiceDeadlineMs == null || !Number.isFinite(nowMs)) return fail(order, 'MISSING_DEADLINE')
  if (nowMs < order.choiceDeadlineMs) return done(order, false)
  return next(order, { status: 'BUYBACK_CONFIRMED', choice: 'BUYBACK', choiceSource: 'TIMEOUT', error: null })
}

export function recordBuyback(order: CapsuleOrder, signature: string, actualRefund: bigint): ApplyResult {
  const signed = text(signature)
  if (!signed || typeof actualRefund !== 'bigint' || actualRefund < ZERO) return fail(order, 'SIGNATURE_CONFLICT')
  const past = order.status === 'PAYOUT_PENDING' || order.status === 'PAID_OUT' || order.status === 'PAYOUT_FAILED'
  if (past && order.choice === 'BUYBACK') {
    if (order.buybackSignature === signed && order.actualRefund === actualRefund) return done(order, false)
    return fail(order, 'SIGNATURE_CONFLICT')
  }
  if (order.status !== 'BUYBACK_CONFIRMED') return fail(order, 'ILLEGAL_TRANSITION')
  return next(order, { status: 'PAYOUT_PENDING', buybackSignature: signed, actualRefund, error: null })
}

export function queueDoublePayout(order: CapsuleOrder): ApplyResult {
  if (order.status === 'PAYOUT_PENDING' || order.status === 'PAID_OUT' || order.status === 'PAYOUT_FAILED') {
    if (order.choice === 'DOUBLE' && order.draw === 'WIN') return done(order, false)
    return fail(order, 'ILLEGAL_TRANSITION')
  }
  if (order.status !== 'DOUBLE_WON') return fail(order, 'ILLEGAL_TRANSITION')
  if (order.buybackQuote == null || order.buybackQuote <= ZERO) return fail(order, 'MISSING_QUOTE')
  return next(order, { status: 'PAYOUT_PENDING', error: null })
}

export function markPaid(order: CapsuleOrder, payoutHash: string): ApplyResult {
  const hash = text(payoutHash)
  if (!hash) return fail(order, 'PAYOUT_CONFLICT')
  const normalized = normHash(hash)
  if (order.status === 'PAID_OUT') {
    if (order.payoutHash === normalized) return done(order, false)
    return fail(order, 'PAYOUT_CONFLICT')
  }
  if (order.status !== 'PAYOUT_PENDING') return fail(order, 'ILLEGAL_TRANSITION')
  if (payoutAmount(order) == null) return fail(order, 'NOTHING_TO_PAY')
  return next(order, { status: 'PAID_OUT', payoutHash: normalized, error: null })
}

export function failPayout(order: CapsuleOrder, reason: string): ApplyResult {
  const message = text(reason)
  if (!message) return fail(order, 'ILLEGAL_TRANSITION')
  if (order.status === 'PAYOUT_FAILED') return done(order, false)
  if (order.status !== 'PAYOUT_PENDING') return fail(order, 'ILLEGAL_TRANSITION')
  return next(order, { status: 'PAYOUT_FAILED', error: message })
}

export function retryPayout(order: CapsuleOrder): ApplyResult {
  if (order.status === 'PAYOUT_PENDING') return done(order, false)
  if (order.status !== 'PAYOUT_FAILED') return fail(order, 'ILLEGAL_TRANSITION')
  return next(order, { status: 'PAYOUT_PENDING', error: null })
}

export function failOpen(order: CapsuleOrder, reason: string): ApplyResult {
  const message = text(reason)
  if (!message) return fail(order, 'ILLEGAL_TRANSITION')
  if (order.status === 'OPENING_FAILED') return done(order, false)
  if (order.status !== 'OPENING') return fail(order, 'ILLEGAL_TRANSITION')
  return next(order, { status: 'OPENING_FAILED', error: message })
}

export function requestRefund(order: CapsuleOrder): ApplyResult {
  if (order.status === 'REFUND_PENDING' || order.status === 'REFUNDED') return done(order, false)
  if (order.status !== 'OPENING_FAILED') return fail(order, 'ILLEGAL_TRANSITION')
  return next(order, { status: 'REFUND_PENDING', error: null })
}

export function refundUnopened(order: CapsuleOrder): ApplyResult {
  if (order.status === 'REFUND_PENDING' || order.status === 'REFUNDED') return done(order, false)
  if (order.status !== 'PAYMENT_CONFIRMED') return fail(order, 'ILLEGAL_TRANSITION')
  return next(order, { status: 'REFUND_PENDING', error: null })
}

export function markRefunded(order: CapsuleOrder, refundHash: string): ApplyResult {
  const hash = text(refundHash)
  if (!hash) return fail(order, 'REFUND_CONFLICT')
  const normalized = normHash(hash)
  if (order.status === 'REFUNDED') {
    if (order.refundHash === normalized) return done(order, false)
    return fail(order, 'REFUND_CONFLICT')
  }
  if (order.status !== 'REFUND_PENDING') return fail(order, 'ILLEGAL_TRANSITION')
  return next(order, { status: 'REFUNDED', refundHash: normalized, error: null })
}

export function queueLend(order: CapsuleOrder): ApplyResult {
  if (order.status === 'LEND_QUEUED' || order.status === 'LEND_LISTED') return done(order, false)
  if (order.status !== 'DOUBLE_LOST') return fail(order, 'ILLEGAL_TRANSITION')
  return next(order, { status: 'LEND_QUEUED', error: null })
}

const WIN_PAYOUT: ReadonlySet<OrderStatus> = new Set(['DOUBLE_WON', 'PAYOUT_PENDING', 'PAID_OUT', 'PAYOUT_FAILED'])

export function attachWinLend(order: CapsuleOrder, dealId: string): ApplyResult {
  const id = text(dealId)
  if (!id) return fail(order, 'DEAL_CONFLICT')
  if (order.choice !== 'DOUBLE' || order.draw !== 'WIN' || !WIN_PAYOUT.has(order.status)) return fail(order, 'ILLEGAL_TRANSITION')
  if (order.lendDealId) {
    if (order.lendDealId === id) return done(order, false)
    return fail(order, 'DEAL_CONFLICT')
  }
  return next(order, { lendDealId: id, error: null })
}

export function recordUnclaimedBuyback(order: CapsuleOrder, signature: string, actualRefund: bigint): ApplyResult {
  const signed = text(signature)
  if (!signed || typeof actualRefund !== 'bigint' || actualRefund < ZERO) return fail(order, 'SIGNATURE_CONFLICT')
  if (order.choice !== 'DOUBLE' || order.draw !== 'WIN' || !WIN_PAYOUT.has(order.status)) return fail(order, 'ILLEGAL_TRANSITION')
  if (order.buybackSignature) {
    if (order.buybackSignature === signed && order.actualRefund === actualRefund) return done(order, false)
    return fail(order, 'SIGNATURE_CONFLICT')
  }
  return next(order, { buybackSignature: signed, actualRefund, error: null })
}

export type ChainDealStatus = 'Empty' | 'Funding' | 'Active' | 'Repaid' | 'Defaulted' | 'Cancelled'

export function unclaimedWinAction(input: {
  draw: DrawResult | null
  sold: boolean
  listedAtMs: number | null
  nowMs: number
  onchain: ChainDealStatus | null
}): 'wait' | 'cancel-sell' | 'sell' | 'leave' {
  if (input.draw !== 'WIN' || input.sold) return 'leave'
  if (input.onchain === 'Cancelled') return 'sell'
  if (input.onchain !== 'Funding') return 'leave'
  if (input.listedAtMs == null || !Number.isFinite(input.listedAtMs) || !Number.isFinite(input.nowMs)) return 'wait'
  if (input.nowMs < input.listedAtMs + WIN_UNFUNDED_MS) return 'wait'
  return 'cancel-sell'
}

export function listLend(order: CapsuleOrder, dealId: string): ApplyResult {
  const id = text(dealId)
  if (!id) return fail(order, 'DEAL_CONFLICT')
  if (order.status === 'LEND_LISTED') {
    if (order.lendDealId === id) return done(order, false)
    return fail(order, 'DEAL_CONFLICT')
  }
  if (order.status !== 'LEND_QUEUED') return fail(order, 'ILLEGAL_TRANSITION')
  return next(order, { status: 'LEND_LISTED', lendDealId: id, error: null })
}

export function markManualReview(order: CapsuleOrder, reason: string): ApplyResult {
  const message = text(reason)
  if (!message) return fail(order, 'ILLEGAL_TRANSITION')
  if (order.status === 'MANUAL_REVIEW') return done(order, false)
  if (!MANUAL_FROM.has(order.status)) return fail(order, 'ILLEGAL_TRANSITION')
  return next(order, { status: 'MANUAL_REVIEW', error: message })
}

export function payoutAmount(order: CapsuleOrder): bigint | null {
  if (order.status === 'DOUBLE_LOST' || order.status === 'LEND_QUEUED' || order.status === 'LEND_LISTED') return ZERO
  const owed = order.status === 'PAYOUT_PENDING' || order.status === 'PAID_OUT' || order.status === 'PAYOUT_FAILED' || order.status === 'DOUBLE_WON'
  if (!owed) return null
  if (order.choice === 'DOUBLE' && order.draw === 'WIN') {
    if (order.buybackQuote == null) return null
    return order.buybackQuote * TWO
  }
  if (order.choice === 'BUYBACK' && order.status !== 'DOUBLE_WON') {
    return order.actualRefund
  }
  return null
}

export function refundDue(order: CapsuleOrder): bigint | null {
  if (order.status === 'OPENING_FAILED' || order.status === 'REFUND_PENDING' || order.status === 'REFUNDED') return order.packPrice
  return null
}
