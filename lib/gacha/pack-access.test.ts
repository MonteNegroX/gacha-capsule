import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { doubleOffered, gatePayment, packOpenable } from './pack-access'

describe('pack access', () => {
  it('keeps packs at or under $25 open', () => {
    assert.equal(packOpenable(25), true)
    assert.equal(packOpenable(10), true)
  })

  it('closes packs above $25', () => {
    assert.equal(packOpenable(25.01), false)
    assert.equal(packOpenable(50), false)
    assert.equal(packOpenable(0), false)
    assert.equal(packOpenable(Number.NaN), false)
  })

  it('offers double only on common cards', () => {
    assert.equal(doubleOffered('Common'), true)
    assert.equal(doubleOffered(' common '), true)
    assert.equal(doubleOffered('Rare'), false)
    assert.equal(doubleOffered(''), false)
    assert.equal(doubleOffered(null), false)
  })

  it('queues an exact payment for an open pack and refunds the rest', () => {
    assert.equal(gatePayment(25, BigInt('25000000'), true), 'queue')
    assert.equal(gatePayment(50, BigInt('50000000'), false), 'refund')
    assert.equal(gatePayment(25, BigInt('50000000'), true), 'refund')
    assert.equal(gatePayment(25, BigInt('10000000'), true), 'refund')
    assert.equal(gatePayment(25, BigInt(0), true), 'ignore')
    assert.equal(gatePayment(25, null, true), 'ignore')
  })
})
