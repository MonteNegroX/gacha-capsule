import { verifyMessage } from 'ethers'
import { NextResponse } from 'next/server'
import { collateralMessage, parseCollateral } from '@/lib/gacha/collateral'
import { HELD_JOLTEON } from '@/lib/gacha/held-card'
import { findCollateral, insertCollateral, mintAlreadyOpened } from '@/lib/gacha/pull-store'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get('id') ?? ''
  if (!/^col_[a-f0-9]{16}$/.test(id)) return NextResponse.json({ error: 'Request was not found' }, { status: 400 })
  try {
    const row = await findCollateral(id)
    if (!row) return NextResponse.json({ error: 'Request was not found' }, { status: 404 })
    return NextResponse.json({
      id: row.id,
      status: row.status,
      dealId: row.deal_id,
      error: row.error?.replace(/postgres(?:ql)?:\/\/\S+/gi, 'db').slice(0, 180) ?? null,
    })
  } catch {
    return NextResponse.json({ error: 'The listing could not be read' }, { status: 503 })
  }
}

export async function POST(request: Request) {
  let mint = ''
  let principal = ''
  let signature = ''
  try {
    const body = (await request.json()) as { mint?: unknown; principal?: unknown; signature?: unknown }
    mint = typeof body.mint === 'string' ? body.mint : ''
    principal = typeof body.principal === 'string' ? body.principal : ''
    signature = typeof body.signature === 'string' ? body.signature : ''
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }
  const parsed = parseCollateral(mint, principal)
  if (!parsed || !/^0x[a-fA-F0-9]+$/.test(signature)) {
    return NextResponse.json({ error: 'Enter a Solana mint and a principal from 1 to 500 USDG.' }, { status: 400 })
  }
  if (parsed.mint === HELD_JOLTEON || (await mintAlreadyOpened(parsed.mint).catch(() => true))) {
    return NextResponse.json({ error: 'This card is already held by an open.' }, { status: 409 })
  }
  let owner = ''
  try {
    owner = verifyMessage(collateralMessage(parsed.mint, parsed.raw.toString()), signature).toLowerCase()
  } catch {
    return NextResponse.json({ error: 'Signature is not valid' }, { status: 401 })
  }
  if (!/^0x[a-fA-F0-9]{40}$/.test(owner)) {
    return NextResponse.json({ error: 'Sign from the wallet that will own the loan' }, { status: 401 })
  }
  try {
    const row = await insertCollateral({ mint: parsed.mint, owner, principalRaw: parsed.raw })
    if (row.owner !== owner || row.principal_raw !== parsed.raw.toString()) {
      return NextResponse.json({ error: 'This card already has an open request.' }, { status: 409 })
    }
    return NextResponse.json({ id: row.id, status: row.status, error: row.error })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Request was not stored'
    return NextResponse.json({ error: message.replace(/postgres(?:ql)?:\/\/\S+/gi, 'db').slice(0, 180) }, { status: 500 })
  }
}
