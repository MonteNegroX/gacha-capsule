import { randomInt } from 'node:crypto'
import { verifyMessage } from 'ethers'
import { NextResponse } from 'next/server'
import { applyDouble } from '@/lib/capsule/choice'
import { chooseBuyback } from '@/lib/capsule/order'
import { choiceMessage } from '@/lib/gacha/choice-message'
import { doubleOffered } from '@/lib/gacha/pack-access'
import { findPullById, publicPull, toDomain, writeDomain } from '@/lib/gacha/pull-store'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  let orderId = ''
  let choice = ''
  let signature = ''
  try {
    const body = (await request.json()) as { orderId?: unknown; choice?: unknown; signature?: unknown }
    orderId = typeof body.orderId === 'string' ? body.orderId : ''
    choice = typeof body.choice === 'string' ? body.choice : ''
    signature = typeof body.signature === 'string' ? body.signature : ''
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }
  if (!/^ord_[a-f0-9]{16}$/.test(orderId) || (choice !== 'BUYBACK' && choice !== 'DOUBLE') || !/^0x[a-fA-F0-9]+$/.test(signature)) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }

  const row = await findPullById(orderId).catch(() => null)
  if (!row) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

  let signer = ''
  try {
    signer = verifyMessage(choiceMessage(orderId, choice), signature).toLowerCase()
  } catch {
    return NextResponse.json({ error: 'Choice signature is not valid' }, { status: 401 })
  }
  if (signer !== row.payer.toLowerCase()) {
    return NextResponse.json({ error: 'Sign the choice from the wallet that paid' }, { status: 401 })
  }
  if (choice === 'DOUBLE' && !doubleOffered(row.rarity)) {
    return NextResponse.json({ error: 'Double is only offered on a Common card' }, { status: 400 })
  }

  const order = toDomain(row)
  const now = Date.now()
  const roll = randomInt(0, 100)
  const applied = choice === 'BUYBACK' ? chooseBuyback(order, now) : applyDouble(order, roll, now)
  if (!applied.ok) {
    return NextResponse.json({ error: choiceError(applied.error) }, { status: 409 })
  }
  const saved = await writeDomain(row.status, applied.order, choice === 'DOUBLE' && applied.applied ? { roll } : {})
  if (!saved || saved.status !== applied.order.status) {
    return NextResponse.json({ error: 'Order changed. Try again.' }, { status: 409 })
  }
  return NextResponse.json({ order: publicPull(saved) })
}

function choiceError(code: string): string {
  switch (code) {
    case 'CHOICE_EXPIRED':
      return 'The 24 hour choice window has ended.'
    case 'CHOICE_ALREADY_MADE':
      return 'This choice is already saved.'
    case 'ILLEGAL_TRANSITION':
      return 'This order is no longer waiting for a choice.'
    case 'INVALID_ROLL':
      return 'The roll could not be saved.'
    default:
      return 'This choice was not saved.'
  }
}
