import { solanaAddress } from '@/lib/gacha/solana-address'
import { parseUnits } from '@/lib/gacha/units'

export const COLLATERAL_MIN_USD = 1
export const COLLATERAL_MAX_USD = 500

export function collateralMessage(mint: string, principalRaw: string): string {
  return `Capsule collateral\n${mint}\n${principalRaw}`
}

export function parseCollateral(mint: string, principal: string): { mint: string; raw: bigint } | null {
  const address = solanaAddress(mint.trim())
  if (!address) return null
  if (!/^\d+(\.\d{1,2})?$/.test(principal.trim())) return null
  const amount = Number(principal.trim())
  if (!Number.isFinite(amount) || amount < COLLATERAL_MIN_USD || amount > COLLATERAL_MAX_USD) return null
  const raw = parseUnits(amount)
  if (raw == null) return null
  return { mint: address, raw }
}
