import { spawn } from 'node:child_process'
import {
  beginOpen,
  expireChoice,
  failOpen,
  listLend,
  markManualReview,
  queueDoublePayout,
  queueLend,
  recordBuyback,
  recordOpen,
  refundUnopened,
  requestRefund,
  retryPayout,
  type CapsuleOrder,
} from '@/lib/capsule/order'
import { markPaid, markRefunded, failPayout } from '@/lib/capsule/order'
import { HELD_JOLTEON } from '@/lib/gacha/held-card'
import { quoteBuyback, openPackLive } from '@/lib/gacha/live-open'
import { readDeal } from '@/lib/gacha/lend-read'
import {
  beatWorker,
  listPulls,
  toDomain,
  writeDomain,
  type PullRow,
} from '@/lib/gacha/pull-store'
import { createLendDeal, dealIdFor, sendUsdg, treasuryAddressMatches, withdrawLendPrincipal } from '@/lib/gacha/treasury-tx'
import { parseUnits } from '@/lib/gacha/units'
import { treasuryAddress } from '@/lib/gacha/verify-payment'
import { vaultCanOpen } from '@/lib/gacha/vault-stock'

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function note(err: unknown): string {
  const message = err instanceof Error ? err.message : 'Vault call failed'
  return message.replace(/postgres(?:ql)?:\/\/\S+/gi, 'db').replace(/0x[a-fA-F0-9]{64}/g, '0x…').slice(0, 240)
}

function botJson(script: string, arg: string, extra?: string): Promise<Record<string, unknown>> {
  const cwd = process.env.GACHA_BOT_DIR?.trim() || 'C:\\Users\\main\\collector-gacha-bot'
  const args = extra ? [script, arg, extra] : [script, arg]
  return new Promise((resolve, reject) => {
    const child = spawn('npx', ['tsx', ...args], { cwd, shell: true })
    let stdout = ''
    let stderr = ''
    const timer = setTimeout(() => {
      child.kill()
      reject(new Error('Vault call timed out'))
    }, 120_000)
    child.stdout.on('data', (chunk) => {
      stdout += String(chunk)
    })
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk)
    })
    child.on('error', (err) => {
      clearTimeout(timer)
      reject(err)
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      if (code !== 0) {
        reject(new Error(stderr.trim().slice(0, 240) || `Vault call exited ${code}`))
        return
      }
      try {
        resolve(JSON.parse(stdout.trim()) as Record<string, unknown>)
      } catch {
        reject(new Error('Vault call did not return JSON'))
      }
    })
  })
}

async function save(previous: string, order: CapsuleOrder, extra: Partial<PullRow> = {}): Promise<PullRow | null> {
  return writeDomain(previous, order, extra)
}

async function openConfirmed(row: PullRow): Promise<void> {
  const stocked = await vaultCanOpen(BigInt(row.price_raw)).catch(() => false)
  if (!stocked) {
    const refund = refundUnopened(toDomain(row))
    if (refund.ok) await save(row.status, refund.order, { error: 'The machine could not open. The payment will be returned.' })
    return
  }
  const began = beginOpen(toDomain(row))
  if (!began.ok) return
  const claimed = await save(row.status, began.order)
  if (!claimed || claimed.status !== 'OPENING') return
  try {
    const result = await openPackLive(row.machine_code, false, false, 150_000)
    if (!result.nftAddress || result.nftAddress === HELD_JOLTEON) {
      const review = markManualReview(toDomain(claimed), 'The open did not return a new card')
      if (review.ok) await save('OPENING', review.order)
      return
    }
    const quoteUsd = quoteBuyback(result.insuredValue, row.buyback_pct, result.buybackAmount)
    const quote = quoteUsd == null ? null : parseUnits(quoteUsd)
    if (!quote || !result.nftName) {
      const review = markManualReview(toDomain(claimed), 'The open did not return a buyback quote')
      if (review.ok) await save('OPENING', review.order)
      return
    }
    const recorded = recordOpen(toDomain(claimed), {
      nftAddress: result.nftAddress,
      cardName: result.nftName,
      rarity: result.rarity,
      buybackQuote: quote,
      openedAtMs: Date.now(),
    })
    if (!recorded.ok) return
    const opened = { ...recorded.order, memo: result.memo ?? recorded.order.memo }
    await save('OPENING', opened, {
      image_url: result.imageUrl?.startsWith('https://') ? result.imageUrl : null,
      insured_usd: result.insuredValue == null ? null : String(result.insuredValue),
    })
    console.log(`opened ${claimed.id}`)
  } catch (err) {
    const failed = failOpen(toDomain(claimed), note(err))
    if (!failed.ok) return
    const refund = requestRefund(failed.order)
    await save('OPENING', refund.ok ? refund.order : failed.order)
    console.log(`open failed ${claimed.id}`)
  }
}

