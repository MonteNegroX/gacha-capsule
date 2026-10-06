import { createHmac, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'

export const LAB_COOKIE = 'capsule_lab'

function secret(): string {
  return process.env.GACHA_LAB_SECRET?.trim() ?? ''
}

export function labConfigured(): boolean {
  return secret().length >= 12
}

export function liveOpenEnabled(): boolean {
  return process.env.GACHA_LAB_LIVE === 'true'
}

function mac(value: string): Buffer {
  return createHmac('sha256', 'capsule-lab').update(value).digest()
}

export function passwordMatches(input: string): boolean {
  if (!labConfigured()) return false
  const got = mac(input)
  const expected = mac(secret())
  return timingSafeEqual(got, expected)
}

export function labToken(): string {
  return createHmac('sha256', secret()).update('capsule-lab-session').digest('hex')
}

export async function labUnlocked(): Promise<boolean> {
  if (!labConfigured()) return false
  const jar = await cookies()
  const got = jar.get(LAB_COOKIE)?.value ?? ''
  const expected = labToken()
  if (got.length !== expected.length) return false
  return timingSafeEqual(Buffer.from(got), Buffer.from(expected))
}
