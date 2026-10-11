import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createOrder, type CapsuleOrder } from './order'
import { acceptPayment, isConfiguredTreasury } from './payment'

const TREASURY = '0x2222222222222222222222222222222222222222'
const PRICE = 25_000000n

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

const transfer = {
  hash: '0xabc',
  chainId: 4663,
  token: '0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168',
  from: '0x1111111111111111111111111111111111111111',
  to: TREASURY,
  amount: PRICE,
}

describe('acceptPayment', () => {
  it('rejects an empty or zero treasury without confirming the order', () => {
    assert.equal(isConfiguredTreasury(''), false)
    assert.equal(isConfiguredTreasury('0x0000000000000000000000000000000000000000'), false)
    const empty = acceptPayment(pending(), transfer, '')
    assert.equal(empty.ok, false)
    if (empty.ok) return
    assert.equal(empty.error, 'TREASURY_UNCONFIGURED')
    assert.equal(empty.order.status, 'PENDING_PAYMENT')
    const zero = acceptPayment(pending(), transfer, '0x0000000000000000000000000000000000000000')
    assert.equal(zero.ok, false)
  })

  it('rejects a transfer sent somewhere else', () => {
    const missed = acceptPayment(pending(), { ...transfer, to: '0x3333333333333333333333333333333333333333' }, TREASURY)
    assert.equal(missed.ok, false)
    if (missed.ok) return
    assert.equal(missed.error, 'WRONG_RECIPIENT')
    assert.equal(missed.order.paymentHash, null)
  })

  it('confirms a transfer that matches the treasury and the order', () => {
    const accepted = acceptPayment(pending(), transfer, TREASURY.toUpperCase())
    assert.equal(accepted.ok && accepted.applied, true)
    if (!accepted.ok) return
    assert.equal(accepted.order.status, 'PAYMENT_CONFIRMED')
    const replay = acceptPayment(accepted.order, transfer, TREASURY)
    assert.equal(replay.ok && replay.applied, false)
  })
})
