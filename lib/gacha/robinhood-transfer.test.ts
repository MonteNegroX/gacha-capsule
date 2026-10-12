import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { BUYOUT_FEE_PERCENT, HYPERLIQUID_CHAIN_HEX, HYPERLIQUID_CHAIN_ID, HYPERLIQUID_USDC, ROBINHOOD_CHAIN_HEX, ROBINHOOD_CHAIN_ID, buyoutCharge, encodeUsdgTransfer, parseUsdg, usdgAmount } from './robinhood-transfer'

describe('robinhood transfer', () => {
  it('uses chain 4663 and encodes a 25 USDG transfer', () => {
    assert.equal(Number.parseInt(ROBINHOOD_CHAIN_HEX, 16), ROBINHOOD_CHAIN_ID)
    const amount = usdgAmount(25)
    assert.equal(amount, BigInt(25_000000))
    const data = encodeUsdgTransfer('0x2222222222222222222222222222222222222222', amount)
    assert.equal(data.startsWith('0xa9059cbb'), true)
    assert.equal(data.slice(10, 74), '0000000000000000000000002222222222222222222222222222222222222222')
    assert.equal(data.slice(74), amount.toString(16).padStart(64, '0'))
  })

  it('accepts a buyback cap and rejects anything above it', () => {
    const cap = BigInt(17_000000)
    assert.equal(parseUsdg('17', cap), cap)
    assert.equal(parseUsdg('1.5', cap), BigInt(1_500000))
    assert.equal(parseUsdg('17.000001', cap), null)
    assert.equal(parseUsdg('0', cap), null)
    assert.equal(parseUsdg('abc', cap), null)
  })

  it('adds 3% of the buyout on top', () => {
    assert.equal(BUYOUT_FEE_PERCENT, 3)
    const charge = buyoutCharge(BigInt(17_000000))
    assert.equal(charge.fee, BigInt(510000))
    assert.equal(charge.total, BigInt(17_510000))
  })

  it('uses HyperEVM chain 999 and Circle USDC', () => {
    assert.equal(Number.parseInt(HYPERLIQUID_CHAIN_HEX, 16), HYPERLIQUID_CHAIN_ID)
    assert.equal(HYPERLIQUID_USDC.toLowerCase(), '0xb88339cb7199b77e23db6e890353e22632ba630f')
    assert.equal(usdgAmount(25), BigInt(25_000000))
  })
})
