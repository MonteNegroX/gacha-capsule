import { prisma } from '@/lib/prisma'
import { readDeal } from '@/lib/gacha/lend-read'
import { usdgBalance } from '@/lib/gacha/public-balances'
import { ensurePullStore, listListedDeals, listPledgedDeals } from '@/lib/gacha/pull-store'
import { vaultUsdcRaw } from '@/lib/gacha/vault-stock'
import { treasuryAddress } from '@/lib/gacha/verify-payment'

export type RecentOpen = {
  id: string
  card: string
  rarity: string
  insured: string | null
  buybackRaw: string | null
  choice: string | null
  draw: string | null
  status: string
  at: string
}

export type ProtocolStats = {
  opens: number
  buybacks: number
  wins: number
  losses: number
  volumeRaw: string
  paidRaw: string
  cardQuoteRaw: string
  vaultUsdcRaw: string | null
  treasuryUsdgRaw: string | null
  fundedRaw: string
  fundingRaw: string
  recent: RecentOpen[]
}

export type PlayerOrder = RecentOpen & { payoutRaw: string | null }

export type PlayerHistory = {
  address: string
  opens: number
  wins: number
  losses: number
  spentRaw: string
  receivedRaw: string
  orders: PlayerOrder[]
}

function count(value: unknown): number {
  const text = typeof value === 'bigint' ? value.toString() : typeof value === 'number' ? String(value) : typeof value === 'string' ? value : '0'
  const whole = text.split('.')[0]
  return /^\d+$/.test(whole) ? Number(whole) : 0
}

function raw(value: unknown): string {
  const text = typeof value === 'bigint' ? value.toString() : typeof value === 'number' ? String(Math.trunc(value)) : typeof value === 'string' ? value : '0'
  const whole = text.split('.')[0]
  return /^-?\d+$/.test(whole) ? whole : '0'
}

function stamp(value: unknown): string {
  if (value instanceof Date) return value.toISOString()
  return typeof value === 'string' ? value : ''
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null
}

function recent(row: Record<string, unknown>): RecentOpen {
  return {
    id: text(row.id) ?? '',
    card: text(row.card_name) ?? 'Unnamed card',
    rarity: text(row.rarity) ?? 'Unknown',
    insured: text(row.insured_usd),
    buybackRaw: text(row.buyback_raw),
    choice: text(row.choice),
    draw: text(row.draw),
    status: text(row.status) ?? '',
    at: stamp(row.created_at),
  }
}

export async function loadProtocolStats(): Promise<ProtocolStats> {
  await ensurePullStore()
  const totals = await prisma.$queryRaw<Record<string, unknown>[]>`
    SELECT
      count(*) FILTER (WHERE card_name IS NOT NULL)::text AS opens,
      count(*) FILTER (WHERE choice = 'BUYBACK')::text AS buybacks,
      count(*) FILTER (WHERE choice = 'DOUBLE' AND draw = 'WIN')::text AS wins,
      count(*) FILTER (WHERE choice = 'DOUBLE' AND draw = 'LOSS')::text AS losses,
      coalesce(sum(paid_raw::numeric) FILTER (WHERE card_name IS NOT NULL AND status NOT IN ('REFUNDED', 'REFUND_PENDING')), 0)::text AS volume_raw,
      coalesce(sum(
        CASE
          WHEN status = 'PAID_OUT' AND choice = 'DOUBLE' AND draw = 'WIN' AND buyback_raw ~ '^[0-9]+$' THEN buyback_raw::numeric * 2
          WHEN status = 'PAID_OUT' AND choice = 'BUYBACK' AND actual_refund_raw ~ '^[0-9]+$' THEN actual_refund_raw::numeric
          ELSE 0
        END
      ), 0)::text AS paid_raw,
      coalesce(sum(buyback_raw::numeric) FILTER (
        WHERE nft_address IS NOT NULL AND buyback_signature IS NULL AND buyback_raw ~ '^[0-9]+$'
      ), 0)::text AS quote_raw
    FROM pull_order
  `
  const rows = await prisma.$queryRaw<Record<string, unknown>[]>`
    SELECT id, card_name, rarity, insured_usd, buyback_raw, choice, draw, status, created_at
    FROM pull_order
    WHERE card_name IS NOT NULL
    ORDER BY created_at DESC
    LIMIT 12
  `
  const total = totals[0] ?? {}
  let vaultUsdcRaw: string | null = null
  let treasuryUsdgRaw: string | null = null
  try {
    vaultUsdcRaw = (await vaultUsdcRawFn()).toString()
  } catch {
    vaultUsdcRaw = null
  }
  const treasury = treasuryAddress()
  if (treasury) {
    try {
      treasuryUsdgRaw = (await usdgBalance(treasury)).toString()
    } catch {
      treasuryUsdgRaw = null
    }
  }
  let funded = BigInt(0)
  let funding = BigInt(0)
  const listed = [...(await listListedDeals().catch(() => [])), ...(await listPledgedDeals().catch(() => []))]
  const seen = new Set<string>()
  for (const deal of listed) {
    if (seen.has(deal.dealId)) continue
    seen.add(deal.dealId)
    const chain = await readDeal(deal.dealId).catch(() => null)
    const principal = /^[0-9]+$/.test(deal.principalRaw) ? BigInt(deal.principalRaw) : BigInt(0)
    if (chain?.status === 2) funded += principal
    if (chain?.status === 1) funding += principal
  }
  return {
    opens: count(total.opens),
    buybacks: count(total.buybacks),
    wins: count(total.wins),
    losses: count(total.losses),
    volumeRaw: raw(total.volume_raw),
    paidRaw: raw(total.paid_raw),
    cardQuoteRaw: raw(total.quote_raw),
    vaultUsdcRaw,
    treasuryUsdgRaw,
    fundedRaw: funded.toString(),
    fundingRaw: funding.toString(),
    recent: rows.map(recent),
  }
}

