import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { applyDouble, outcomeForRoll } from './choice'
import { CHOICE_WINDOW_MS, chooseBuyback, confirmPayment, createOrder, recordOpen, beginOpen, type CapsuleOrder } from './order'

const OPENED_AT = 1_700_000_000_000

function awaiting(): CapsuleOrder {
  const created = createOrder({
    id: 'order-1',
    chainId: 4663,
    token: 'USDG',
    payer: '0x1111111111111111111111111111111111111111',
    machineCode: 'pokemon_25',
    memo: 'order-1',
    packPrice: 25_000000n,
  })
  assert.equal(created.ok, true)
  if (!created.ok) throw new Error('order')
  const paid = confirmPayment(created.order, {
    hash: '0xabc',
    chainId: 4663,
    token: 'USDG',
    payer: '0x1111111111111111111111111111111111111111',
    amount: 25_000000n,
  })
  assert.equal(paid.ok, true)
  if (!paid.ok) throw new Error('pay')
  const opening = beginOpen(paid.order)
  assert.equal(opening.ok, true)
  if (!opening.ok) throw new Error('open')
  const card = recordOpen(opening.order, {
    nftAddress: 'nft-1',
    cardName: 'Pikachu',
    rarity: 'common',
    buybackQuote: 10_000000n,
    openedAtMs: OPENED_AT,
  })
  assert.equal(card.ok, true)
  if (!card.ok) throw new Error('card')
  return card.order
}

describe('outcomeForRoll', () => {
  it('wins on 49 of 100 rolls', () => {
    let wins = 0
    for (let roll = 0; roll < 100; roll += 1) {
      if (outcomeForRoll(roll) === 'WIN') wins += 1
    }
    assert.equal(wins, 49)
    assert.equal(outcomeForRoll(48), 'WIN')
    assert.equal(outcomeForRoll(49), 'LOSS')
    assert.equal(outcomeForRoll(99), 'LOSS')
    assert.equal(outcomeForRoll(-1), null)
    assert.equal(outcomeForRoll(100), null)
    assert.equal(outcomeForRoll(1.5), null)
  })
})

describe('applyDouble', () => {
  it('records one roll and ignores a second roll', () => {
    const first = applyDouble(awaiting(), 48, OPENED_AT + 1_000)
    assert.equal(first.ok && first.applied, true)
    if (!first.ok) return
    assert.equal(first.order.draw, 'WIN')
    const second = applyDouble(first.order, 90, OPENED_AT + 2_000)
    assert.equal(second.ok && second.applied, false)
    if (!second.ok) return
    assert.equal(second.order.draw, 'WIN')
    assert.equal(second.order.status, 'DOUBLE_WON')
  })

  it('does not store a roll after the choice window', () => {
    const late = applyDouble(awaiting(), 10, OPENED_AT + CHOICE_WINDOW_MS)
    assert.equal(late.ok, false)
    if (late.ok) return
    assert.equal(late.error, 'CHOICE_EXPIRED')
    assert.equal(late.order.draw, null)
  })

  it('does not replace a buyback', () => {
    const bought = chooseBuyback(awaiting(), OPENED_AT + 1_000)
    assert.equal(bought.ok, true)
    if (!bought.ok) return
    const doubled = applyDouble(bought.order, 0, OPENED_AT + 1_000)
    assert.equal(doubled.ok, false)
    if (doubled.ok) return
    assert.equal(doubled.order.status, 'BUYBACK_CONFIRMED')
  })
})
