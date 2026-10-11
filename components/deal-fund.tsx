'use client'

import { useEffect, useState } from 'react'
import { useConnectWallet, useWallets } from '@privy-io/react-auth'
import { solanaMessage } from '@/lib/gacha/choice-message'
import {
  decodeDeal,
  decodeUint,
  encodeAllowance,
  encodeApprove,
  encodeDeal,
  encodeFund,
  encodeMarkDefault,
  encodeRepay,
  encodeRepayDue,
  LEND_ADDRESS,
  type OnchainDeal,
} from '@/lib/gacha/lend-abi'
import {
  ROBINHOOD_EXPLORER,
  ROBINHOOD_RPC,
  ROBINHOOD_USDG,
  ensureRobinhood,
  sendRobinhoodCall,
} from '@/lib/gacha/robinhood-transfer'
import { formatUnits } from '@/lib/gacha/units'

const STATUS = ['Empty', 'Funding', 'Active', 'Repaid', 'Defaulted', 'Cancelled']

function walletErrorCode(err: unknown): number | null {
  if (typeof err === 'object' && err !== null && 'code' in err && typeof err.code === 'number') return err.code
  return null
}

async function ethCall(to: string, data: string): Promise<string> {
  const res = await fetch(ROBINHOOD_RPC, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_call', params: [{ to, data }, 'latest'] }),
  })
  const body = (await res.json()) as { result?: string; error?: { message?: string } }
  if (body.error) throw new Error(body.error.message || 'Loan lookup failed')
  return body.result ?? '0x'
}

