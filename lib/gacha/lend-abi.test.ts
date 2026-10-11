import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { Interface } from 'ethers'
import { decodeDeal, encodeApprove, encodeFund, encodeRepay } from './lend-abi'

const iface = new Interface([
  'function fund(bytes32 id)',
  'function repay(bytes32 id)',
  'function approve(address spender, uint256 amount)',
])

const id = '0x8402edef4b241a12b222ef38bb2d114ebc6651b252e9657e367128b276d4d2d4'

describe('lend call encoding', () => {
  it('matches the contract ABI', () => {
    assert.equal(encodeFund(id), iface.encodeFunctionData('fund', [id]))
    assert.equal(encodeRepay(id), iface.encodeFunctionData('repay', [id]))
    assert.equal(
      encodeApprove('0xa7F89DE1FE71Aa4D37A9179231787b2aC1a4DcFc', BigInt('17000000')),
      iface.encodeFunctionData('approve', ['0xa7F89DE1FE71Aa4D37A9179231787b2aC1a4DcFc', BigInt('17000000')]),
    )
  })

  it('reads a static deal tuple', () => {
    const data = `0x${'0'.repeat(24)}d89d795dd6d8eb591a0bb0cb5105a5ead1d00e99${'0'.repeat(64)}${'0'.repeat(63)}1${'0'.repeat(64)}${'0'.repeat(64)}${'0'.repeat(64)}${'0'.repeat(64)}${'0'.repeat(64)}${'0'.repeat(64)}${'0'.repeat(63)}1`
    const deal = decodeDeal(data)
    assert.equal(deal?.owner, '0xd89d795dd6d8eb591a0bb0cb5105a5ead1d00e99')
    assert.equal(deal?.principal, BigInt(1))
    assert.equal(deal?.status, 1)
  })
})
