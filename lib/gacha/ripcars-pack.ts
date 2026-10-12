import { findMachine, loadPublicMachines } from '@/lib/gacha/catalog'
import type { GachaMachine } from '@/lib/gacha/types'

// Rip Cars Garage Pack. The worker opens and sells it with the Solana vault key.
// A payment is queued only while that worker's own heartbeat is fresh.
export const RIPCARS_WORKER_ID = 'ripcars' as const
export const GARAGE_PACK: GachaMachine = {
  code: 'garage_20',
  name: 'Garage Pack',
  category: 'Cars',
  menuOrder: 20,
  price: 20,
  ev: 20.88,
  instantBuyback: 90,
  turboMode: false,
  odds: { common: 0.75, uncommon: 0.2, rare: 0.04, epic: 0.01 },
  tierRanges: {
    common: { start: 10.9, end: 22 },
    uncommon: { start: 22, end: 40 },
    rare: { start: 40, end: 75 },
    epic: { start: 75, end: 650 },
  },
  stock: { common: 0, uncommon: 0, rare: 0, epic: 0 },
  imageUrl: 'https://assets.ripcars.io/gacha-machine-images/Yellow.webp?v=2',
}

export function isRipCarsPack(code: string): boolean {
  return code === GARAGE_PACK.code
}

export function withRipCars(machines: GachaMachine[]): GachaMachine[] {
  if (machines.some((machine) => machine.code === GARAGE_PACK.code)) return machines
  return [...machines, GARAGE_PACK]
}

export function openerWorkerId(code: string): 'robinhood' | 'ripcars' {
  return isRipCarsPack(code) ? RIPCARS_WORKER_ID : 'robinhood'
}

export type PackWorker = 'capsule' | 'ripcars'

export function workerOwnsPack(code: string, worker: PackWorker): boolean {
  return isRipCarsPack(code) === (worker === 'ripcars')
}

export async function findListedMachine(code: string): Promise<GachaMachine | null> {
  let listed: GachaMachine[] = []
  try {
    listed = await loadPublicMachines()
  } catch (err) {
    if (!isRipCarsPack(code)) throw err
  }
  return findMachine(withRipCars(listed), code) ?? null
}
