import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { solanaAddress } from './solana-address'

describe('solana address', () => {
  it('accepts a 32-byte public key', () => {
    assert.equal(solanaAddress('41NaNu6LNhDStmzEqGZHvHsawjtaBTVbR9GZdnQJ3193'), '41NaNu6LNhDStmzEqGZHvHsawjtaBTVbR9GZdnQJ3193')
  })

  it('rejects short and invalid text', () => {
    assert.equal(solanaAddress('not-an-address'), null)
    assert.equal(solanaAddress('0x' + 'ab'.repeat(20)), null)
  })
})
