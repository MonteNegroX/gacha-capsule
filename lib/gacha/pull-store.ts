import { randomBytes } from 'node:crypto'
import { WIN_UNFUNDED_MS, type CapsuleOrder, type Choice, type ChoiceSource, type DrawResult, type OrderStatus } from '@/lib/capsule/order'
import { prisma } from '@/lib/prisma'
import { doubleOffered } from '@/lib/gacha/pack-access'
import { formatUnits } from '@/lib/gacha/units'

export type PullRow = {
  id: string
  status: string
  payer: string
  machine_code: string
  price_raw: string
  paid_raw: string
  payment_hash: string
  buyback_pct: number
  memo: string | null
  nft_address: string | null
  card_name: string | null
  rarity: string | null
  image_url: string | null
  insured_usd: string | null
  buyback_raw: string | null
  actual_refund_raw: string | null
  choice: string | null
  choice_source: string | null
  draw: string | null
  roll: number | null
  buyback_signature: string | null
  payout_hash: string | null
  refund_hash: string | null
  lend_deal_id: string | null
  solana_address: string | null
  nft_send_sig: string | null
  opened_at_ms: string | null
  choice_deadline_ms: string | null
  listed_at_ms: string | null
  error: string | null
}

export type PublicPull = {
  id: string
  status: string
  payer: string
  machineCode: string
  priceUsd: string
  paidUsd: string
  paymentHash: string
  cardName: string | null
  rarity: string | null
  imageUrl: string | null
  insuredUsd: string | null
  buybackUsd: string | null
  doubleOffered: boolean
  choice: string | null
  draw: string | null
  payoutUsd: string | null
  payoutHash: string | null
  refundHash: string | null
  choiceDeadline: string | null
  lendDealId: string | null
  solanaAddress: string | null
  nftAddress: string | null
  error: string | null
}

export type ListedDeal = {
  orderId: string
  dealId: string
  name: string
  imageUrl: string | null
  rarity: string
  principalRaw: string
  nftAddress: string
  unfundedClosesAt: string | null
}

const ORDER_TABLE = `
CREATE TABLE IF NOT EXISTS pull_order (
  id text PRIMARY KEY,
  status text NOT NULL,
  payer text NOT NULL,
  machine_code text NOT NULL,
  price_raw text NOT NULL,
  paid_raw text NOT NULL,
  payment_hash text NOT NULL UNIQUE,
  buyback_pct integer NOT NULL,
  memo text,
  nft_address text,
  card_name text,
  rarity text,
  image_url text,
  insured_usd text,
  buyback_raw text,
  actual_refund_raw text,
  choice text,
  choice_source text,
  draw text,
  roll integer,
  buyback_signature text,
  payout_hash text,
  refund_hash text,
  lend_deal_id text,
  solana_address text,
  nft_send_sig text,
  opened_at_ms text,
  choice_deadline_ms text,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
)`

const WORKER_TABLE = `
CREATE TABLE IF NOT EXISTS pull_worker (
  id text PRIMARY KEY,
  beat_ms text NOT NULL
)`

let ready: Promise<void> | null = null

export function ensurePullStore(): Promise<void> {
  if (!ready) {
    ready = prisma.$executeRawUnsafe(ORDER_TABLE)
      .then(() => prisma.$executeRawUnsafe(WORKER_TABLE))
      .then(() => prisma.$executeRawUnsafe('ALTER TABLE pull_order ADD COLUMN IF NOT EXISTS listed_at_ms text'))
      .then(() => undefined)
      .catch((err: unknown) => {
      ready = null
      throw err
    })
  }
  return ready
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null
}

function num(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'bigint') return Number(value)
  if (typeof value === 'string' && /^-?\d+$/.test(value)) return Number(value)
  return null
}

