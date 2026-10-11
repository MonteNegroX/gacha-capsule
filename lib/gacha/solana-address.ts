const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'

export function solanaAddress(value: string): string | null {
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value)) return null
  const bytes: number[] = []
  for (const char of value) {
    let carry = ALPHABET.indexOf(char)
    if (carry < 0) return null
    for (let i = 0; i < bytes.length; i += 1) {
      const next = bytes[i] * 58 + carry
      bytes[i] = next & 255
      carry = next >> 8
    }
    while (carry > 0) {
      bytes.push(carry & 255)
      carry >>= 8
    }
  }
  for (let i = 0; value[i] === '1' && i < value.length - 1; i += 1) bytes.push(0)
  if (bytes.length !== 32) return null
  return value
}
