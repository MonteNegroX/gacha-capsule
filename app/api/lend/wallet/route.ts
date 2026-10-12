import { NextResponse } from 'next/server'
import { mintsAlreadyOpened } from '@/lib/gacha/pull-store'
import { NftMoveError, listWalletCards } from '@/lib/gacha/solana-nft'
import { solanaAddress } from '@/lib/gacha/solana-address'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const owner = solanaAddress(new URL(request.url).searchParams.get('owner') ?? '')
  if (!owner) return NextResponse.json({ error: 'Enter a Solana address.' }, { status: 400 })
  try {
    const listed = await listWalletCards(owner)
    const opened = await mintsAlreadyOpened(listed.cards.map((card) => card.mint))
    return NextResponse.json({
      truncated: listed.truncated,
      cards: listed.cards.filter((card) => !opened.has(card.mint)),
    })
  } catch (err) {
    if (err instanceof NftMoveError) return NextResponse.json({ error: err.message }, { status: err.status })
    return NextResponse.json({ error: 'Cards could not be checked.' }, { status: 503 })
  }
}
