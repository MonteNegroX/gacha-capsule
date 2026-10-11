import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  CHOICE_WINDOW_MS,
  beginOpen,
  chooseBuyback,
  chooseDouble,
  confirmPayment,
  createOrder,
  expireChoice,
  failOpen,
  failPayout,
  attachWinLend,
  listLend,
  markManualReview,
  markPaid,
  markRefunded,
  payoutAmount,
  queueDoublePayout,
  queueLend,
  recordUnclaimedBuyback,
  recordBuyback,
  recordOpen,
  refundDue,
  refundUnopened,
  requestRefund,
  retryPayout,
  unclaimedWinAction,
  WIN_UNFUNDED_MS,
  type CapsuleOrder,
} from './order'

const PRICE = 25_000000n
const QUOTE = 11_050000n
const OPENED_AT = 1_700_000_000_000

function pending(): CapsuleOrder {
  const created = createOrder({
    id: 'order-1',
    chainId: 4663,
    token: '0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168',
    payer: '0x1111111111111111111111111111111111111111',
    machineCode: 'pokemon_25',
    memo: 'order-1',
    packPrice: PRICE,
  })
  assert.equal(created.ok, true)
  if (!created.ok) throw new Error('order')
  return created.order
}

function paid(): CapsuleOrder {
  const result = confirmPayment(pending(), {
    hash: '0xabc',
    chainId: 4663,
    token: '0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168',
    payer: '0x1111111111111111111111111111111111111111',
    amount: PRICE,
  })
  assert.equal(result.ok, true)
  if (!result.ok) throw new Error('pay')
  return result.order
}

function opening(): CapsuleOrder {
  const result = beginOpen(paid())
  assert.equal(result.ok, true)
  if (!result.ok) throw new Error('open')
  return result.order
}

function awaiting(): CapsuleOrder {
  const result = recordOpen(opening(), {
    nftAddress: 'nft-1',
    cardName: 'Pikachu',
    rarity: 'common',
    buybackQuote: QUOTE,
    openedAtMs: OPENED_AT,
  })
  assert.equal(result.ok, true)
  if (!result.ok) throw new Error('card')
  return result.order
}

describe('createOrder', () => {
  it('rejects a float price and a blank payer', () => {
    const price = createOrder({
      id: 'order-1',
      chainId: 4663,
      token: 'USDG',
      payer: '0x1111111111111111111111111111111111111111',
      machineCode: 'pokemon_25',
      memo: 'order-1',
      packPrice: 25 as unknown as bigint,
    })
    assert.deepEqual(price, { ok: false, error: 'INVALID_ORDER' })
    const payer = createOrder({
      id: 'order-1',
      chainId: 4663,
      token: 'USDG',
      payer: 'not-an-address',
      machineCode: 'pokemon_25',
      memo: 'order-1',
      packPrice: PRICE,
    })
    assert.equal(payer.ok, false)
  })
})