function rowFrom(value: unknown): PullRow | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as Record<string, unknown>
  const id = text(raw.id)
  const status = text(raw.status)
  const payer = text(raw.payer)
  const machine = text(raw.machine_code)
  const price = text(raw.price_raw)
  const paid = text(raw.paid_raw)
  const hash = text(raw.payment_hash)
  if (!id || !status || !payer || !machine || !price || !paid || !hash) return null
  return {
    id,
    status,
    payer,
    machine_code: machine,
    price_raw: price,
    paid_raw: paid,
    payment_hash: hash,
    buyback_pct: num(raw.buyback_pct) ?? 0,
    memo: text(raw.memo),
    nft_address: text(raw.nft_address),
    card_name: text(raw.card_name),
    rarity: text(raw.rarity),
    image_url: text(raw.image_url),
    insured_usd: text(raw.insured_usd),
    buyback_raw: text(raw.buyback_raw),
    actual_refund_raw: text(raw.actual_refund_raw),
    choice: text(raw.choice),
    choice_source: text(raw.choice_source),
    draw: text(raw.draw),
    roll: num(raw.roll),
    buyback_signature: text(raw.buyback_signature),
    payout_hash: text(raw.payout_hash),
    refund_hash: text(raw.refund_hash),
    lend_deal_id: text(raw.lend_deal_id),
    solana_address: text(raw.solana_address),
    nft_send_sig: text(raw.nft_send_sig),
    opened_at_ms: text(raw.opened_at_ms),
    choice_deadline_ms: text(raw.choice_deadline_ms),
    listed_at_ms: text(raw.listed_at_ms),
    error: text(raw.error),
  }
}

export function toDomain(row: PullRow): CapsuleOrder {
  const asStatus = row.status as OrderStatus
  return {
    id: row.id,
    status: asStatus,
    chainId: 4663,
    token: '0x5fc5360d0400a0fd4f2af552add042d716f1d168',
    payer: row.payer,
    machineCode: row.machine_code,
    memo: row.memo ?? row.payment_hash,
    packPrice: BigInt(row.price_raw),
    paymentHash: row.payment_hash,
    nftAddress: row.nft_address,
    cardName: row.card_name,
    rarity: row.rarity,
    buybackQuote: row.buyback_raw ? BigInt(row.buyback_raw) : null,
    actualRefund: row.actual_refund_raw ? BigInt(row.actual_refund_raw) : null,
    choice: row.choice === 'BUYBACK' || row.choice === 'DOUBLE' ? row.choice : null,
    choiceSource: row.choice_source === 'PLAYER' || row.choice_source === 'TIMEOUT' ? row.choice_source : null,
    draw: row.draw === 'WIN' || row.draw === 'LOSS' ? row.draw : null,
    buybackSignature: row.buyback_signature,
    payoutHash: row.payout_hash,
    refundHash: row.refund_hash,
    lendDealId: row.lend_deal_id,
    openedAtMs: row.opened_at_ms ? Number(row.opened_at_ms) : null,
    choiceDeadlineMs: row.choice_deadline_ms ? Number(row.choice_deadline_ms) : null,
    error: row.error,
  }
}

export function publicPull(row: PullRow): PublicPull {
  const quote = row.buyback_raw ? BigInt(row.buyback_raw) : null
  const payout = row.status === 'PAID_OUT' || row.status === 'PAYOUT_PENDING' || row.status === 'PAYOUT_FAILED'
    ? row.choice === 'DOUBLE' && row.draw === 'WIN' && quote != null
      ? quote * BigInt(2)
      : row.choice === 'BUYBACK' && row.actual_refund_raw
        ? BigInt(row.actual_refund_raw)
        : null
    : null
  const deadline = row.choice_deadline_ms ? new Date(Number(row.choice_deadline_ms)).toISOString() : null
  return {
    id: row.id,
    status: row.status,
    payer: row.payer,
    machineCode: row.machine_code,
    priceUsd: formatUnits(BigInt(row.price_raw)),
    paidUsd: formatUnits(BigInt(row.paid_raw)),
    paymentHash: row.payment_hash,
    cardName: row.card_name,
    rarity: row.rarity,
    imageUrl: row.image_url?.startsWith('https://') ? row.image_url : null,
    insuredUsd: row.insured_usd,
    buybackUsd: quote != null ? formatUnits(quote) : null,
    doubleOffered: doubleOffered(row.rarity),
    choice: row.choice,
    draw: row.draw,
    payoutUsd: payout != null ? formatUnits(payout) : null,
    payoutHash: row.payout_hash,
    refundHash: row.refund_hash,
    choiceDeadline: deadline,
    lendDealId: row.lend_deal_id,
    solanaAddress: row.solana_address,
    nftAddress: row.nft_address,
    error: row.error,
  }
}

