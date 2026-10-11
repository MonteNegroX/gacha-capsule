import { verifyMessage } from 'ethers'
import { NextResponse } from 'next/server'
import { solanaMessage } from '@/lib/gacha/choice-message'
import { readDeal } from '@/lib/gacha/lend-read'
import { findCollateral, setCollateralSolana } from '@/lib/gacha/pull-store'
import { solanaAddress } from '@/lib/gacha/solana-address'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  let orderId = ''
  let address = ''
  let signature = ''
  try {
    const body = (await request.json()) as { orderId?: unknown; address?: unknown; signature?: unknown }
    orderId = typeof body.orderId === 'string' ? body.orderId.trim() : ''
    address = typeof body.address === 'string' ? body.address.trim() : ''
    signature = typeof body.signature === 'string' ? body.signature.trim() : ''
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }
  const solana = solanaAddress(address)
  if (!/^col_[a-f0-9]{16}$/.test(orderId) || !solana || !/^0x[a-fA-F0-9]+$/.test(signature)) {
    return NextResponse.json({ error: 'Enter a Solana address' }, { status: 400 })
  }
  const row = await findCollateral(orderId).catch(() => null)
  if (!row?.deal_id) return NextResponse.json({ error: 'This card is not in a loan' }, { status: 404 })
  if (row.solana_address) return NextResponse.json({ ok: true })
  const deal = await readDeal(row.deal_id).catch(() => null)
  if (!deal || deal.status !== 4) {
    return NextResponse.json({ error: 'The Solana address is collected after the term ends' }, { status: 409 })
  }
  let signer = ''
  try {
    signer = verifyMessage(solanaMessage(orderId, solana), signature).toLowerCase()
  } catch {
    return NextResponse.json({ error: 'Signature is not valid' }, { status: 401 })
  }
  if (signer !== deal.funder.toLowerCase()) {
    return NextResponse.json({ error: 'Sign from the wallet that funded the card' }, { status: 401 })
  }
  const saved = await setCollateralSolana(orderId, solana)
  if (!saved?.solana_address) return NextResponse.json({ error: 'Address was not saved' }, { status: 409 })
  return NextResponse.json({ ok: true })
}
