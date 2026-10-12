import { spawn } from 'node:child_process'
import {
  attachWinLend,
  beginOpen,
  chooseBuyback,
  expireChoice,
  failOpen,
  listLend,
  markManualReview,
  queueDoublePayout,
  queueLend,
  recordBuyback,
  recordOpen,
  recordUnclaimedBuyback,
  unclaimedWinAction,
  refundUnopened,
  requestRefund,
  retryPayout,
  type CapsuleOrder,
} from '@/lib/capsule/order'
import { markPaid, markRefunded, failPayout } from '@/lib/capsule/order'
import { HELD_JOLTEON } from '@/lib/gacha/held-card'
import { quoteBuyback, openPackLive } from '@/lib/gacha/live-open'
import { openGaragePack, RipCarsOpenError } from '@/lib/gacha/ripcars-open'
import { isRipCarsPack, RIPCARS_WORKER_ID, workerOwnsPack, type PackWorker } from '@/lib/gacha/ripcars-pack'
import { readDeal } from '@/lib/gacha/lend-read'
import {
  beatWorker,
  listCollateral,
  listPulls,
  listUnsoldWins,
  mintAlreadyOpened,
  saveCollateral,
  toDomain,
  writeDomain,
  type CollateralRow,
  type PullRow,
} from '@/lib/gacha/pull-store'
import { cancelLendDeal, createLendDeal, dealIdFor, sendUsdg, treasuryAddressMatches, treasuryUsdgBalance, withdrawLendPrincipal } from '@/lib/gacha/treasury-tx'
import { parseUnits, refundToRaw } from '@/lib/gacha/units'
import { treasuryAddress } from '@/lib/gacha/verify-payment'
import { vaultCanOpen, vaultHoldsMint } from '@/lib/gacha/vault-stock'

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