export function DealFund({
  orderId,
  dealId,
  name,
  imageUrl,
  rarity,
  principalRaw,
  nftAddress,
  treasury,
}: {
  orderId: string
  dealId: string
  name: string
  imageUrl: string | null
  rarity: string
  principalRaw: string
  nftAddress: string
  treasury: string
}) {
  const { wallets, ready } = useWallets()
  const { connectWallet } = useConnectWallet()
  const wallet = wallets.find((item) => item.type === 'ethereum' && item.walletClientType !== 'privy' && item.walletClientType !== 'privy-v2')
  const isTreasury = treasury !== '' && (wallet?.address ?? '').toLowerCase() === treasury.toLowerCase()
  const principal = BigInt(principalRaw)
  const funderFee = (principal * BigInt(300)) / BigInt(10000)
  const protocolFee = (principal * BigInt(100)) / BigInt(10000)
  const [deal, setDeal] = useState<OnchainDeal | null>(null)
  const [due, setDue] = useState<bigint | null>(null)
  const [address, setAddress] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [note, setNote] = useState('')

  useEffect(() => {
    let stop = false
    async function load() {
      try {
        const [rawDeal, rawDue] = await Promise.all([
          ethCall(LEND_ADDRESS, encodeDeal(dealId)),
          ethCall(LEND_ADDRESS, encodeRepayDue(dealId)),
        ])
        if (stop) return
        setDeal(decodeDeal(rawDeal))
        setDue(decodeUint(rawDue))
      } catch (err) {
        if (!stop) setError(err instanceof Error ? err.message : 'Loan lookup failed')
      }
    }
    void load()
    const timer = window.setInterval(load, 15_000)
    return () => {
      stop = true
      window.clearInterval(timer)
    }
  }, [dealId])

  async function send(data: string, to = LEND_ADDRESS) {
    if (!wallet) {
      connectWallet()
      return ''
    }
    const provider = await wallet.getEthereumProvider()
    const from = await ensureRobinhood(provider)
    return sendRobinhoodCall(provider, from, to, data)
  }

  async function fund() {
    if (!ready || busy) return
    setBusy(true)
    setError('')
    try {
      if (!wallet) {
        connectWallet()
        return
      }
      const provider = await wallet.getEthereumProvider()
      const from = await ensureRobinhood(provider)
      const allowance = decodeUint(await ethCall(ROBINHOOD_USDG, encodeAllowance(from, LEND_ADDRESS))) ?? BigInt(0)
      if (allowance < principal) {
        await sendRobinhoodCall(provider, from, ROBINHOOD_USDG, encodeApprove(LEND_ADDRESS, principal))
      }
      const hash = await sendRobinhoodCall(provider, from, LEND_ADDRESS, encodeFund(dealId))
      setNote(`${ROBINHOOD_EXPLORER}/tx/${hash}`)
    } catch (err) {
      const cancelled = walletErrorCode(err) === 4001
      setError(cancelled ? 'Funding was cancelled.' : err instanceof Error ? err.message : 'Funding failed')
    } finally {
      setBusy(false)
    }
  }

  async function repay() {
    if (!ready || busy || due == null) return
    setBusy(true)
    setError('')
    try {
      if (!wallet) {
        connectWallet()
        return
      }
      const provider = await wallet.getEthereumProvider()
      const from = await ensureRobinhood(provider)
      if (due > BigInt(0)) {
        const allowance = decodeUint(await ethCall(ROBINHOOD_USDG, encodeAllowance(from, LEND_ADDRESS))) ?? BigInt(0)
        if (allowance < due) {
          await sendRobinhoodCall(provider, from, ROBINHOOD_USDG, encodeApprove(LEND_ADDRESS, due))
        }
      }
      const hash = await sendRobinhoodCall(provider, from, LEND_ADDRESS, encodeRepay(dealId))
      setNote(`${ROBINHOOD_EXPLORER}/tx/${hash}`)
    } catch (err) {
      const cancelled = walletErrorCode(err) === 4001
      setError(cancelled ? 'Repayment was cancelled.' : err instanceof Error ? err.message : 'Repayment failed')
    } finally {
      setBusy(false)
    }
  }

  async function markDefault() {
    setBusy(true)
    setError('')
    try {
      const hash = await send(encodeMarkDefault(dealId))
      if (hash) setNote(`${ROBINHOOD_EXPLORER}/tx/${hash}`)
    } catch (err) {
      const cancelled = walletErrorCode(err) === 4001
      setError(cancelled ? 'Cancelled.' : err instanceof Error ? err.message : 'Default failed')
    } finally {
      setBusy(false)
    }
  }

  async function saveAddress(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!wallet || busy) {
      if (!wallet) connectWallet()
      return
    }
    setBusy(true)
    setError('')
    try {
      const provider = await wallet.getEthereumProvider()
      const from = await ensureRobinhood(provider)
      const signature = await provider.request({
        method: 'personal_sign',
        params: [solanaMessage(orderId, address.trim()), from],
      })
      if (typeof signature !== 'string') throw new Error('Wallet did not sign')
      const res = await fetch('/api/open/solana', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ orderId, address: address.trim(), signature }),
      })
      const body = (await res.json()) as { error?: string }
      if (!res.ok) throw new Error(body.error || 'Address was not saved')
      setNote('Address saved. The card is sent from the vault after the loan is marked defaulted.')
    } catch (err) {
      const cancelled = walletErrorCode(err) === 4001
      setError(cancelled ? 'Cancelled.' : err instanceof Error ? err.message : 'Address was not saved')
    } finally {
      setBusy(false)
    }
  }

  const status = deal ? STATUS[deal.status] ?? 'Unknown' : 'Loading'
  const expired = deal != null && deal.expiresAt > BigInt(0) && Date.now() > Number(deal.expiresAt) * 1000

  return (
    <article className="rounded-3xl border border-white/10 bg-[#14171e] p-5 sm:p-6">
      <div className="grid items-start gap-5 sm:grid-cols-[8rem_minmax(0,1fr)]">
        {imageUrl && <img src={imageUrl} alt="" width={320} height={440} className="mx-auto max-h-40 w-full object-contain" />}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-heading text-xl font-bold text-white">{name}</h3>
            <p className="rounded-full bg-[#ffd12f]/15 px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#ffd12f]">{status}</p>
          </div>
          <p className="text-sm text-[#ffd12f]">{rarity}</p>
          <p className="text-sm leading-relaxed text-[#b1b7c3]">
            Deposit {formatUnits(principal)} USDG. If the vault repays within 7 days, you receive {formatUnits(principal + funderFee)} USDG. Capsule keeps {formatUnits(protocolFee)} USDG on that repayment. If the term ends unpaid, you submit a Solana address and the card is sent to you.
          </p>
          <p className="break-all font-mono text-[11px] text-[#717886]">NFT {nftAddress}</p>
          {deal?.status === 1 && (
            <button type="button" disabled={busy} onClick={() => void fund()} className="h-12 rounded-xl bg-[#3c8aff] text-sm font-bold uppercase tracking-wide text-white disabled:bg-white/10 disabled:text-[#b1b7c3]">
              {busy ? 'Confirm in wallet' : wallet ? `Fund ${formatUnits(principal)} USDG` : 'Connect wallet'}
            </button>
          )}
          {deal?.status === 2 && !expired && isTreasury && (
            <button type="button" disabled={busy} onClick={() => void repay()} className="h-12 rounded-xl bg-[#3c8aff] text-sm font-bold uppercase tracking-wide text-white disabled:bg-white/10 disabled:text-[#b1b7c3]">
              {busy ? 'Confirm in wallet' : `Repay ${due == null ? '' : formatUnits(due)} USDG`}
            </button>
          )}
          {deal?.status === 2 && !expired && !isTreasury && (
            <p className="text-sm leading-relaxed text-[#b1b7c3]">The vault repays this from its own wallet before the term ends.</p>
          )}
          {deal?.status === 2 && expired && (
            <button type="button" disabled={busy} onClick={() => void markDefault()} className="h-12 rounded-xl border border-white/15 text-sm font-bold uppercase tracking-wide text-white disabled:text-[#b1b7c3]">
              Mark default
            </button>
          )}
          {deal?.status === 4 && (
            <form onSubmit={saveAddress} className="flex flex-col gap-2">
              <label htmlFor={`solana-${orderId}`} className="text-sm text-[#eef0f3]">
                Solana address for the card
                <input
                  id={`solana-${orderId}`}
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                  className="mt-1.5 h-12 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white"
                />
              </label>
              <button type="submit" disabled={busy} className="h-12 rounded-xl bg-[#3c8aff] text-sm font-bold uppercase tracking-wide text-white disabled:bg-white/10 disabled:text-[#b1b7c3]">
                {wallet ? 'Save Solana address' : 'Connect wallet'}
              </button>
            </form>
          )}
          {note && <p className="break-all text-xs text-[#b1b7c3]">{note}</p>}
          {error && <p className="text-sm text-[#fc401f]">{error}</p>}
        </div>
      </div>
    </article>
  )
}
