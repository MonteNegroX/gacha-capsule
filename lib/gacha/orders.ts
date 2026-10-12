import { randomBytes } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

export type LabOrderStatus = 'PAYMENT_CONFIRMED' | 'PAYMENT_INVALID' | 'OPENING' | 'BUYBACK_CONFIRMED' | 'PAYOUT_PENDING' | 'PAID_OUT' | 'OPENING_FAILED' | 'PAYOUT_FAILED'

export type LabOrder = {
  orderId: string
  status: LabOrderStatus
  network: 'robinhood' | 'base'
  token: 'USDG' | 'USDC'
  packType: string
  priceUsd: number
  payer: string | null
  paymentTx: string
  amountUsd: number | null
  error: string | null
  memo: string | null
  cardName: string | null
  rarity: string | null
  buybackAmount: number | null
  buybackSignature: string | null
  payoutTx: string | null
  createdAt: string
}

const filePath = join(process.cwd(), 'data', 'lab-orders.json')

async function readAll(): Promise<LabOrder[]> {
  try {
    const raw = await readFile(filePath, 'utf8')
    const parsed = JSON.parse(raw) as LabOrder[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

async function writeAll(orders: LabOrder[]): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true })
  await writeFile(filePath, JSON.stringify(orders, null, 2))
}

export async function findOrderByTx(txHash: string): Promise<LabOrder | undefined> {
  const orders = await readAll()
  return orders.find((order) => order.paymentTx.toLowerCase() === txHash.toLowerCase())
}

export async function findOrderById(orderId: string): Promise<LabOrder | undefined> {
  const orders = await readAll()
  return orders.find((order) => order.orderId === orderId)
}

export async function updateOrder(orderId: string, patch: Partial<Omit<LabOrder, 'orderId' | 'createdAt'>>): Promise<LabOrder | null> {
  const orders = await readAll()
  const idx = orders.findIndex((order) => order.orderId === orderId)
  if (idx === -1) return null
  orders[idx] = { ...orders[idx], ...patch } as LabOrder
  await writeAll(orders)
  return orders[idx]
}

export async function saveOrder(input: Omit<LabOrder, 'orderId' | 'createdAt' | 'memo' | 'cardName' | 'rarity' | 'buybackAmount' | 'buybackSignature' | 'payoutTx'>): Promise<{ order: LabOrder; replay: boolean }> {
  const orders = await readAll()
  const existing = orders.find((order) => order.paymentTx.toLowerCase() === input.paymentTx.toLowerCase())
  if (existing) return { order: existing, replay: true }

  const order: LabOrder = {
    ...input,
    paymentTx: input.paymentTx.toLowerCase(),
    orderId: `ord_${randomBytes(4).toString('hex')}`,
    memo: null,
    cardName: null,
    rarity: null,
    buybackAmount: null,
    buybackSignature: null,
    payoutTx: null,
    createdAt: new Date().toISOString(),
  }
  orders.push(order)
  await writeAll(orders)
  return { order, replay: false }
}
