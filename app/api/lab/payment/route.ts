import { NextResponse } from 'next/server'
import { findMachine, loadPublicMachines } from '@/lib/gacha/catalog'
import { labUnlocked } from '@/lib/gacha/lab-session'
import { saveOrder } from '@/lib/gacha/orders'
import { treasuryAddress, verifyRobinhoodPayment } from '@/lib/gacha/verify-payment'

export async function POST(request: Request) {
  if (!(await labUnlocked())) {
    return NextResponse.json({ error: 'Lab locked' }, { status: 401 })
  }
  if (!treasuryAddress()) {
    return NextResponse.json({ error: 'Treasury address is not configured' }, { status: 503 })
  }

  let packType = ''
  let txHash = ''
  try {
    const body = (await request.json()) as { packType?: unknown; txHash?: unknown }
    packType = typeof body.packType === 'string' ? body.packType : ''
    txHash = typeof body.txHash === 'string' ? body.txHash.trim() : ''
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
  if (!machine) return NextResponse.json({ error: 'That machine is not available' }, { status: 404 })

  let check
  try {
    check = await verifyRobinhoodPayment(txHash, machine.price)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Payment check failed'
    return NextResponse.json({ error: message }, { status: 502 })
  }

  if (!check.terminal) {
    return NextResponse.json({ error: check.error ?? 'Payment not confirmed', replay: false, order: null }, { status: 400 })
  }

  const saved = await saveOrder({
    status: check.ok ? 'PAYMENT_CONFIRMED' : 'PAYMENT_INVALID',
    network: 'robinhood',
    token: 'USDG',
    packType: machine.code,
    priceUsd: machine.price,
    payer: check.from ?? null,
    paymentTx: txHash,
    amountUsd: check.amountUsd ?? null,
    error: check.error ?? null,
  })

  const status = saved.order.status === 'PAYMENT_CONFIRMED' ? 200 : 400
  return NextResponse.json({ replay: saved.replay, order: saved.order }, { status })
}
