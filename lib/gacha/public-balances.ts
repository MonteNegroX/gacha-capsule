import { ROBINHOOD_RPC, ROBINHOOD_USDG } from '@/lib/gacha/robinhood-transfer'

export async function usdgBalance(holder: string): Promise<bigint> {
  if (!/^0x[a-fA-F0-9]{40}$/.test(holder)) throw new Error('Bad treasury address')
  const data = `0x70a08231${holder.toLowerCase().replace(/^0x/, '').padStart(64, '0')}`
  const res = await fetch(ROBINHOOD_RPC, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_call', params: [{ to: ROBINHOOD_USDG, data }, 'latest'] }),
  })
  if (!res.ok) throw new Error(`Robinhood RPC HTTP ${res.status}`)
  const body = (await res.json()) as { result?: string; error?: { message?: string } }
  if (body.error) throw new Error(body.error.message || 'Robinhood RPC error')
  if (typeof body.result !== 'string' || !/^0x[0-9a-fA-F]+$/.test(body.result)) throw new Error('Robinhood RPC returned no balance')
  return BigInt(body.result)
}
