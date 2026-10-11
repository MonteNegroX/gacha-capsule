import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { refundToRaw } from './units.ts'

describe('refundToRaw', () => {
  it('keeps a 6-decimal base-unit refund', () => {
    assert.equal(refundToRaw(86700000), BigInt('86700000'))
  })

  it('parses a dollar refund', () => {
    assert.equal(refundToRaw(86.7), BigInt('86700000'))
  })
})