async function vaultUsdcRawFn(): Promise<bigint> {
  return vaultUsdcRaw()
}

export async function loadPlayerHistory(address: string): Promise<PlayerHistory> {
  await ensurePullStore()
  const payer = address.toLowerCase()
  const totals = await prisma.$queryRaw<Record<string, unknown>[]>`
    SELECT
      count(*) FILTER (WHERE card_name IS NOT NULL)::text AS opens,
      count(*) FILTER (WHERE choice = 'DOUBLE' AND draw = 'WIN')::text AS wins,
      count(*) FILTER (WHERE choice = 'DOUBLE' AND draw = 'LOSS')::text AS losses,
      coalesce(sum(paid_raw::numeric) FILTER (WHERE card_name IS NOT NULL AND status NOT IN ('REFUNDED', 'REFUND_PENDING')), 0)::text AS spent_raw,
      coalesce(sum(
        CASE
          WHEN status = 'PAID_OUT' AND choice = 'DOUBLE' AND draw = 'WIN' AND buyback_raw ~ '^[0-9]+$' THEN buyback_raw::numeric * 2
          WHEN status = 'PAID_OUT' AND choice = 'BUYBACK' AND actual_refund_raw ~ '^[0-9]+$' THEN actual_refund_raw::numeric
          ELSE 0
        END
      ), 0)::text AS received_raw
    FROM pull_order
    WHERE payer = ${payer}
  `
  const rows = await prisma.$queryRaw<Record<string, unknown>[]>`
    SELECT id, card_name, rarity, insured_usd, buyback_raw, choice, draw, status, created_at,
      CASE
        WHEN status = 'PAID_OUT' AND choice = 'DOUBLE' AND draw = 'WIN' AND buyback_raw ~ '^[0-9]+$' THEN (buyback_raw::numeric * 2)::text
        WHEN status = 'PAID_OUT' AND choice = 'BUYBACK' AND actual_refund_raw ~ '^[0-9]+$' THEN actual_refund_raw
        ELSE NULL
      END AS payout_raw
    FROM pull_order
    WHERE payer = ${payer}
    ORDER BY created_at DESC
    LIMIT 50
  `
  const total = totals[0] ?? {}
  return {
    address: payer,
    opens: count(total.opens),
    wins: count(total.wins),
    losses: count(total.losses),
    spentRaw: raw(total.spent_raw),
    receivedRaw: raw(total.received_raw),
    orders: rows.map((row) => ({ ...recent(row), payoutRaw: text(row.payout_raw) })),
  }
}
