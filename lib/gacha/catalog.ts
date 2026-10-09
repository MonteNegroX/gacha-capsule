import type { GachaMachine, Rarity, TierRange } from '@/lib/gacha/types'

const API = 'https://gacha.collectorcrypt.com'
const RARITIES: Rarity[] = ['common', 'uncommon', 'rare', 'epic']

function assetUrl(url: unknown): string | null {
  if (typeof url !== 'string' || url.length === 0) return null
  if (url.startsWith('https://')) return url
  if (url.startsWith('/')) return `${API}${url}`
  return null
}

function num(value: unknown, fallback = 0): number {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : fallback
}

function range(value: unknown): TierRange {
  const row = value && typeof value === 'object' ? (value as { start?: unknown; end?: unknown }) : {}
  return { start: num(row.start), end: num(row.end) }
}

function normalize(raw: Record<string, unknown>): GachaMachine | null {
  const code = typeof raw.code === 'string' ? raw.code : ''
  if (!/^[a-z0-9_]+$/.test(code) || raw.public !== true) return null
  const namedCategory = typeof raw.menuCategory === 'string' ? raw.menuCategory.trim() : ''
  const category = namedCategory || 'Other'
  if (category === 'Watch') return null

  const oddsRaw = (raw.odds ?? {}) as Record<string, unknown>
  const rangesRaw = (raw.tierRanges ?? {}) as Record<string, unknown>
  const stockRaw = (raw.stock ?? {}) as Record<string, unknown>
  const odds = {} as Record<Rarity, number>
  const tierRanges = {} as Record<Rarity, TierRange>
  const stock = {} as Record<Rarity, number>
  for (const rarity of RARITIES) {
    odds[rarity] = num(oddsRaw[rarity])
    tierRanges[rarity] = range(rangesRaw[rarity])
    stock[rarity] = num(stockRaw[rarity])
  }

  return {
    code,
    name: typeof raw.name === 'string' ? raw.name : code,
    category,
    menuOrder: num(raw.menuOrder, 999),
    price: num(raw.price),
    ev: num(raw.ev),
    instantBuyback: num(raw.instantBuyback),
    turboMode: raw.turboMode === true,
    odds,
    tierRanges,
    stock,
    imageUrl: assetUrl(raw.imageNobg) ?? assetUrl(raw.thumbnailUrl),
  }
}

export async function loadPublicMachines(): Promise<GachaMachine[]> {
  const res = await fetch(`${API}/api/machines`, {
    headers: {
      accept: 'application/json',
      'user-agent': 'CapsuleLab/1.0',
    },
    next: { revalidate: 60 },
  })
  if (!res.ok) throw new Error(`Collector Crypt machines returned ${res.status}`)
  const body = (await res.json()) as { machines?: Record<string, unknown>[] }
  const rows = Array.isArray(body.machines) ? body.machines : []
  return rows
    .map(normalize)
    .filter((machine): machine is GachaMachine => machine !== null && machine.price > 0)
    .sort((a, b) => a.menuOrder - b.menuOrder)
}

export function findMachine(machines: GachaMachine[], code: string): GachaMachine | undefined {
  return machines.find((machine) => machine.code === code)
}
