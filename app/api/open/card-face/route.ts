import { NextResponse } from 'next/server'
import { faceFromMarketplace } from '@/lib/gacha/card-face'
import { solanaAddress } from '@/lib/gacha/solana-address'

export const dynamic = 'force-dynamic'

const EMPTY = { year: null, grade: null, backUrl: null }

export async function GET(request: Request) {
  const mint = solanaAddress(new URL(request.url).searchParams.get('mint') ?? '')
  if (!mint) return NextResponse.json({ error: 'Mint is invalid' }, { status: 400 })
  try {
    const res = await fetch(`https://api.collectorcrypt.com/marketplace?search=${encodeURIComponent(mint)}`, {
      headers: { accept: 'application/json', 'user-agent': 'Capsule/1.0' },
      signal: AbortSignal.timeout(4000),
      cache: 'no-store',
    })
    if (!res.ok) return NextResponse.json(EMPTY)
    return NextResponse.json(faceFromMarketplace(await res.json(), mint))
  } catch {
    return NextResponse.json(EMPTY)
  }
}
