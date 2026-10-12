import { NextResponse } from 'next/server'
import { labUnlocked } from '@/lib/gacha/lab-session'
import { findOrderById } from '@/lib/gacha/orders'

export async function GET(request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  if (!(await labUnlocked())) {
    return NextResponse.json({ error: 'Lab locked' }, { status: 401 })
  }

  const { orderId } = await params
  if (!orderId) {
    return NextResponse.json({ error: 'orderId required' }, { status: 400 })
  }

  const order = await findOrderById(orderId)
  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  return NextResponse.json({ order })
}

