import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { LEND_TERM_MS, deposit, lenderShare, markDefault, openListing, repay, settleSale, shares, withdraw, type LendDeal } from './lend'

const QUOTE = 10_000000n
const NOW = 1_700_000_000_000
const LENDER_A = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
const LENDER_B = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'

function listing(minFunded = QUOTE): LendDeal {
  const created = openListing([], {
    id: 'deal-1',
    orderId: 'order-1',
    nftAddress: 'nft-1',
    buybackQuote: QUOTE,
    minFunded,
  })
  assert.equal(created.ok && created.applied, true)
  if (!created.ok) throw new Error('deal')
  return created.deal
}

describe('openListing', () => {
  it('rejects a hardcoded-style minimum outside the quote', () => {
    const low = openListing([], {
      id: 'deal-1',
      orderId: 'order-1',
      nftAddress: 'nft-1',
      buybackQuote: QUOTE,
      minFunded: 0n,
    })
    assert.equal(low.ok, false)
    const high = openListing([], {
      id: 'deal-1',
      orderId: 'order-1',
      nftAddress: 'nft-1',
      buybackQuote: QUOTE,
      minFunded: QUOTE + 1n,
    })
    assert.equal(high.ok, false)
  })

  it('allows one deal per card', () => {
    const first = listing()
    const again = openListing([first], {
      id: 'deal-2',
      orderId: 'order-1',
      nftAddress: 'nft-1',
      buybackQuote: QUOTE,
      minFunded: QUOTE,
    })
    assert.equal(again.ok && again.applied, false)
    const other = openListing([first], {
      id: 'deal-2',
      orderId: 'order-2',
      nftAddress: 'nft-1',
      buybackQuote: QUOTE,
      minFunded: QUOTE,
    })
    assert.equal(other.ok, false)
  })
})

describe('funding', () => {
  it('starts a 7 day term only once the configured minimum is in', () => {
    const half = QUOTE / 2n
    const open = listing(half)
    const first = deposit(open, { id: 'd1', lender: LENDER_A, amount: half - 1n, nowMs: NOW })
    assert.equal(first.ok && first.applied, true)
    if (!first.ok) return
    assert.equal(first.deal.status, 'LISTING')
    assert.equal(first.deal.expiresAtMs, null)
    const pulled = withdraw(first.deal, LENDER_A, 1n)
    assert.equal(pulled.ok && pulled.applied, true)
    if (!pulled.ok) return
    assert.equal(pulled.deal.funded, half - 2n)
    const filled = deposit(pulled.deal, { id: 'd2', lender: LENDER_B, amount: 2n, nowMs: NOW })
    assert.equal(filled.ok && filled.applied, true)
    if (!filled.ok) return
    assert.equal(filled.deal.status, 'ACTIVE')
    assert.equal(filled.deal.cap, QUOTE)
    assert.equal(filled.deal.expiresAtMs, NOW + LEND_TERM_MS)
    const extra = deposit(filled.deal, { id: 'd3', lender: LENDER_A, amount: 1n, nowMs: NOW })
    assert.equal(extra.ok, false)
    const replay = deposit(filled.deal, { id: 'd2', lender: LENDER_B, amount: 2n, nowMs: NOW })
    assert.equal(replay.ok && replay.applied, false)
  })
})

describe('settlement', () => {
  it('pays lenders the cap when the treasury repays, including yield if the book stopped early', () => {
    const open = listing(QUOTE / 2n)
    const funded = deposit(open, { id: 'd1', lender: LENDER_A, amount: QUOTE / 2n, nowMs: NOW })
    assert.equal(funded.ok, true)
    if (!funded.ok) return
    const early = markDefault(funded.deal, funded.deal.expiresAtMs ?? NOW)
    assert.equal(early.ok, false)
    const atTerm = repay(funded.deal, QUOTE, funded.deal.expiresAtMs ?? 0)
    assert.equal(atTerm.ok && atTerm.applied, true)
    if (!atTerm.ok) return
    assert.equal(lenderShare(atTerm.deal, LENDER_A), QUOTE)
    const late = repay(funded.deal, QUOTE, (funded.deal.expiresAtMs ?? 0) + 1)
    assert.equal(late.ok, false)
  })

  it('splits the actual sale after default and gives the remainder to the last deposit', () => {
    const open = listing(3n)
    const a = deposit(open, { id: 'd1', lender: LENDER_A, amount: 1n, nowMs: NOW })
    assert.equal(a.ok, true)
    if (!a.ok) return
    const b = deposit(a.deal, { id: 'd2', lender: LENDER_B, amount: 1n, nowMs: NOW })
    assert.equal(b.ok, true)
    if (!b.ok) return
    const c = deposit(b.deal, { id: 'd3', lender: LENDER_A, amount: 1n, nowMs: NOW })
    assert.equal(c.ok, true)
    if (!c.ok) return
    assert.equal(c.deal.status, 'ACTIVE')
    const expired = markDefault(c.deal, (c.deal.expiresAtMs ?? 0) + 1)
    assert.equal(expired.ok && expired.applied, true)
    if (!expired.ok) return
    const settled = settleSale(expired.deal, 10n)
    assert.equal(settled.ok && settled.applied, true)
    if (!settled.ok) return
    const split = shares(settled.deal)
    assert.deepEqual(split, [3n, 3n, 4n])
    assert.equal(lenderShare(settled.deal, LENDER_A), 7n)
    assert.equal(split.reduce((sum, part) => sum + part, 0n), 10n)
    const again = settleSale(settled.deal, 4n)
    assert.equal(again.ok, false)
  })
})
