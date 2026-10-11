import { NextResponse } from 'next/server'
import { findMachine, loadPublicMachines } from '@/lib/gacha/catalog'
import { gatePayment, packOpenable } from '@/lib/gacha/pack-access'
import { insertPull, publicPull, workerFresh } from '@/lib/gacha/pull-store'
import { parseUnits } from '@/lib/gacha/units'
import { vaultCanOpen } from '@/lib/gacha/vault-stock'
import { treasuryAddress, verifyRobinhoodPayment } from '@/lib/gacha/verify-payment'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  if (!treasuryAddress()) {
    return NextResponse.json({ error: 'Payments are not configured.' }, { status: 503 })
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

  let machine
  try {
    machine = findMachine(await loadPublicMachines(), packType)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Machine list failed'
    return NextResponse.json({ error: message }, { status: 502 })
  }
  if (!machine) return NextResponse.json({ error: 'That machine is not available' }, { status: 404 })

  let check
  try {
    check = await verifyRobinhoodPayment(txHash, machine.price)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Payment check failed'
    return NextResponse.json({ error: message }, { status: 502 })
  }
  if (!check.terminal) {
    return NextResponse.json({ error: check.error ?? 'Payment is not confirmed yet', pending: true }, { status: 202 })
  }

  const paid = check.amountRaw && /^\d+$/.test(check.amountRaw) ? BigInt(check.amountRaw) : null
  const payer = check.from ?? ''
  if (!/^0x[a-fA-F0-9]{40}$/.test(payer) || paid == null) {
    return NextResponse.json({ error: check.error ?? 'No USDG payment to the treasury' }, { status: 400 })
  }

  const priceRaw = parseUnits(machine.price)
  const openable = packOpenable(machine.price)
  const gate = gatePayment(machine.price, paid, openable)
  if (gate === 'ignore' || priceRaw == null) {
    return NextResponse.json({ error: check.error ?? 'No USDG payment to the treasury' }, { status: 400 })
  }

  let status: 'PAYMENT_CONFIRMED' | 'REFUND_PENDING' = gate === 'queue' ? 'PAYMENT_CONFIRMED' : 'REFUND_PENDING'
  let error: string | null = gate === 'queue'
    ? null
    : openable
      ? 'Send the exact pack price. This payment will be returned.'
      : 'This pack is coming soon. This payment will be returned.'
  if (status === 'PAYMENT_CONFIRMED') {
    const stocked = await vaultCanOpen(priceRaw).catch(() => false)
    const fresh = await workerFresh(Date.now()).catch(() => false)
    if (!stocked || !fresh) {
      status = 'REFUND_PENDING'
      error = !stocked
        ? 'This machine is restocking. This payment will be returned.'
        : 'Opening is offline. This payment will be returned.'
    }
  }

  try {
    const saved = await insertPull({
      payer,
      machineCode: machine.code,
      priceRaw,
      paidRaw: paid,
      paymentHash: txHash,
      buybackPct: machine.instantBuyback,
      status,
      error,
    })
    return NextResponse.json({ replay: saved.replay, order: publicPull(saved.row) })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Order was not stored'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
