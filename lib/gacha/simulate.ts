import { randomInt } from 'node:crypto'
import type { GachaMachine, Rarity, SpinResult } from '@/lib/gacha/types'

const RARITIES: Rarity[] = ['common', 'uncommon', 'rare', 'epic']

function rollRarity(machine: GachaMachine): Rarity {
  const ticket = randomInt(0, 1_000_000) / 1_000_000
  let cursor = 0
  for (const rarity of RARITIES) {
    cursor += machine.odds[rarity] ?? 0
    if (ticket < cursor) return rarity
  }
  return 'common'
}

/** Test spin. Uses the machine's published odds. Insured value is the floor of that tier, so the buyback is readable and no vault card is chosen. */
export function simulatePull(machine: GachaMachine, turbo: boolean): SpinResult {
  const rarity = rollRarity(machine)
  const insuredValue = machine.tierRanges[rarity]?.start ?? machine.price
  const buybackAmount = Math.round(insuredValue * machine.instantBuyback) / 100
  return {
    mode: 'test',
    packType: machine.code,
    rarity,
    nftName: 'Test pull',
    insuredValue,
    buybackAmount,
    buybackPct: machine.instantBuyback,
    turboBuyback: turbo && machine.turboMode && rarity === 'common',
  }
}
