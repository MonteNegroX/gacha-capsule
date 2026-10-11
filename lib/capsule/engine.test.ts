import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { advanceOpen, listLostCard, registerPayment, settleChoice } from './engine'
import { confirmPayment, createOrder, type CapsuleOrder } from './order'
import { disabledHoldOpen, type HoldOpenResult } from './ports'

const PRICE = 25_000000n
const QUOTE = 10_000000n
const TREASURY = '0x2222222222222222222222222222222222222222'
const OPENED_AT = 1_700_000_000_000

function pending(id = 'order-1'): CapsuleOrder {
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

function paid(id = 'order-1'): CapsuleOrder {
  const result = confirmPayment(pending(id), {
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

describe('advanceOpen', () => {
  it('does not call the opener while opening is disabled', () => {
    let calls = 0
    const step = advanceOpen(paid(), [], PRICE, false, () => {
      calls += 1
      return { ok: false, reason: 'FAILED', message: 'should not run' }
    })
    assert.equal(calls, 0)
    assert.equal(step.action, 'WAIT')
    assert.equal(step.order.status, 'PAYMENT_CONFIRMED')
    const disabled = advanceOpen(paid(), [], PRICE, true, disabledHoldOpen)
    assert.equal(disabled.action, 'WAIT')
    assert.equal(disabled.order.status, 'PAYMENT_CONFIRMED')
  })

  it('refunds when the reserve is short and does not open', () => {
    let calls = 0
    const held = paid('held')
    const card = advanceOpen(held, [], PRICE, true, () => {
      calls += 1
      return {
        ok: true,
        card: { nftAddress: 'nft-held', cardName: 'Pikachu', rarity: 'common', buybackQuote: QUOTE, openedAtMs: OPENED_AT },
      }
    })
    assert.equal(card.action, 'OPENED')
    const next = advanceOpen(paid('next'), [card.order], QUOTE, true, () => {
      calls += 1
      return { ok: false, reason: 'FAILED', message: 'no' }
    })
    assert.equal(next.action, 'REFUND')
    assert.equal(next.order.status, 'REFUND_PENDING')
    assert.equal(calls, 1)
  })

  it('records one card and does not ask the opener again', () => {
    let calls = 0
    const port = (): HoldOpenResult => {
      calls += 1
      return {
        ok: true,
        card: { nftAddress: 'nft-1', cardName: 'Pikachu', rarity: 'common', buybackQuote: QUOTE, openedAtMs: OPENED_AT },
      }
    }
    const first = advanceOpen(paid(), [], 0n, true, port)
    const second = advanceOpen(first.order, [], 0n, true, port)
    assert.equal(first.action, 'OPENED')
    assert.equal(first.order.status, 'AWAITING_CHOICE')
    assert.equal(first.order.buybackSignature, null)
    assert.equal(second.action, 'OPENED')
    assert.equal(calls, 1)
  })

  it('refunds a failed open once', () => {
    let calls = 0
    const first = advanceOpen(paid(), [], 0n, true, () => {
      calls += 1
      return { ok: false, reason: 'FAILED', message: 'rpc' }
    })
    assert.equal(first.action, 'OPEN_FAILED')
    assert.equal(first.order.status, 'REFUND_PENDING')
    const second = advanceOpen(first.order, [], 0n, true, () => {
      calls += 1
      return { ok: true, card: { nftAddress: 'nft-2', cardName: 'Other', rarity: 'rare', buybackQuote: QUOTE, openedAtMs: OPENED_AT } }
    })
    assert.equal(second.action, 'HOLD')
    assert.equal(calls, 1)
  })
})

describe('registerPayment', () => {
  it('rejects a second order that reuses a payment hash', () => {
    const transfer = {
      hash: '0xABC',
      chainId: 4663,
      token: 'USDG',
      from: '0x1111111111111111111111111111111111111111',
      to: TREASURY,
      amount: PRICE,
    }
    const first = registerPayment([], pending('one'), transfer, TREASURY)
    assert.equal(first.ok && first.applied, true)
    if (!first.ok) return
    const second = registerPayment([first.order], pending('two'), { ...transfer, hash: '0xabc' }, TREASURY)
    assert.equal(second.ok, false)
    if (second.ok) return
    assert.equal(second.error, 'PAYMENT_REPLAY')
    assert.equal(second.order.status, 'PENDING_PAYMENT')
  })
})

describe('listLostCard', () => {
  it('lists one deal after a losing roll and ignores the same listing', () => {
    const opened = advanceOpen(paid(), [], 0n, true, () => ({
      ok: true,
      card: { nftAddress: 'nft-1', cardName: 'Pikachu', rarity: 'common', buybackQuote: QUOTE, openedAtMs: OPENED_AT },
    }))
    const lost = settleChoice(opened.order, { type: 'DOUBLE', roll: 49 }, OPENED_AT + 1_000)
    assert.equal(lost.ok && lost.applied, true)
    if (!lost.ok) return
    assert.equal(lost.order.status, 'DOUBLE_LOST')
    const input = { id: 'deal-1', orderId: lost.order.id, nftAddress: 'nft-1', buybackQuote: QUOTE, minFunded: QUOTE }
    const listed = listLostCard(lost.order, [], input)
    assert.equal(listed.ok && listed.applied, true)
    if (!listed.ok) return
    assert.equal(listed.order.status, 'LEND_LISTED')
    const again = listLostCard(listed.order, [listed.deal], input)
    assert.equal(again.ok && again.applied, false)
  })
})
