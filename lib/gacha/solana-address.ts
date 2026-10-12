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

export function base58Encode(bytes: Uint8Array): string {
  if (bytes.length === 0) return ''
  const digits = [0]
  for (let i = 0; i < bytes.length; i += 1) {
    let carry = bytes[i]
    for (let j = 0; j < digits.length; j += 1) {
      const next = digits[j] * 256 + carry
      digits[j] = next % 58
      carry = Math.floor(next / 58)
    }
    while (carry > 0) {
      digits.push(carry % 58)
      carry = Math.floor(carry / 58)
    }
  }
  let out = ''
  for (let i = 0; bytes[i] === 0 && i < bytes.length - 1; i += 1) out += '1'
  for (let i = digits.length - 1; i >= 0; i -= 1) out += ALPHABET[digits[i]]
  return out
}

export function base58Decode(value: string): Uint8Array {
  if (!/^[1-9A-HJ-NP-Za-km-z]*$/.test(value)) throw new Error('Solana key is not valid')
  if (value.length === 0) return new Uint8Array()
  let zeros = 0
  while (zeros < value.length && value[zeros] === '1') zeros += 1
  if (zeros === value.length) return new Uint8Array(zeros)
  const bytes: number[] = [0]
  for (const char of value) {
    let carry = ALPHABET.indexOf(char)
    for (let i = 0; i < bytes.length; i += 1) {
      const next = bytes[i] * 58 + carry
      bytes[i] = next % 256
      carry = Math.floor(next / 256)
    }
    while (carry > 0) {
      bytes.push(carry % 256)
      carry = Math.floor(carry / 256)
    }
  }
  const body = new Uint8Array(bytes.length)
  for (let i = 0; i < bytes.length; i += 1) body[body.length - 1 - i] = bytes[i]
  if (zeros === 0) return body
  const out = new Uint8Array(zeros + body.length)
  out.set(body, zeros)
  return out
}
