import { NextResponse } from 'next/server'
import { findMachine, loadPublicMachines } from '@/lib/gacha/catalog'
import { labUnlocked } from '@/lib/gacha/lab-session'
import { openPackLive, quoteBuyback } from '@/lib/gacha/live-open'

export const maxDuration = 300

export async function POST(request: Request) {
  if (!(await labUnlocked())) {
    return NextResponse.json({ error: 'Lab locked' }, { status: 401 })
  }

  let packType = ''
  let confirm = ''
  try {
    const body = (await request.json()) as { packType?: unknown; confirm?: unknown }
    packType = typeof body.packType === 'string' ? body.packType : ''
    confirm = typeof body.confirm === 'string' ? body.confirm : ''
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }

  if (!/^[a-z0-9_]+$/.test(packType)) {
    return NextResponse.json({ error: 'Unknown pack' }, { status: 400 })
  }
  if (confirm !== 'DROP') {
    return NextResponse.json({ error: 'Confirm the card drop first' }, { status: 400 })
  }

  let machines
  try {
    machines = await loadPublicMachines()
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Machine list failed'
    return NextResponse.json({ error: message }, { status: 502 })
  }
  const machine = findMachine(machines, packType)
  if (!machine) return NextResponse.json({ error: 'That machine is not available' }, { status: 404 })

  try {
    const result = await openPackLive(machine.code, false, false, 150_000)
    result.buybackPct = machine.instantBuyback
    result.buybackAmount = quoteBuyback(result.insuredValue, machine.instantBuyback, result.buybackAmount)
    result.memo = 'card-drop'
    result.turboBuyback = false
    return NextResponse.json({ result })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Card drop failed'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
