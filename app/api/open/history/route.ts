import { NextResponse } from 'next/server'
import { loadPlayerHistory } from '@/lib/gacha/stats'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const address = new URL(request.url).searchParams.get('address') ?? ''
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return NextResponse.json({ error: 'Enter the wallet that paid' }, { status: 400 })
  }
  try {
    return NextResponse.json(await loadPlayerHistory(address))
  } catch (err) {
    const message = err instanceof Error ? err.message : 'History failed'
    return NextResponse.json({ error: message.replace(/postgres(?:ql)?:\/\/\S+/gi, 'db').slice(0, 180) }, { status: 500 })
  }
}
