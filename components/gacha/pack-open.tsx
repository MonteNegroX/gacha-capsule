'use client'

import { useEffect, useState } from 'react'
import { useConnectWallet, useWallets } from '@privy-io/react-auth'
import { choiceMessage } from '@/lib/gacha/choice-message'
import type { PublicPull } from '@/lib/gacha/pull-store'
import {
  ROBINHOOD_EXPLORER,
  ROBINHOOD_USDG,
  encodeUsdgTransfer,
  ensureRobinhood,
  sendRobinhoodCall,
  usdgAmount,
} from '@/lib/gacha/robinhood-transfer'

const WAITING = new Set([
  'PAYMENT_CONFIRMED',
  'OPENING',
  'BUYBACK_CONFIRMED',
  'DOUBLE_WON',
  'PAYOUT_PENDING',
  'REFUND_PENDING',
  'OPENING_FAILED',
  'LEND_QUEUED',
])

function walletErrorCode(err: unknown): number | null {
  if (typeof err === 'object' && err !== null && 'code' in err && typeof err.code === 'number') return err.code
  return null
}

function txLink(hash: string): string {
  return `${ROBINHOOD_EXPLORER}/tx/${hash}`
}

export function PackOpen({
  code,
  price,
  treasury,
}: {
  code: string
  price: number
  treasury: string
}) {
  const { wallets, ready: walletsReady } = useWallets()
  const { connectWallet } = useConnectWallet()
  const wallet = wallets.find((item) => item.type === 'ethereum' && item.walletClientType !== 'privy' && item.walletClientType !== 'privy-v2')
  const [reason, setReason] = useState('Checking the machine.')
  const [openReady, setOpenReady] = useState(false)
  const [order, setOrder] = useState<PublicPull | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const storageKey = `capsule-open:${code}`

  useEffect(() => {
    let stop = false
    async function loadReady() {
      try {
        const res = await fetch(`/api/open/ready?pack=${code}`)
        const body = (await res.json()) as { ready?: boolean; reason?: string }
        if (stop) return
        setOpenReady(body.ready === true)
        setReason(body.ready ? '' : body.reason || 'This machine is not open.')
      } catch {
        if (!stop) {
          setOpenReady(false)
          setReason('The machine list is unavailable.')
        }
      }
    }
    const saved = window.sessionStorage.getItem(storageKey)
    if (saved && /^0x[a-fA-F0-9]{64}$/.test(saved)) {
      void fetch(`/api/open/order?tx=${saved}`)
        .then((res) => res.json())
        .then((body: { order?: PublicPull }) => {
          if (!stop && body.order) setOrder(body.order)
        })
        .catch(() => undefined)
    }
    void loadReady()
    const timer = window.setInterval(loadReady, 20_000)
    return () => {
      stop = true
      window.clearInterval(timer)
    }
  }, [code, storageKey])

  useEffect(() => {
    if (!order || !WAITING.has(order.status)) return
    let stop = false
    const timer = window.setInterval(() => {
      void fetch(`/api/open/order?id=${order.id}`)
        .then((res) => res.json())
        .then((body: { order?: PublicPull }) => {
          if (!stop && body.order) setOrder(body.order)
        })
        .catch(() => undefined)
    }, 4000)
    return () => {
      stop = true
      window.clearInterval(timer)
    }
  }, [order])

  async function pay(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!walletsReady || busy) return
    if (!wallet) {
      connectWallet()
      return
    }
    setBusy(true)
    setError('')
    try {
      const provider = await wallet.getEthereumProvider()
      const from = await ensureRobinhood(provider)
      const hash = await sendRobinhoodCall(provider, from, ROBINHOOD_USDG, encodeUsdgTransfer(treasury, usdgAmount(price)))
      window.sessionStorage.setItem(storageKey, hash)
      let saved: PublicPull | null = null
      for (let attempt = 0; attempt < 20; attempt += 1) {
        const res = await fetch('/api/open/pay', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ packType: code, txHash: hash }),
        })
        const body = (await res.json()) as { order?: PublicPull; error?: string; pending?: boolean }
        if (body.order) {
          saved = body.order
          break
        }
        if (!body.pending) throw new Error(body.error || 'Payment was not accepted')
        await new Promise((resolve) => setTimeout(resolve, 2000))
      }
      if (!saved) throw new Error('Payment is still confirming')
      setOrder(saved)
    } catch (err) {
      const cancelled = walletErrorCode(err) === 4001
      setError(cancelled ? 'Payment was cancelled.' : err instanceof Error ? err.message : 'Payment failed')
    } finally {
      setBusy(false)
    }
  }

  async function choose(choice: 'BUYBACK' | 'DOUBLE') {
    if (!wallet || !order || busy) return
    setBusy(true)
    setError('')
    try {
      const provider = await wallet.getEthereumProvider()
      const from = await ensureRobinhood(provider)
      const signature = await provider.request({
        method: 'personal_sign',
        params: [choiceMessage(order.id, choice), from],
      })
      if (typeof signature !== 'string') throw new Error('Wallet did not sign the choice')
      const res = await fetch('/api/open/choice', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ orderId: order.id, choice, signature }),
      })
      const body = (await res.json()) as { order?: PublicPull; error?: string }
      if (!res.ok || !body.order) throw new Error(body.error || 'Choice was not saved')
      setOrder(body.order)
    } catch (err) {
      const cancelled = walletErrorCode(err) === 4001
      setError(cancelled ? 'Choice was cancelled.' : err instanceof Error ? err.message : 'Choice failed')
    } finally {
      setBusy(false)
    }
  }

  if (order?.cardName) {
    return (
      <div className="flex flex-col gap-4">
        <div className="grid items-center gap-4 sm:grid-cols-[8rem_minmax(0,1fr)]">
          {order.imageUrl && (
            <img src={order.imageUrl} alt="" width={320} height={440} className="mx-auto max-h-40 w-full object-contain" />
          )}
          <div>
            <p className="font-heading text-xl font-bold text-white">{order.cardName}</p>
            <p className="mt-1 text-sm text-[#ffd12f]">{order.rarity}</p>
            <dl className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-black/30 px-3 py-2">
                <dt className="text-[10px] uppercase tracking-wide text-[#717886]">Insured</dt>
                <dd className="font-heading text-lg font-bold text-white">{order.insuredUsd ? `$${order.insuredUsd}` : '—'}</dd>
              </div>
              <div className="rounded-xl bg-black/30 px-3 py-2">
                <dt className="text-[10px] uppercase tracking-wide text-[#717886]">Buyback</dt>
                <dd className="font-heading text-lg font-bold text-[#ffd12f]">{order.buybackUsd ? `${order.buybackUsd} USDG` : '—'}</dd>
              </div>
            </dl>
          </div>
        </div>
        {order.status === 'AWAITING_CHOICE' && (
          <div className="flex flex-col gap-3">
            <p className="text-sm leading-relaxed text-[#b1b7c3]">
              Buyback pays the quote
              {order.doubleOffered ? ', or Double pays 2× that quote if the roll wins. Double is only on this Common card.' : '. Double is only shown on a Common card.'}
              {order.choiceDeadline ? ` Choose before ${new Date(order.choiceDeadline).toLocaleString()}.` : ''}
            </p>
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={busy} onClick={() => void choose('BUYBACK')} className="h-12 rounded-xl bg-[#3c8aff] px-4 text-sm font-bold uppercase tracking-wide text-white disabled:bg-white/10 disabled:text-[#b1b7c3]">
                Buyback
              </button>
              {order.doubleOffered && (
                <button type="button" disabled={busy} onClick={() => void choose('DOUBLE')} className="h-12 rounded-xl border border-[#ffd12f] px-4 text-sm font-bold uppercase tracking-wide text-[#ffd12f] disabled:border-white/10 disabled:text-[#b1b7c3]">
                  Double
                </button>
              )}
            </div>
          </div>
        )}
        {order.status !== 'AWAITING_CHOICE' && (
          <p className="text-sm leading-relaxed text-[#b1b7c3]">{statusCopy(order)}</p>
        )}
        {order.payoutHash && order.payoutHash !== 'zero' && (
          <a href={txLink(order.payoutHash)} className="text-xs text-[#3c8aff] underline">Payout transaction</a>
        )}
        {error && <p className="text-sm text-[#fc401f]">{error}</p>}
      </div>
    )
  }

  return (
    <form onSubmit={pay} className="flex flex-col gap-3">
      <p className="text-sm leading-relaxed text-[#b1b7c3]">
        {order ? statusCopy(order) : `Pay ${price} USDG on Robinhood. The pack opens in the vault, then you choose buyback. Double appears only if the card is Common.`}
      </p>
      {!order && reason && <p className="text-sm text-[#ffd12f]">{reason}</p>}
      {error && <p className="text-sm text-[#fc401f]">{error}</p>}
      {!order && (
        <button
          type="submit"
          disabled={!openReady || busy || !treasury}
          className="h-12 rounded-xl bg-[#3c8aff] text-sm font-bold uppercase tracking-wide text-white disabled:bg-white/10 disabled:text-[#b1b7c3]"
        >
          {busy ? 'Confirm in wallet' : wallet ? `Open for ${price} USDG` : 'Connect wallet'}
        </button>
      )}
    </form>
  )
}

function statusCopy(order: PublicPull): string {
  switch (order.status) {
    case 'PAYMENT_CONFIRMED':
    case 'OPENING':
      return 'Payment confirmed. The pack is opening.'
    case 'BUYBACK_CONFIRMED':
    case 'PAYOUT_PENDING':
      return order.choice === 'DOUBLE' ? 'Double won. The 2× buyback is being paid.' : 'Buyback confirmed. The refund is being paid.'
    case 'PAID_OUT':
      return `Paid ${order.payoutUsd ?? ''} USDG.`
    case 'DOUBLE_WON':
      return 'Double won. The payout is next.'
    case 'DOUBLE_LOST':
    case 'LEND_QUEUED':
    case 'LEND_LISTED':
      return 'Double lost. The card is listed for a 7-day fund. You are not paid.'
    case 'REFUND_PENDING':
      return order.error || 'This payment is being returned.'
    case 'REFUNDED':
      return 'The payment was returned.'
    case 'MANUAL_REVIEW':
      return order.error || 'This open needs a manual check.'
    default:
      return order.error || 'The order is in progress.'
  }
}
