import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  beginOpen,
  chooseBuyback,
  chooseDouble,
  confirmPayment,
  createOrder,
  failOpen,
  markManualReview,
  recordBuyback,
  recordOpen,
  type CapsuleOrder,
} from './order'
import { obligation, planOpen, playerResult, reserved } from './reserve'

const PRICE = 25_000000n
const QUOTE = 10_000000n

function order(id: string): CapsuleOrder {
  const created = createOrder({
    id,
    chainId: 4663,
    token: 'USDG',
    payer: '0x1111111111111111111111111111111111111111',
    machineCode: 'pokemon_25',
    memo: id,
    packPrice: PRICE,
  })
  assert.equal(created.ok, true)
  if (!created.ok) throw new Error('order')
  return created.order
}

function paid(id: string): CapsuleOrder {
  const result = confirmPayment(order(id), {
    hash: `0x${id}`,
    chainId: 4663,
    token: 'USDG',
    payer: '0x1111111111111111111111111111111111111111',
    amount: PRICE,
  })
  assert.equal(result.ok, true)
  if (!result.ok) throw new Error('pay')
  return result.order
}

function awaiting(id: string): CapsuleOrder {
  const opening = beginOpen(paid(id))
  assert.equal(opening.ok, true)
  if (!opening.ok) throw new Error('open')
  const card = recordOpen(opening.order, {
    nftAddress: `nft-${id}`,
    cardName: 'Pikachu',
    rarity: 'common',
    buybackQuote: QUOTE,
    openedAtMs: 1_700_000_000_000,
  })
  assert.equal(card.ok, true)
  if (!card.ok) throw new Error('card')
  return card.order
}

describe('obligation', () => {
  it('holds twice the quote until the player chooses', () => {
    const row = obligation(awaiting('a'))
    assert.deepEqual(row, { ok: true, amount: QUOTE * 2n })
  })

  it('drops to the quote after buyback and to zero after a loss', () => {
    const bought = chooseBuyback(awaiting('b'), 1_700_000_000_000)
    assert.equal(bought.ok, true)
    if (!bought.ok) return
    assert.deepEqual(obligation(bought.order), { ok: true, amount: QUOTE })
    const recorded = recordBuyback(bought.order, 'sig', 8_000000n)
    assert.equal(recorded.ok, true)
    if (!recorded.ok) return
    assert.deepEqual(obligation(recorded.order), { ok: true, amount: 8_000000n })
    const lost = chooseDouble(awaiting('c'), 'LOSS', 1_700_000_000_000)
    assert.equal(lost.ok, true)
    if (!lost.ok) return
    assert.deepEqual(obligation(lost.order), { ok: true, amount: 0n })
  })

  it('keeps the pack price until a failed open is refunded', () => {
    const opening = beginOpen(paid('d'))
    assert.equal(opening.ok, true)
    if (!opening.ok) return
    assert.deepEqual(obligation(opening.order), { ok: true, amount: PRICE })
    const failed = failOpen(opening.order, 'rpc')
    assert.equal(failed.ok, true)
    if (!failed.ok) return
    assert.deepEqual(obligation(failed.order), { ok: true, amount: PRICE })
  })

  it('blocks new opens while an order is in manual review', () => {
    const bought = chooseBuyback(awaiting('e'), 1_700_000_000_000)
    assert.equal(bought.ok, true)
    if (!bought.ok) return
    const review = markManualReview(bought.order, 'stuck sell')
    assert.equal(review.ok, true)
    if (!review.ok) return
    const plan = planOpen(paid('f'), [review.order], 1_000_000000n)
    assert.equal(plan.action, 'BLOCKED')
  })
})

describe('planOpen', () => {
  it('refunds a confirmed payment when the treasury cannot cover other cards', () => {
    const plan = planOpen(paid('new'), [awaiting('old')], QUOTE * 2n - 1n)
    assert.equal(plan.action, 'REFUND')
    const covered = planOpen(paid('new'), [awaiting('old')], QUOTE * 2n)
    assert.equal(covered.action, 'OPEN')
  })

  it('does not count the candidate order twice', () => {
    const candidate = paid('same')
    const plan = planOpen(candidate, [candidate], 0n)
    assert.equal(plan.action, 'OPEN')
  })

  it('books buyback profit only after the actual refund is paid', () => {
    const bought = chooseBuyback(awaiting('g'), 1_700_000_000_000)
    assert.equal(bought.ok, true)
    if (!bought.ok) return
    const recorded = recordBuyback(bought.order, 'sig', 8_000000n)
    assert.equal(recorded.ok, true)
    if (!recorded.ok) return
    assert.equal(playerResult(recorded.order), null)
    const lost = chooseDouble(awaiting('h'), 'LOSS', 1_700_000_000_000)
    assert.equal(lost.ok, true)
    if (!lost.ok) return
    assert.equal(playerResult(lost.order), PRICE)
    const won = chooseDouble(awaiting('i'), 'WIN', 1_700_000_000_000)
    assert.equal(won.ok, true)
    if (!won.ok) return
    assert.equal(playerResult(won.order), null)
    assert.equal(playerResult(won.order, 9_000000n), PRICE - QUOTE * 2n + 9_000000n)
  })
})

describe('reserved', () => {
  it('sums obligations', () => {
    const total = reserved([awaiting('j'), paid('k')])
    assert.deepEqual(total, { ok: true, amount: QUOTE * 2n + PRICE })
  })
})
