import type { CapsuleOrder, OpenedCard } from './order'

export const HOLD_OPEN = { turbo: false, autoBuyback: false } as const

export type HoldOpenResult =
  | { ok: true; card: OpenedCard }
  | { ok: false; reason: 'DISABLED' }
  | { ok: false; reason: 'FAILED'; message: string }

export type HoldOpen = (order: CapsuleOrder) => HoldOpenResult

export function disabledHoldOpen(): HoldOpenResult {
  return { ok: false, reason: 'DISABLED' }
}

export function disabledBuyback(): { ok: false; reason: 'DISABLED' } {
  return { ok: false, reason: 'DISABLED' }
}

export function disabledPayout(): { ok: false; reason: 'DISABLED' } {
  return { ok: false, reason: 'DISABLED' }
}