async function one(query: Promise<unknown[]>): Promise<PullRow | null> {
  const rows = await query
  return rowFrom(rows[0])
}

export async function findPullByHash(paymentHash: string): Promise<PullRow | null> {
  await ensurePullStore()
  return one(prisma.$queryRaw<unknown[]>`
    SELECT * FROM pull_order WHERE payment_hash = ${paymentHash.toLowerCase()} LIMIT 1
  `)
}

export async function findPullById(id: string): Promise<PullRow | null> {
  await ensurePullStore()
  return one(prisma.$queryRaw<unknown[]>`
    SELECT * FROM pull_order WHERE id = ${id} LIMIT 1
  `)
}

export async function listPulls(status: string): Promise<PullRow[]> {
  await ensurePullStore()
  const rows = await prisma.$queryRaw<unknown[]>`
    SELECT * FROM pull_order WHERE status = ${status} ORDER BY created_at ASC
  `
  return rows.flatMap((item) => {
    const row = rowFrom(item)
    return row ? [row] : []
  })
}

function listedDeal(row: PullRow): ListedDeal | null {
  if (!row.lend_deal_id || !row.buyback_raw || !row.nft_address || !row.card_name) return null
  if (!/^0x[a-fA-F0-9]{64}$/.test(row.lend_deal_id)) return null
  const listedAt = row.listed_at_ms && /^\d+$/.test(row.listed_at_ms) ? Number(row.listed_at_ms) : null
  const unfundedClosesAt = row.choice === 'DOUBLE' && row.draw === 'WIN' && listedAt != null
    ? new Date(listedAt + WIN_UNFUNDED_MS).toISOString()
    : null
  return {
    orderId: row.id,
    dealId: row.lend_deal_id,
    name: row.card_name,
    imageUrl: row.image_url?.startsWith('https://') ? row.image_url : null,
    rarity: row.rarity ?? 'Unknown',
    principalRaw: row.buyback_raw,
    nftAddress: row.nft_address,
    unfundedClosesAt,
  }
}

export async function listListedDeals(): Promise<ListedDeal[]> {
  await ensurePullStore()
  const rows = await prisma.$queryRaw<unknown[]>`
    SELECT * FROM pull_order
    WHERE status = 'LEND_LISTED'
       OR (choice = 'DOUBLE' AND draw = 'WIN' AND lend_deal_id IS NOT NULL AND buyback_signature IS NULL)
    ORDER BY created_at ASC
  `
  return rows.flatMap((item) => {
    const row = rowFrom(item)
    const deal = row ? listedDeal(row) : null
    return deal ? [deal] : []
  })
}

export async function listUnsoldWins(): Promise<PullRow[]> {
  await ensurePullStore()
  const rows = await prisma.$queryRaw<unknown[]>`
    SELECT * FROM pull_order
    WHERE choice = 'DOUBLE' AND draw = 'WIN' AND buyback_signature IS NULL AND nft_address IS NOT NULL
    ORDER BY created_at ASC
  `
  return rows.flatMap((item) => {
    const row = rowFrom(item)
    return row ? [row] : []
  })
}

export async function insertPull(input: {
  payer: string
  machineCode: string
  priceRaw: bigint
  paidRaw: bigint
  paymentHash: string
  buybackPct: number
  status: 'PAYMENT_CONFIRMED' | 'REFUND_PENDING'
  error: string | null
}): Promise<{ row: PullRow; replay: boolean }> {
  await ensurePullStore()
  const hash = input.paymentHash.toLowerCase()
  const existing = await findPullByHash(hash)
  if (existing) return { row: existing, replay: true }
  const id = `ord_${randomBytes(8).toString('hex')}`
  try {
    await prisma.$executeRaw`
      INSERT INTO pull_order (
        id, status, payer, machine_code, price_raw, paid_raw, payment_hash, buyback_pct, memo, error
      ) VALUES (
        ${id},
        ${input.status},
        ${input.payer.toLowerCase()},
        ${input.machineCode},
        ${input.priceRaw.toString()},
        ${input.paidRaw.toString()},
        ${hash},
        ${input.buybackPct},
        ${hash},
        ${input.error}
      )
    `
  } catch {
    const raced = await findPullByHash(hash)
    if (raced) return { row: raced, replay: true }
    throw new Error('Order was not stored')
  }
  const row = await findPullById(id)
  if (!row) throw new Error('Order was not stored')
  return { row, replay: false }
}

