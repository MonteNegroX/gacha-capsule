import { decodeDeal, decodeUint, encodeDeal, encodeRepayDue, LEND_ADDRESS, type OnchainDeal } from '@/lib/gacha/lend-abi'
import { ROBINHOOD_RPC } from '@/lib/gacha/robinhood-transfer'

async function call(data: string): Promise<string> {
  const res = await fetch(ROBINHOOD_RPC, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_call',
      params: [{ to: LEND_ADDRESS, data }, 'latest'],
    }),
  })
  if (!res.ok) throw new Error(`Robinhood RPC HTTP ${res.status}`)
  const body = (await res.json()) as { result?: string; error?: { message?: string } }
  if (body.error) throw new Error(body.error.message || 'Robinhood RPC error')
  if (typeof body.result !== 'string') throw new Error('Robinhood RPC returned no result')
  return body.result
}

export async function readDeal(dealId: string): Promise<OnchainDeal | null> {
  return decodeDeal(await call(encodeDeal(dealId)))
}

export async function readRepayDue(dealId: string): Promise<bigint | null> {
  return decodeUint(await call(encodeRepayDue(dealId)))
}
