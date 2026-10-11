import { NextResponse } from 'next/server'
import { loadProtocolStats } from '@/lib/gacha/stats'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    return NextResponse.json(await loadProtocolStats())
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Statistics failed'
    return NextResponse.json({ error: message.replace(/postgres(?:ql)?:\/\/\S+/gi, 'db').slice(0, 180) }, { status: 500 })
  }
}