describe('payment', () => {
  it('confirms a matching transfer once', () => {
    const first = confirmPayment(pending(), {
      hash: '0xABC',
      chainId: 4663,
      token: '0x5FC5360D0400A0FD4F2AF552ADD042D716F1D168',
      payer: '0x1111111111111111111111111111111111111111',
      amount: PRICE,
    })
    assert.equal(first.ok && first.applied, true)
    if (!first.ok) return
    assert.equal(first.order.status, 'PAYMENT_CONFIRMED')
    assert.equal(first.order.paymentHash, '0xabc')
    const again = confirmPayment(first.order, {
      hash: '0xabc',
      chainId: 4663,
      token: '0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168',
      payer: '0x1111111111111111111111111111111111111111',
      amount: PRICE,
    })
    assert.equal(again.ok && again.applied, false)
    if (!again.ok) return
    assert.equal(again.order.status, 'PAYMENT_CONFIRMED')
  })

  it('does not move a later order back when the same hash is replayed', () => {
    const again = confirmPayment(opening(), {
      hash: '0xabc',
      chainId: 4663,
      token: '0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168',
      payer: '0x1111111111111111111111111111111111111111',
      amount: PRICE,
    })
    assert.equal(again.ok && again.applied, false)
    if (!again.ok) return
    assert.equal(again.order.status, 'OPENING')
  })

  it('rejects a second hash and a short amount', () => {
    const other = confirmPayment(paid(), {
      hash: '0xdef',
      chainId: 4663,
      token: '0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168',
      payer: '0x1111111111111111111111111111111111111111',
      amount: PRICE,
    })
    assert.equal(other.ok, false)
    if (other.ok) return
    assert.equal(other.error, 'PAYMENT_REPLAY')
    const short = confirmPayment(pending(), {
      hash: '0xabc',
      chainId: 4663,
      token: '0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168',
      payer: '0x1111111111111111111111111111111111111111',
      amount: PRICE - 1n,
    })
    assert.equal(short.ok, false)
    if (short.ok) return
    assert.equal(short.error, 'PAYMENT_MISMATCH')
  })
})

describe('open', () => {
  it('holds the card without a buyback and ignores the same card twice', () => {
    const card = recordOpen(opening(), {
      nftAddress: 'nft-1',
      cardName: 'Pikachu',
      rarity: 'common',
      buybackQuote: QUOTE,
      openedAtMs: OPENED_AT,
    })
    assert.equal(card.ok && card.applied, true)
    if (!card.ok) return
    assert.equal(card.order.status, 'AWAITING_CHOICE')
    assert.equal(card.order.buybackSignature, null)
    assert.equal(card.order.choiceDeadlineMs, OPENED_AT + CHOICE_WINDOW_MS)
    const again = recordOpen(card.order, {
      nftAddress: 'nft-1',
      cardName: 'Pikachu',
      rarity: 'common',
      buybackQuote: QUOTE,
      openedAtMs: OPENED_AT,
    })
    assert.equal(again.ok && again.applied, false)
  })

  it('does not open before payment or after a card exists', () => {
    const early = beginOpen(pending())
    assert.equal(early.ok, false)
    const second = beginOpen(awaiting())
    assert.equal(second.ok, false)
    if (second.ok) return
    assert.equal(second.error, 'ALREADY_OPENED')
  })

  it('rejects a zero quote', () => {
    const card = recordOpen(opening(), {
      nftAddress: 'nft-1',
      cardName: 'Pikachu',
      rarity: 'common',
      buybackQuote: 0n,
      openedAtMs: OPENED_AT,
    })
    assert.equal(card.ok, false)
    if (card.ok) return
    assert.equal(card.error, 'MISSING_QUOTE')
  })

  it('refunds the pack price when the open fails and does not refund a held card', () => {
    const failed = failOpen(opening(), 'rpc')
    assert.equal(failed.ok && failed.applied, true)
    if (!failed.ok) return
    assert.equal(refundDue(failed.order), PRICE)
    const queued = requestRefund(failed.order)
    assert.equal(queued.ok && queued.applied, true)
    if (!queued.ok) return
    const refunded = markRefunded(queued.order, '0xRefund')
    assert.equal(refunded.ok && refunded.applied, true)
    if (!refunded.ok) return
    assert.equal(refunded.order.status, 'REFUNDED')
    const again = markRefunded(refunded.order, '0xrefund')
    assert.equal(again.ok && again.applied, false)
    const held = failOpen(awaiting(), 'too late')
    assert.equal(held.ok, false)
    const unopened = refundUnopened(paid())
    assert.equal(unopened.ok && unopened.applied, true)
    if (!unopened.ok) return
    assert.equal(refundDue(unopened.order), PRICE)
    const openedAnyway = beginOpen(unopened.order)
    assert.equal(openedAnyway.ok, false)
  })
})

