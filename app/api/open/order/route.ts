import { NextResponse } from 'next/server'
import { findPullByHash, findPullById, publicPull } from '@/lib/gacha/pull-store'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const tx = url.searchParams.get('tx') ?? ''
  const id = url.searchParams.get('id') ?? ''
  try {
    const row = /^0x[a-fA-F0-9]{64}$/.test(tx)
      ? await findPullByHash(tx)
      : /^ord_[a-f0-9]{16}$/.test(id)
        ? await findPullById(id)
        : null
    if (!row) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    return NextResponse.json({ order: publicPull(row) })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Order lookup failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
