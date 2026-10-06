import { NextResponse } from 'next/server'
import { findMachine, loadPublicMachines } from '@/lib/gacha/catalog'
import { labUnlocked, liveOpenEnabled } from '@/lib/gacha/lab-session'
import { openPackLive } from '@/lib/gacha/live-open'
import { simulatePull } from '@/lib/gacha/simulate'

export async function POST(request: Request) {
  if (!(await labUnlocked())) {
    return NextResponse.json({ error: 'Lab locked' }, { status: 401 })
  }

  let packType = ''
  let turbo = false
  let live = false
  let confirm = ''
  try {
    const body = (await request.json()) as {
      packType?: unknown
      turbo?: unknown
      live?: unknown
      confirm?: unknown
    }
    packType = typeof body.packType === 'string' ? body.packType : ''
    turbo = body.turbo === true
    live = body.live === true
    confirm = typeof body.confirm === 'string' ? body.confirm : ''
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }

  if (!/^[a-z0-9_]+$/.test(packType)) {
    return NextResponse.json({ error: 'Unknown pack' }, { status: 400 })
  }

  let machines
  try {
    machines = await loadPublicMachines()
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Machine list failed'
    return NextResponse.json({ error: message }, { status: 502 })
  }

  const machine = findMachine(machines, packType)
  if (!machine) {
    return NextResponse.json({ error: 'That machine is not available' }, { status: 404 })
  }

  if (!live) {
    return NextResponse.json({ result: simulatePull(machine, turbo) })
  }

  if (!liveOpenEnabled()) {
    return NextResponse.json({ error: 'Live open is off' }, { status: 403 })
  }
  if (confirm !== 'OPEN') {
    return NextResponse.json({ error: 'Confirm the live open first' }, { status: 400 })
  }

  try {
    const result = await openPackLive(packType, turbo && machine.turboMode)
    result.buybackPct = machine.instantBuyback
    return NextResponse.json({ result })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Live open failed'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