export async function writeDomain(previous: string, order: CapsuleOrder, extra: Partial<PullRow> = {}): Promise<PullRow | null> {
  await ensurePullStore()
  const current = await findPullById(order.id)
  if (!current || current.status !== previous) return current
  const next: PullRow = {
    ...current,
    ...extra,
    status: order.status,
    payer: order.payer,
    machine_code: order.machineCode,
    memo: order.memo,
    nft_address: order.nftAddress,
    card_name: order.cardName,
    rarity: order.rarity,
    buyback_raw: order.buybackQuote?.toString() ?? null,
    actual_refund_raw: order.actualRefund?.toString() ?? null,
    choice: order.choice,
    choice_source: order.choiceSource,
    draw: order.draw,
    buyback_signature: order.buybackSignature,
    payout_hash: order.payoutHash,
    refund_hash: order.refundHash,
    lend_deal_id: order.lendDealId,
    opened_at_ms: order.openedAtMs == null ? null : String(order.openedAtMs),
    choice_deadline_ms: order.choiceDeadlineMs == null ? null : String(order.choiceDeadlineMs),
    listed_at_ms: extra.listed_at_ms ?? current.listed_at_ms,
    error: order.error,
  }
  const changed = await prisma.$executeRaw`
    UPDATE pull_order SET
      status = ${next.status},
      memo = ${next.memo},
      nft_address = ${next.nft_address},
      card_name = ${next.card_name},
      rarity = ${next.rarity},
      image_url = ${next.image_url},
      insured_usd = ${next.insured_usd},
      buyback_raw = ${next.buyback_raw},
      actual_refund_raw = ${next.actual_refund_raw},
      choice = ${next.choice},
      choice_source = ${next.choice_source},
      draw = ${next.draw},
      roll = ${next.roll},
      buyback_signature = ${next.buyback_signature},
      payout_hash = ${next.payout_hash},
      refund_hash = ${next.refund_hash},
      lend_deal_id = ${next.lend_deal_id},
      solana_address = ${next.solana_address},
      nft_send_sig = ${next.nft_send_sig},
      opened_at_ms = ${next.opened_at_ms},
      choice_deadline_ms = ${next.choice_deadline_ms},
      listed_at_ms = ${next.listed_at_ms},
      error = ${next.error},
      updated_at = now()
    WHERE id = ${next.id} AND status = ${previous}
  `
  if (changed === 0) return findPullById(order.id)
  return next
}

export async function setSolanaAddress(id: string, address: string): Promise<PullRow | null> {
  await ensurePullStore()
  const changed = await prisma.$executeRaw`
    UPDATE pull_order
    SET solana_address = ${address}, updated_at = now()
    WHERE id = ${id}
      AND solana_address IS NULL
      AND lend_deal_id IS NOT NULL
      AND (status = 'LEND_LISTED' OR (choice = 'DOUBLE' AND draw = 'WIN'))
  `
  if (changed === 0) return findPullById(id)
  return findPullById(id)
}

export async function beatWorker(nowMs: number): Promise<void> {
  await ensurePullStore()
  const beat = String(nowMs)
  await prisma.$executeRaw`
    INSERT INTO pull_worker (id, beat_ms) VALUES ('robinhood', ${beat})
    ON CONFLICT (id) DO UPDATE SET beat_ms = ${beat}
  `
}

export async function workerFresh(nowMs: number, windowMs = 120_000): Promise<boolean> {
  await ensurePullStore()
  const rows = await prisma.$queryRaw<Array<{ beat_ms: string }>>`
    SELECT beat_ms FROM pull_worker WHERE id = 'robinhood' LIMIT 1
  `
  const beat = rows[0]?.beat_ms
  if (!beat || !/^\d+$/.test(beat)) return false
  return nowMs - Number(beat) <= windowMs
}

export type { Choice, ChoiceSource, DrawResult }
