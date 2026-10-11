export const OPEN_PRICE_CEILING_USD = 25

export function packOpenable(price: number): boolean {
  return Number.isFinite(price) && price > 0 && price <= OPEN_PRICE_CEILING_USD
}

export function doubleOffered(rarity: string | null | undefined): boolean {
  return (rarity ?? '').trim().toLowerCase() === 'common'
}

export type PaymentGate = 'queue' | 'refund' | 'ignore'

export function gatePayment(priceUsd: number, paidRaw: bigint | null, openable: boolean): PaymentGate {
  if (paidRaw == null || paidRaw <= BigInt(0)) return 'ignore'
  if (!Number.isFinite(priceUsd) || priceUsd <= 0) return 'refund'
  const [whole, frac = ''] = priceUsd.toFixed(6).split('.')
  const priceRaw = BigInt(`${whole}${frac.padEnd(6, '0')}`)
  if (!openable || paidRaw !== priceRaw) return 'refund'
  return 'queue'
}
