import { NextResponse } from 'next/server'
import { packOpenable } from '@/lib/gacha/pack-access'
import { workerFresh } from '@/lib/gacha/pull-store'
import { findListedMachine, openerWorkerId } from '@/lib/gacha/ripcars-pack'
import { parseUnits } from '@/lib/gacha/units'
import { vaultCanOpen } from '@/lib/gacha/vault-stock'
import { treasuryAddress } from '@/lib/gacha/verify-payment'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get('pack') ?? ''
  if (!/^[a-z0-9_]+$/.test(code)) {
    return NextResponse.json({ ready: false, reason: 'Unknown pack' }, { status: 400 })
  }
  try {
    const machine = await findListedMachine(code)
    if (!machine) return NextResponse.json({ ready: false, reason: 'That machine is not available' }, { status: 404 })
    if (!packOpenable(machine.price)) {
      return NextResponse.json({ ready: false, reason: 'Coming soon' })
    }
    if (!treasuryAddress()) {
      return NextResponse.json({ ready: false, reason: 'Payments are not configured.' })
    }
    const priceRaw = parseUnits(machine.price)
    const stocked = priceRaw != null && await vaultCanOpen(priceRaw).catch(() => false)
    if (!stocked) return NextResponse.json({ ready: false, reason: 'This machine is restocking.' })
    if (!(await workerFresh(Date.now(), 120_000, openerWorkerId(code)).catch(() => false))) {
      return NextResponse.json({ ready: false, reason: 'Opening is offline.' })
    }
    return NextResponse.json({ ready: true, priceUsd: formatPrice(machine.price) })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Machine list failed'
    return NextResponse.json({ ready: false, reason: message }, { status: 502 })
  }
}

function formatPrice(price: number): string {
  return Number.isInteger(price) ? price.toFixed(0) : price.toFixed(2)
}
