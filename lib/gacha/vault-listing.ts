import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import committed from './vault-card.json'

export type VaultListing = {
  name: string
  imageUrl: string
  rarity: string
  grade: string
  insuredUsd: number
  capUsd: number
  fundedUsd: number
  capRaw: string
  fundedRaw: string
  nftAddress: string
  vault: string
  treasury: string
  status: 'LISTING'
  termDays: number
}

const USDG_SCALE = 1_000_000

function usd(minor: unknown): number | null {
  if (typeof minor !== 'string' || !/^\d+$/.test(minor)) return null
  return Number(BigInt(minor)) / USDG_SCALE
}

type ListingFile = {
  card?: { name?: unknown; imageUrl?: unknown; rarity?: unknown; grade?: unknown; insuredUsd?: unknown }
  vault?: unknown
  treasury?: unknown
  deal?: { status?: unknown; cap?: unknown; funded?: unknown; nftAddress?: unknown }
}

function readListing(raw: ListingFile): VaultListing | null {
  const capRaw = raw.deal?.cap
  const fundedRaw = raw.deal?.funded
  const capUsd = usd(capRaw)
  const fundedUsd = usd(fundedRaw)
  const name = raw.card?.name
  const imageUrl = raw.card?.imageUrl
  const nftAddress = raw.deal?.nftAddress
  const vault = raw.vault
  const treasury = typeof raw.treasury === 'string' ? raw.treasury : ''
  if (raw.deal?.status !== 'LISTING' || capUsd == null || fundedUsd == null) return null
  if (typeof capRaw !== 'string' || typeof fundedRaw !== 'string') return null
  if (typeof name !== 'string' || typeof imageUrl !== 'string' || !imageUrl.startsWith('https://')) return null
  if (typeof nftAddress !== 'string' || typeof vault !== 'string') return null
  if (!/^0x[a-fA-F0-9]{40}$/.test(treasury) || /^0x0{40}$/i.test(treasury)) return null
  if (typeof raw.card?.insuredUsd !== 'number') return null
  return {
    name,
    imageUrl,
    rarity: typeof raw.card.rarity === 'string' ? raw.card.rarity : 'Common',
    grade: typeof raw.card.grade === 'string' ? raw.card.grade : '',
    insuredUsd: raw.card.insuredUsd,
    capUsd,
    fundedUsd,
    capRaw,
    fundedRaw,
    nftAddress,
    vault,
    treasury,
    status: 'LISTING',
    termDays: 7,
  }
}

export function loadVaultListing(): VaultListing | null {
  const path = join(process.cwd(), 'data', 'lend-listing.json')
  if (existsSync(path)) {
    try {
      return readListing(JSON.parse(readFileSync(path, 'utf8')) as ListingFile)
    } catch {
      return null
    }
  }
  return readListing(committed)
}