describe('choice', () => {
  it('pays the actual buyback when it differs from the quote', () => {
    const chosen = chooseBuyback(awaiting(), OPENED_AT + 1_000)
    assert.equal(chosen.ok && chosen.applied, true)
    if (!chosen.ok) return
    const recorded = recordBuyback(chosen.order, 'sell-sig', 10_000000n)
    assert.equal(recorded.ok && recorded.applied, true)
    if (!recorded.ok) return
    assert.equal(recorded.order.buybackQuote, QUOTE)
    assert.equal(payoutAmount(recorded.order), 10_000000n)
    const paidOut = markPaid(recorded.order, '0xPay')
    assert.equal(paidOut.ok && paidOut.applied, true)
    if (!paidOut.ok) return
    assert.equal(paidOut.order.status, 'PAID_OUT')
    const replay = markPaid(paidOut.order, '0xpay')
    assert.equal(replay.ok && replay.applied, false)
    const other = markPaid(paidOut.order, '0xother')
    assert.equal(other.ok, false)
  })

  it('pays twice the quote on a recorded win and nothing on a loss', () => {
    const win = chooseDouble(awaiting(), 'WIN', OPENED_AT + 1_000)
    assert.equal(win.ok && win.applied, true)
    if (!win.ok) return
    assert.equal(payoutAmount(win.order), QUOTE * 2n)
    const reroll = chooseDouble(win.order, 'LOSS', OPENED_AT + 1_000)
    assert.equal(reroll.ok, false)
    if (reroll.ok) return
    assert.equal(reroll.error, 'DRAW_ALREADY_SET')
    const same = chooseDouble(win.order, 'WIN', OPENED_AT + 1_000)
    assert.equal(same.ok && same.applied, false)
    const queued = queueDoublePayout(win.order)
    assert.equal(queued.ok && queued.applied, true)
    if (!queued.ok) return
    assert.equal(payoutAmount(queued.order), QUOTE * 2n)
    const listed = attachWinLend(queued.order, 'deal-win')
    assert.equal(listed.ok && listed.applied, true)
    if (!listed.ok) return
    assert.equal(listed.order.status, 'PAYOUT_PENDING')
    assert.equal(listed.order.lendDealId, 'deal-win')
    assert.equal(payoutAmount(listed.order), QUOTE * 2n)
    const again = attachWinLend(listed.order, 'deal-win')
    assert.equal(again.ok && again.applied, false)
    const sold = recordUnclaimedBuyback(listed.order, 'sell-sig', QUOTE)
    assert.equal(sold.ok && sold.applied, true)
    if (!sold.ok) return
    assert.equal(sold.order.status, 'PAYOUT_PENDING')
    assert.equal(payoutAmount(sold.order), QUOTE * 2n)
    assert.equal(unclaimedWinAction({ draw: 'WIN', sold: false, listedAtMs: OPENED_AT, nowMs: OPENED_AT + WIN_UNFUNDED_MS - 1, onchain: 'Funding' }), 'wait')
    assert.equal(unclaimedWinAction({ draw: 'WIN', sold: false, listedAtMs: OPENED_AT, nowMs: OPENED_AT + WIN_UNFUNDED_MS, onchain: 'Funding' }), 'cancel-sell')
    assert.equal(unclaimedWinAction({ draw: 'WIN', sold: false, listedAtMs: OPENED_AT, nowMs: OPENED_AT + WIN_UNFUNDED_MS, onchain: 'Active' }), 'leave')
    assert.equal(unclaimedWinAction({ draw: 'WIN', sold: false, listedAtMs: OPENED_AT, nowMs: OPENED_AT, onchain: 'Cancelled' }), 'sell')
    assert.equal(unclaimedWinAction({ draw: 'LOSS', sold: false, listedAtMs: OPENED_AT, nowMs: OPENED_AT + WIN_UNFUNDED_MS, onchain: 'Funding' }), 'leave')

    const loss = chooseDouble(awaiting(), 'LOSS', OPENED_AT + 1_000)
    assert.equal(loss.ok && loss.applied, true)
    if (!loss.ok) return
    const lossListed = attachWinLend(loss.order, 'deal-loss')
    assert.equal(lossListed.ok, false)
    assert.equal(payoutAmount(loss.order), 0n)
    const payLoss = markPaid(loss.order, '0xno')
    assert.equal(payLoss.ok, false)
    const queuedLend = queueLend(loss.order)
    assert.equal(queuedLend.ok && queuedLend.applied, true)
    if (!queuedLend.ok) return
    const deal = listLend(queuedLend.order, 'deal-1')
    assert.equal(deal.ok && deal.applied, true)
    if (!deal.ok) return
    assert.equal(deal.order.status, 'LEND_LISTED')
    assert.equal(deal.order.lendDealId, 'deal-1')
    const otherDeal = listLend(deal.order, 'deal-2')
    assert.equal(otherDeal.ok, false)
  })

  it('auto-buybacks after 24 hours and does not override a double', () => {
    const early = expireChoice(awaiting(), OPENED_AT + CHOICE_WINDOW_MS - 1)
    assert.equal(early.ok && early.applied, false)
    if (!early.ok) return
    assert.equal(early.order.status, 'AWAITING_CHOICE')
    const lateClick = chooseDouble(awaiting(), 'WIN', OPENED_AT + CHOICE_WINDOW_MS)
    assert.equal(lateClick.ok, false)
    if (lateClick.ok) return
    assert.equal(lateClick.error, 'CHOICE_EXPIRED')
    const expired = expireChoice(awaiting(), OPENED_AT + CHOICE_WINDOW_MS)
    assert.equal(expired.ok && expired.applied, true)
    if (!expired.ok) return
    assert.equal(expired.order.choiceSource, 'TIMEOUT')
    assert.equal(expired.order.status, 'BUYBACK_CONFIRMED')
    const win = chooseDouble(awaiting(), 'WIN', OPENED_AT + 1_000)
    assert.equal(win.ok, true)
    if (!win.ok) return
    const keep = expireChoice(win.order, OPENED_AT + CHOICE_WINDOW_MS + 1)
    assert.equal(keep.ok && keep.applied, false)
    if (!keep.ok) return
    assert.equal(keep.order.status, 'DOUBLE_WON')
  })

  it('retries a failed player transfer without a second payout hash', () => {
    const chosen = chooseBuyback(awaiting(), OPENED_AT + 1_000)
    assert.equal(chosen.ok, true)
    if (!chosen.ok) return
    const recorded = recordBuyback(chosen.order, 'sell-sig', QUOTE)
    assert.equal(recorded.ok, true)
    if (!recorded.ok) return
    const failed = failPayout(recorded.order, 'rpc')
    assert.equal(failed.ok && failed.applied, true)
    if (!failed.ok) return
    assert.equal(payoutAmount(failed.order), QUOTE)
    const retry = retryPayout(failed.order)
    assert.equal(retry.ok && retry.applied, true)
    if (!retry.ok) return
    assert.equal(retry.order.payoutHash, null)
    assert.equal(retry.order.buybackSignature, 'sell-sig')
  })
})

describe('manual review', () => {
  it('leaves a paid order paid', () => {
    const chosen = chooseBuyback(awaiting(), OPENED_AT + 1_000)
    assert.equal(chosen.ok, true)
    if (!chosen.ok) return
    const recorded = recordBuyback(chosen.order, 'sell-sig', QUOTE)
    assert.equal(recorded.ok, true)
    if (!recorded.ok) return
    const paidOut = markPaid(recorded.order, '0xpay')
    assert.equal(paidOut.ok, true)
    if (!paidOut.ok) return
    const review = markManualReview(paidOut.order, 'stuck')
    assert.equal(review.ok, false)
    const stuck = markManualReview(chosen.order, 'sell failed')
    assert.equal(stuck.ok && stuck.applied, true)
    if (!stuck.ok) return
    assert.equal(stuck.order.status, 'MANUAL_REVIEW')
  })
})