async function sell(row: PullRow): Promise<void> {
  if (!row.nft_address || row.nft_address === HELD_JOLTEON) {
    const review = markManualReview(toDomain(row), 'This card is not for sale')
    if (review.ok) await save(row.status, review.order)
    return
  }
  try {
    const sold = await botJson('src/sell-held.ts', row.nft_address)
    const signature = typeof sold.signature === 'string' ? sold.signature : ''
    const refundUsd = typeof sold.refundAmount === 'number' ? sold.refundAmount : Number(sold.refundAmount)
    const refund = Number.isFinite(refundUsd) && refundUsd >= 0 ? parseUnits(refundUsd) ?? BigInt(0) : null
    if (!signature || refund == null) throw new Error('Buyback did not return a refund')
    const recorded = recordBuyback(toDomain(row), signature, refund === BigInt(0) ? BigInt(0) : refund)
    if (!recorded.ok) return
    await save(row.status, recorded.order)
    console.log(`bought back ${row.id}`)
  } catch (err) {
    const review = markManualReview(toDomain(row), note(err))
    if (review.ok) await save(row.status, review.order)
  }
}

async function payRow(row: PullRow, amount: bigint): Promise<void> {
  const treasury = treasuryAddress()
  if (!treasury || !(await treasuryAddressMatches(treasury).catch(() => false))) {
    const failed = failPayout(toDomain(row), 'Treasury payout is not configured')
    if (failed.ok) await save(row.status, failed.order)
    return
  }
  if (row.payout_hash) {
    const paid = markPaid(toDomain(row), row.payout_hash)
    if (paid.ok) await save(row.status, paid.order)
    return
  }
  try {
    if (amount <= BigInt(0)) {
      const paid = markPaid({ ...toDomain(row), payoutHash: 'zero' }, 'zero')
      if (paid.ok) await save(row.status, paid.order)
      return
    }
    const hash = await sendUsdg(row.payer, amount)
    const pending = { ...toDomain(row), payoutHash: hash }
    const stored = await save(row.status, pending)
    if (!stored) return
    const paid = markPaid(toDomain(stored), hash)
    if (paid.ok) await save(stored.status, paid.order)
    console.log(`paid ${row.id}`)
  } catch (err) {
    const failed = failPayout(toDomain(row), note(err))
    if (failed.ok) await save(row.status, failed.order)
  }
}

async function refundRow(row: PullRow): Promise<void> {
  const treasury = treasuryAddress()
  if (!treasury || !(await treasuryAddressMatches(treasury).catch(() => false))) return
  if (row.refund_hash) {
    const done = markRefunded(toDomain(row), row.refund_hash)
    if (done.ok) await save(row.status, done.order)
    return
  }
  try {
    const amount = BigInt(row.paid_raw)
    const hash = await sendUsdg(row.payer, amount)
    const pending = { ...toDomain(row), refundHash: hash }
    const stored = await save(row.status, pending)
    if (!stored) return
    const done = markRefunded(toDomain(stored), hash)
    if (done.ok) await save(stored.status, done.order)
    console.log(`refunded ${row.id}`)
  } catch (err) {
    await save(row.status, { ...toDomain(row), error: note(err) })
  }
}

