import { chooseDouble, type ApplyResult, type CapsuleOrder, type DrawResult } from './order'

export const DOUBLE_WIN_BELOW = 49
export const DOUBLE_ROLL_SPAN = 100

export function outcomeForRoll(roll: number): DrawResult | null {
  if (!Number.isInteger(roll) || roll < 0 || roll >= DOUBLE_ROLL_SPAN) return null
  return roll < DOUBLE_WIN_BELOW ? 'WIN' : 'LOSS'
}

export function applyDouble(order: CapsuleOrder, roll: number, nowMs: number): ApplyResult | { ok: false; order: CapsuleOrder; error: 'INVALID_ROLL' } {
  if (order.draw) return chooseDouble(order, order.draw, nowMs)
  const outcome = outcomeForRoll(roll)
  if (!outcome) return { ok: false, order, error: 'INVALID_ROLL' }
  return chooseDouble(order, outcome, nowMs)
}
