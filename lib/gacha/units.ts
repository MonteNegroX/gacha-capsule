const SCALE = BigInt('1000000')

export function formatUnits(raw: bigint): string {
  const negative = raw < BigInt(0)
  const value = negative ? -raw : raw
  const whole = value / SCALE
  const frac = (value % SCALE).toString().padStart(6, '0').replace(/0+$/, '')
  const text = frac ? `${whole.toString()}.${frac}` : whole.toString()
  return negative ? `-${text}` : text
}

export function parseUnits(amount: number): bigint | null {
  if (!Number.isFinite(amount) || amount <= 0) return null
  const [whole, frac = ''] = amount.toFixed(6).split('.')
  if (whole.length > 12) return null
  return BigInt(`${whole}${frac.padEnd(6, '0')}`)
}
