'use client'

import { useEffect, useState } from 'react'
import { useConnectWallet, useWallets } from '@privy-io/react-auth'
import { RecordTable } from '@/components/record-table'
import { choiceLabel } from '@/lib/gacha/open-label'
import type { PlayerHistory } from '@/lib/gacha/stats'
import { formatUnits } from '@/lib/gacha/units'

function usd(raw: string | null): string {
  if (!raw || !/^\d+$/.test(raw)) return '—'
  return `${formatUnits(BigInt(raw))} USDG`
}

export function ProfileDesk() {
  const { wallets, ready } = useWallets()
  const { connectWallet } = useConnectWallet()
  const wallet = wallets.find((item) => item.type === 'ethereum' && item.walletClientType !== 'privy' && item.walletClientType !== 'privy-v2')
  const address = wallet?.address ?? ''
  const [history, setHistory] = useState<PlayerHistory | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!address) {
      setHistory(null)
      return
    }
    let stop = false
    setError('')
    fetch(`/api/open/history?address=${address}`)
      .then(async (res) => {
        const body = (await res.json()) as PlayerHistory & { error?: string }
        if (!res.ok) throw new Error(body.error || 'History failed')
        if (!stop) setHistory(body)
      })
      .catch((err: unknown) => {
        if (!stop) setError(err instanceof Error ? err.message : 'History failed')
      })
    return () => {
      stop = true
    }
  }, [address])

  return (
    <div className="flex flex-col gap-8">
      <header className="flex max-w-2xl flex-col gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#3c8aff]">Profile</p>
        <h1 className="font-heading text-4xl font-bold tracking-tight text-white sm:text-5xl">Your Opens.</h1>
        <p className="text-sm leading-relaxed text-[#b1b7c3] sm:text-base">
          History for the wallet that paid on Robinhood. Quest points stay on the homepage.
        </p>
      </header>

      {!ready ? <p className="text-sm text-[#b1b7c3]">Checking the wallet.</p> : null}
      {ready && !address ? (
        <button type="button" onClick={() => connectWallet()} className="h-12 max-w-xs rounded-xl bg-[#3c8aff] text-sm font-bold uppercase tracking-wide text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3c8aff]">
          Connect Wallet
        </button>
      ) : null}
      {address ? <p className="break-all font-mono text-xs text-[#717886]">{address}</p> : null}
      {error ? <p role="alert" className="text-sm text-[#fc401f]">{error}</p> : null}

      {history ? (
        <>
          <section aria-label="Your totals" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Opens" value={String(history.opens)} />
            <Stat label="Spent" value={usd(history.spentRaw)} />
            <Stat label="Received" value={usd(history.receivedRaw)} />
            <Stat label="Double" value={`${history.wins} wins / ${history.losses} losses`} />
          </section>
          {history.orders.length === 0 ? (
            <p className="text-sm text-[#b1b7c3]">This wallet has not opened a pack.</p>
          ) : (
            <RecordTable
              caption="Your pack openings"
              columns={['Card', 'Choice', 'Buyback', 'Received', 'Status']}
              rows={history.orders.map((row) => ({
                key: row.id,
                cells: [
                  { label: 'Card', value: row.card },
                  { label: 'Choice', value: choiceLabel(row.choice, row.draw) },
                  { label: 'Buyback', value: usd(row.buybackRaw) },
                  { label: 'Received', value: usd(row.payoutRaw) },
                  { label: 'Status', value: row.status.replaceAll('_', ' ').toLowerCase() },
                ],
              }))}
            />
          )}
        </>
      ) : null}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#14171e] px-4 py-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#717886]">{label}</p>
      <p className="mt-2 font-heading text-xl font-bold text-white">{value}</p>
    </div>
  )
}
