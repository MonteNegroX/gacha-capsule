import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { collateralMessage, parseCollateral } from './collateral'

const MINT = '66sKFD5cKaYtLF79x8fxAM4zihFCTZZwUtd35w7KkzZD'

describe('parseCollateral', () => {
  it('accepts a vault mint and a principal inside the cap', () => {
    const parsed = parseCollateral(MINT, '16.15')
    assert.ok(parsed)
    assert.equal(parsed.raw, 16_150000n)
    assert.equal(collateralMessage(parsed.mint, parsed.raw.toString()), `Capsule collateral\n${MINT}\n16150000`)
  })

  it('rejects a short mint and a principal outside 1 to 500 USDG', () => {
    assert.equal(parseCollateral('not-a-mint', '10'), null)
    assert.equal(parseCollateral(MINT, '0.5'), null)
    assert.equal(parseCollateral(MINT, '500.01'), null)
    assert.equal(parseCollateral(MINT, '10.123'), null)
  })
})