async function listDeal(row: PullRow): Promise<void> {
  let current = row
  if (row.status === 'DOUBLE_LOST') {
    const queued = queueLend(toDomain(row))
    if (!queued.ok) return
    const saved = await save(row.status, queued.order)
    if (!saved || saved.status !== 'LEND_QUEUED') return
    current = saved
  }
  if (current.status !== 'LEND_QUEUED') return
  const principal = current.buyback_raw ? BigInt(current.buyback_raw) : BigInt(0)
  const owner = treasuryAddress()
  if (!owner) return
  let dealId = dealIdFor(current.id)
  try {
    dealId = await createLendDeal(current.id, owner, principal)
  } catch (err) {
    const existing = await readDeal(dealId).catch(() => null)
    if (!existing || existing.status === 0) {
      const review = markManualReview(toDomain(current), note(err))
      if (review.ok) await save(current.status, review.order)
      return
    }
  }
  const listed = listLend(toDomain(current), dealId)
  if (listed.ok) await save(current.status, listed.order)
  console.log(`listed ${current.id}`)
}

async function maintainDeal(row: PullRow): Promise<void> {
  if (!row.lend_deal_id || row.nft_address === HELD_JOLTEON) return
  const deal = await readDeal(row.lend_deal_id).catch(() => null)
  if (!deal) return
  const owner = treasuryAddress()
  if (deal.status === 2 && deal.held > BigInt(0) && owner && deal.owner.toLowerCase() === owner.toLowerCase()) {
    await withdrawLendPrincipal(row.lend_deal_id).catch((err) => {
      console.log(`withdraw skipped ${row.id}: ${note(err)}`)
    })
  }
  if (deal.status === 4 && row.solana_address && !row.nft_send_sig && row.nft_address) {
    try {
      const sent = await botJson('src/send-nft.ts', row.nft_address, row.solana_address)
      const signature = typeof sent.signature === 'string' ? sent.signature : ''
      if (!signature) throw new Error('NFT send did not return a signature')
      await save(row.status, toDomain(row), { nft_send_sig: signature, error: null })
      console.log(`sent nft ${row.id}`)
    } catch (err) {
      await save(row.status, { ...toDomain(row), error: note(err) })
    }
  }
}

async function tick(): Promise<void> {
  const confirmed = await listPulls('PAYMENT_CONFIRMED')
  if (confirmed[0]) {
    await openConfirmed(confirmed[0])
    return
  }
  for (const row of await listPulls('AWAITING_CHOICE')) {
    const expired = expireChoice(toDomain(row), Date.now())
    if (expired.ok && expired.applied) await save(row.status, expired.order)
  }
  for (const row of await listPulls('BUYBACK_CONFIRMED')) await sell(row)
  for (const row of await listPulls('DOUBLE_WON')) {
    const queued = queueDoublePayout(toDomain(row))
    if (queued.ok && queued.applied) await save(row.status, queued.order)
  }
  for (const row of await listPulls('DOUBLE_LOST')) await listDeal(row)
  for (const row of await listPulls('LEND_QUEUED')) await listDeal(row)
  for (const row of await listPulls('PAYOUT_FAILED')) {
    const again = retryPayout(toDomain(row))
    if (again.ok && again.applied) await save(row.status, again.order)
  }
  for (const row of await listPulls('PAYOUT_PENDING')) {
    const domain = toDomain(row)
    const amount = domain.choice === 'DOUBLE' && domain.draw === 'WIN' && domain.buybackQuote
      ? domain.buybackQuote * BigInt(2)
      : domain.actualRefund
    if (amount == null) continue
    await payRow(row, amount)
  }
  for (const row of await listPulls('OPENING_FAILED')) {
    const refund = requestRefund(toDomain(row))
    if (refund.ok && refund.applied) await save(row.status, refund.order)
  }
  for (const row of await listPulls('REFUND_PENDING')) await refundRow(row)
  for (const row of await listPulls('LEND_LISTED')) await maintainDeal(row)
}

export async function runWorker(): Promise<void> {
  for (const row of await listPulls('OPENING')) {
    const review = markManualReview(toDomain(row), 'Open was interrupted before the card was saved')
    if (review.ok) await save(row.status, review.order)
  }
  console.log('capsule worker running')
  for (;;) {
    try {
      await beatWorker(Date.now())
      await tick()
    } catch (err) {
      console.log(note(err))
    }
    await sleep(8000)
  }
}
