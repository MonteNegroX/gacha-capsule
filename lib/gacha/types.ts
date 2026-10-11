export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic'

export type TierRange = {
  start: number
  end: number
}

export type GachaMachine = {
  code: string
  name: string
  category: string
  menuOrder: number
  price: number
  ev: number
  instantBuyback: number
  turboMode: boolean
  odds: Record<Rarity, number>
  tierRanges: Record<Rarity, TierRange>
  stock: Record<Rarity, number>
  imageUrl: string | null
}

export type SpinResult = {
  mode: 'test' | 'live'
  packType: string
  rarity: string
  nftName: string
  insuredValue: number | null
  buybackAmount: number | null
  buybackPct: number
  turboBuyback: boolean
  memo?: string | null
  nftAddress?: string | null
  imageUrl?: string | null
}