async function openGarage(claimed: PullRow): Promise<void> {
  let result
  try {
    result = await openGaragePack()
  } catch (err) {
    if (err instanceof RipCarsOpenError && err.spent && err.code !== 'PAYMENT_REFUNDED') {
      const review = markManualReview(toDomain(claimed), err.message)
      if (review.ok) await save('OPENING', review.order)
      console.log(`garage review ${claimed.id}`)
      return
    }
    throw err
  }
  if (!result) return
  const refund = refundToRaw(result.buybackUsd)
  if (!result.mint || result.mint === HELD_JOLTEON || !result.name || refund == null || refund <= BigInt(0) || !result.buybackSignature) {
    const review = markManualReview(toDomain(claimed), 'The open did not return a sold car')
    if (review.ok) await save('OPENING', review.order)
    return
  }
  const recorded = recordOpen(toDomain(claimed), {
    nftAddress: result.mint,
    cardName: result.name,
    rarity: result.rarity,
    buybackQuote: refund,
    openedAtMs: Date.now(),
  })
  if (!recorded.ok) return
  const chosen = chooseBuyback(recorded.order, Date.now())
  if (!chosen.ok) {
    const review = markManualReview(recorded.order, 'The Garage Pack could not be sold')
    if (review.ok) await save('OPENING', review.order)
    return
  }
  const sold = recordBuyback(chosen.order, result.buybackSignature, refund)
  if (!sold.ok) {
    const review = markManualReview(recorded.order, 'The Garage Pack could not be sold')
    if (review.ok) await save('OPENING', review.order)
    return
  }
  await save('OPENING', { ...sold.order, memo: result.paySignature }, {
    image_url: result.imageUrl,
    insured_usd: result.fmvUsd == null ? null : String(result.fmvUsd),
  })
  console.log(`opened garage ${claimed.id}`)
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
    if (isRipCarsPack(row.machine_code)) {
      await openGarage(claimed)
      return
    }
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
  if (isRipCarsPack(row.machine_code)) {
    const review = markManualReview(toDomain(row), 'This car is sold on Solana by the opener')
    if (review.ok) await save(row.status, review.order)
    return
  }
  if (!row.nft_address || row.nft_address === HELD_JOLTEON) {
    const review = markManualReview(toDomain(row), 'This card is not for sale')
    if (review.ok) await save(row.status, review.order)
    return
  }
  try {
    const sold = await botJson('src/sell-held.ts', row.nft_address)
    const signature = typeof sold.signature === 'string' ? sold.signature : ''
    const refund = refundToRaw(sold.refundAmount)
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
    const balance = await treasuryUsdgBalance()
    if (balance < amount) {
      console.log(`payout waiting ${row.id}`)
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

const CHAIN_STATUS = ['Empty', 'Funding', 'Active', 'Repaid', 'Defaulted', 'Cancelled'] as const

async function listWin(row: PullRow): Promise<void> {
  if (row.lend_deal_id || row.buyback_signature || !row.nft_address || row.nft_address === HELD_JOLTEON) return
  const principal = row.buyback_raw ? BigInt(row.buyback_raw) : BigInt(0)
  const owner = treasuryAddress()
  if (!owner || principal <= BigInt(0)) return
  let dealId = dealIdFor(row.id)
  try {
    dealId = await createLendDeal(row.id, owner, principal)
  } catch (err) {
    const existing = await readDeal(dealId).catch(() => null)
    if (!existing || existing.status === 0) {
      console.log(`win list skipped ${row.id}: ${note(err)}`)
      return
    }
  }
  const attached = attachWinLend(toDomain(row), dealId)
  if (!attached.ok) return
  const saved = await save(row.status, attached.order, { listed_at_ms: row.listed_at_ms ?? String(Date.now()) })
  if (saved) console.log(`listed win ${row.id}`)
}

async function sellUnclaimedWin(row: PullRow): Promise<void> {
  if (!row.nft_address || row.nft_address === HELD_JOLTEON || row.buyback_signature) return
  try {
    const sold = await botJson('src/sell-held.ts', row.nft_address)
    const signature = typeof sold.signature === 'string' ? sold.signature : ''
    const refund = refundToRaw(sold.refundAmount)
    if (!signature || refund == null) throw new Error('Buyback did not return a refund')
    const recorded = recordUnclaimedBuyback(toDomain(row), signature, refund)
    if (!recorded.ok) return
    await save(row.status, recorded.order)
    console.log(`bought back unclaimed ${row.id}`)
  } catch (err) {
    await save(row.status, { ...toDomain(row), error: note(err) })
  }
}

async function expireUnclaimedWin(row: PullRow): Promise<void> {
  if (!row.lend_deal_id || row.buyback_signature || row.nft_address === HELD_JOLTEON) return
  const deal = await readDeal(row.lend_deal_id).catch(() => null)
  const onchain = deal ? CHAIN_STATUS[deal.status] ?? null : null
  const listedAt = row.listed_at_ms && /^\d+$/.test(row.listed_at_ms) ? Number(row.listed_at_ms) : null
  const action = unclaimedWinAction({
    draw: 'WIN',
    sold: false,
    listedAtMs: listedAt,
    nowMs: Date.now(),
    onchain,
  })
  if (action === 'leave') {
    if (deal && (deal.status === 2 || deal.status === 4)) await maintainDeal(row)
    return
  }
  if (action === 'wait') return
  if (action === 'cancel-sell') {
    try {
      await cancelLendDeal(row.lend_deal_id)
    } catch (err) {
      const again = await readDeal(row.lend_deal_id).catch(() => null)
      if (!again || again.status !== 5) {
        console.log(`cancel skipped ${row.id}: ${note(err)}`)
        return
      }
    }
  }
  await sellUnclaimedWin(row)
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

async function owned(status: string, scope: PackWorker): Promise<PullRow[]> {
  const rows = await listPulls(status)
  return rows.filter((row) => workerOwnsPack(row.machine_code, scope))
}

async function tick(scope: PackWorker): Promise<void> {
  const confirmed = await owned('PAYMENT_CONFIRMED', scope)
  if (confirmed[0]) {
    await openConfirmed(confirmed[0])
    return
  }
  if (scope === 'capsule') {
    for (const row of await owned('AWAITING_CHOICE', scope)) {
      const expired = expireChoice(toDomain(row), Date.now())
      if (expired.ok && expired.applied) await save(row.status, expired.order)
    }
    for (const row of await owned('BUYBACK_CONFIRMED', scope)) await sell(row)
    for (const row of await owned('DOUBLE_WON', scope)) {
      const queued = queueDoublePayout(toDomain(row))
      if (queued.ok && queued.applied) await save(row.status, queued.order)
    }
    for (const row of await owned('DOUBLE_LOST', scope)) await listDeal(row)
    for (const row of await owned('LEND_QUEUED', scope)) await listDeal(row)
  }
  for (const row of await owned('PAYOUT_FAILED', scope)) {
    const again = retryPayout(toDomain(row))
    if (again.ok && again.applied) await save(row.status, again.order)
  }
  for (const row of await owned('PAYOUT_PENDING', scope)) {
    const domain = toDomain(row)
    const amount = domain.choice === 'DOUBLE' && domain.draw === 'WIN' && domain.buybackQuote
      ? domain.buybackQuote * BigInt(2)
      : domain.actualRefund
    if (amount == null) continue
    await payRow(row, amount)
  }
  for (const row of await owned('OPENING_FAILED', scope)) {
    const refund = requestRefund(toDomain(row))
    if (refund.ok && refund.applied) await save(row.status, refund.order)
  }
  for (const row of await owned('REFUND_PENDING', scope)) await refundRow(row)
  if (scope !== 'capsule') return
  for (const row of await owned('LEND_LISTED', scope)) await maintainDeal(row)
  for (const row of await listUnsoldWins()) {
    if (!workerOwnsPack(row.machine_code, scope)) continue
    if (row.lend_deal_id) await expireUnclaimedWin(row)
    else await listWin(row)
  }
  for (const row of await listCollateral('REQUESTED')) await pledgeCollateral(row)
  for (const row of await listCollateral('LISTED')) await maintainCollateral(row)
}

async function pledgeCollateral(row: CollateralRow): Promise<void> {
  if (row.mint === HELD_JOLTEON || (await mintAlreadyOpened(row.mint))) {
    await saveCollateral(row.id, { status: 'REJECTED', error: 'This card is already held by an open' })
    return
  }
  let held = false
  try {
    held = await vaultHoldsMint(row.mint)
  } catch {
    return
  }
  if (!held) {
    if (row.error !== 'The card is not in the vault yet') {
      await saveCollateral(row.id, { error: 'The card is not in the vault yet' })
    }
    return
  }
  const owner = row.owner
  const principal = BigInt(row.principal_raw)
  let dealId = dealIdFor(row.id)
  try {
    dealId = await createLendDeal(row.id, owner, principal)
  } catch (err) {
    const existing = await readDeal(dealId).catch(() => null)
    if (!existing || existing.status === 0) {
      await saveCollateral(row.id, { error: note(err) })
      return
    }
  }
  await saveCollateral(row.id, { status: 'LISTED', deal_id: dealId, error: null })
  console.log(`pledged ${row.id}`)
}

async function maintainCollateral(row: CollateralRow): Promise<void> {
  if (!row.deal_id || row.mint === HELD_JOLTEON) return
  const deal = await readDeal(row.deal_id).catch(() => null)
  if (!deal || deal.status !== 4 || !row.solana_address || row.nft_send_sig) return
  try {
    const sent = await botJson('src/send-nft.ts', row.mint, row.solana_address)
    const signature = typeof sent.signature === 'string' ? sent.signature : ''
    if (!signature) throw new Error('NFT send did not return a signature')
    await saveCollateral(row.id, { nft_send_sig: signature, error: null })
    console.log(`sent pledged nft ${row.id}`)
  } catch (err) {
    await saveCollateral(row.id, { error: note(err) })
  }
}

async function runScoped(scope: PackWorker): Promise<void> {
  for (const row of await owned('OPENING', scope)) {
    const review = markManualReview(toDomain(row), 'Open was interrupted before the card was saved')
    if (review.ok) await save(row.status, review.order)
  }
  console.log(scope === 'ripcars' ? 'ripcars worker running' : 'capsule worker running')
  for (;;) {
    try {
      if (scope === 'ripcars') await beatWorker(Date.now(), RIPCARS_WORKER_ID)
      else await beatWorker(Date.now())
      await tick(scope)
    } catch (err) {
      console.log(note(err))
    }
    await sleep(8000)
  }
}

export function runWorker(): Promise<void> {
  return runScoped('capsule')
}

export function runRipCarsWorker(): Promise<void> {
  return runScoped('ripcars')
}
