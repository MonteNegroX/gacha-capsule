import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { lamportsOf } from './vault-stock.ts'

describe('lamportsOf', () => {
  it('reads the value field from a Solana getBalance result', () => {
    assert.equal(lamportsOf({ context: { slot: 1 }, value: 32602103 }), BigInt(32602103))
  })

  it('reads a bare number', () => {
    assert.equal(lamportsOf(15000000), BigInt(15000000))
  })

  it('returns zero for an empty result', () => {
    assert.equal(lamportsOf(null), BigInt(0))
  })
})
