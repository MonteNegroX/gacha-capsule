import { NextResponse } from 'next/server'
import { HELD_JOLTEON } from '@/lib/gacha/held-card'
import { mintAlreadyOpened } from '@/lib/gacha/pull-store'
import { NftMoveError, buildVaultDeposit } from '@/lib/gacha/solana-nft'
import { solanaAddress } from '@/lib/gacha/solana-address'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  let owner = ''
  let mint = ''
  try {
    const body = (await request.json()) as { owner?: unknown; mint?: unknown }
    owner = typeof body.owner === 'string' ? body.owner : ''
    mint = typeof body.mint === 'string' ? body.mint : ''
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }
  const parsedOwner = solanaAddress(owner)
  const parsedMint = solanaAddress(mint)
  if (!parsedOwner || !parsedMint) {
    return NextResponse.json({ error: 'Enter a Solana address.' }, { status: 400 })
  }
  if (parsedMint === HELD_JOLTEON || (await mintAlreadyOpened(parsedMint).catch(() => true))) {
    return NextResponse.json({ error: 'This card is already held by an open.' }, { status: 409 })
  }
  try {
    const transaction = await buildVaultDeposit(parsedOwner, parsedMint)
    return NextResponse.json({ transaction })
  } catch (err) {
    if (err instanceof NftMoveError) return NextResponse.json({ error: err.message }, { status: err.status })
    const message = err instanceof Error ? err.message : 'The transfer was not built'
    return NextResponse.json({ error: message.replace(/postgres(?:ql)?:\/\/\S+/gi, 'db').slice(0, 180) }, { status: 502 })
  }
}
