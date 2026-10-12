'use client'

import { useEffect, useRef, useState } from 'react'
import { useConnectWallet, useWallets } from '@privy-io/react-auth'
import { choiceMessage } from '@/lib/gacha/choice-message'
import type { PublicPull } from '@/lib/gacha/pull-store'
import { PackReveal, type RevealPull } from '@/components/gacha/pack-reveal'
import styles from '@/components/gacha/pack-open.module.css'
import {
  HYPERLIQUID_USDC,
  ROBINHOOD_EXPLORER,
  ROBINHOOD_USDG,
  encodeUsdgTransfer,
  ensureHyperliquid,
  ensureRobinhood,
  sendRobinhoodCall,
  usdgAmount,
} from '@/lib/gacha/robinhood-transfer'

type PayNetwork = 'robinhood' | 'hyperliquid'

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

function canOpenAnother(status: string): boolean {
  return status !== 'AWAITING_CHOICE' && status !== 'PAYMENT_CONFIRMED' && status !== 'OPENING'
}

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
  const [network, setNetwork] = useState<PayNetwork>('robinhood')
  const [opening, setOpening] = useState(false)
  const [coin, setCoin] = useState<'idle' | 'spin' | 'win' | 'loss'>('idle')
  const [coinHold, setCoinHold] = useState(false)
  const coinTimer = useRef<number | null>(null)
  const preview = useRevealPreview()
  const storageKey = `capsule-open:${code}`
  const ripcars = code === 'garage_20'

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

  function openAnother() {
    if (coinTimer.current) window.clearTimeout(coinTimer.current)
    window.sessionStorage.removeItem(storageKey)
    setOrder(null)
    setOpening(false)
    setCoin('idle')
    setCoinHold(false)
    setError('')
  }

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
      const hyper = network === 'hyperliquid'
      const provider = await wallet.getEthereumProvider()
      const from = hyper ? await ensureHyperliquid(provider) : await ensureRobinhood(provider)
      const token = hyper ? HYPERLIQUID_USDC : ROBINHOOD_USDG
      const hash = await sendRobinhoodCall(provider, from, token, encodeUsdgTransfer(treasury, usdgAmount(price)))
      window.sessionStorage.setItem(storageKey, hash)
      setOpening(true)
      let saved: PublicPull | null = null
      for (let attempt = 0; attempt < 20; attempt += 1) {
        const res = await fetch('/api/open/pay', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ packType: code, txHash: hash, network }),
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
      setOpening(false)
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
      if (choice === 'DOUBLE') {
        setCoin('spin')
        setCoinHold(true)
      }
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
      if (choice === 'DOUBLE') {
        setCoin(body.order.draw === 'WIN' ? 'win' : 'loss')
        if (coinTimer.current) window.clearTimeout(coinTimer.current)
        coinTimer.current = window.setTimeout(() => setCoinHold(false), reducedMotion() ? 0 : 1200)
      }
    } catch (err) {
      const cancelled = walletErrorCode(err) === 4001
      setCoin('idle')
      setCoinHold(false)
      setError(cancelled ? 'Choice was cancelled.' : err instanceof Error ? err.message : 'Choice failed')
    } finally {
      setBusy(false)
    }
  }

  if (!preview && (opening || order) && !order?.cardName) {
    return (
      <div className={styles.stage} aria-live="polite">
        <p className="text-center text-sm text-[#b1b7c3]">{order ? statusCopy(order) : 'Confirming the payment.'}</p>
        <div className={styles.slab} />
        {order && canOpenAnother(order.status) && (
          <button type="button" onClick={openAnother} className="h-12 rounded-xl bg-[#3c8aff] text-sm font-bold uppercase tracking-wide text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3c8aff]">
            Open another pack
          </button>
        )}
        {error && <p role="alert" className="text-sm text-[#fc401f]">{error}</p>}
      </div>
    )
  }

  if (preview || order?.cardName) {
    const pull = preview ? PREVIEW_PULL : order!
    return (
      <div className={styles.stage}>
        {preview && <p className="text-center text-xs font-semibold uppercase tracking-[0.16em] text-[#717886]">Reveal preview</p>}
        <PackReveal pull={pull} known={preview ? PREVIEW_FACE : null} persist={!preview} footer={preview ? (
          <ChoiceBlock doubleOffered deadline={null} busy={false} disabled={false} onChoose={() => undefined} />
        ) : order ? (
          <>
            {coin !== 'idle' && <Coin face={coin} />}
            {order.status === 'AWAITING_CHOICE' && coin === 'idle' && (
              <ChoiceBlock
                doubleOffered={order.doubleOffered}
                deadline={order.choiceDeadline}
                busy={busy}
                disabled={false}
                onChoose={(choice) => void choose(choice)}
              />
            )}
            {!coinHold && order.status !== 'AWAITING_CHOICE' && (
              <p className="text-sm leading-relaxed text-[#b1b7c3]">{statusCopy(order)}</p>
            )}
            {!coinHold && canOpenAnother(order.status) && (
              <button type="button" onClick={openAnother} className="h-12 rounded-xl bg-[#3c8aff] text-sm font-bold uppercase tracking-wide text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3c8aff]">
                Open another pack
              </button>
            )}
            {order.payoutHash && order.payoutHash !== 'zero' && (
              <a href={txLink(order.payoutHash)} className="text-xs text-[#3c8aff] underline">Payout transaction</a>
            )}
          </>
        ) : null} />
        {error && <p role="alert" className="text-sm text-[#fc401f]">{error}</p>}
      </div>
    )
  }

  const hyper = network === 'hyperliquid'
  const tokenName = hyper ? 'USDC' : 'USDG'
  const payHelp = ripcars
    ? hyper
      ? `Pay ${price} USDC on Hyperliquid. Keep a little HYPE for gas. The pack opens on Solana and the card is sold there. Buyback is paid in USDG on Robinhood.`
      : `Pay ${price} USDG on Robinhood. The pack opens on Solana, the card is sold there, and the buyback is paid back in USDG.`
    : hyper
      ? `Pay ${price} USDC on Hyperliquid. Keep a little HYPE for gas. Buyback is still paid in USDG on Robinhood. The pack opens in the vault, then you choose buyback. Double appears only if the card is Common.`
      : `Pay ${price} USDG on Robinhood. The pack opens in the vault, then you choose buyback. Double appears only if the card is Common.`

  return (
    <form onSubmit={pay} className="flex flex-col gap-3">
      <p id="pack-pay-help" className="text-base leading-relaxed text-[#b1b7c3]">
        {order ? statusCopy(order) : payHelp}
      </p>
      {!order && (
        <fieldset className="m-0 flex flex-col gap-2 border-0 p-0" disabled={busy}>
          <legend className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#717886]">Pay With</legend>
          <div className="grid grid-cols-2 gap-2">
            <PayNetworkOption
              value="robinhood"
              label="Robinhood"
              checked={network === 'robinhood'}
              onSelect={setNetwork}
            />
            <PayNetworkOption
              value="hyperliquid"
              label="Hyperliquid"
              checked={network === 'hyperliquid'}
              onSelect={setNetwork}
            />
          </div>
        </fieldset>
      )}
      {!order && reason && <p className="text-sm text-[#ffd12f]">{reason}</p>}
      {error && <p role="alert" className="text-sm text-[#fc401f]">{error}</p>}
      {!order && (
        <button
          type="submit"
          disabled={!openReady || busy || !treasury}
          aria-describedby="pack-pay-help"
          className="h-12 rounded-xl bg-[#3c8aff] text-sm font-bold uppercase tracking-wide text-white disabled:bg-white/10 disabled:text-[#b1b7c3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3c8aff]"
        >
          {busy ? 'Confirm in Wallet' : wallet ? `Open for ${price} ${tokenName}` : 'Connect Wallet'}
        </button>
      )}
    </form>
  )
}

function PayNetworkOption({
  value,
  label,
  checked,
  onSelect,
}: {
  value: PayNetwork
  label: string
  checked: boolean
  onSelect: (value: PayNetwork) => void
}) {
  const id = `pack-pay-${value}`
  return (
    <label
      htmlFor={id}
      className="flex h-12 cursor-pointer items-center gap-3 rounded-xl border border-white/15 px-3 text-base text-white has-[:checked]:border-[#3c8aff] has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[#3c8aff]"
    >
      <input
        id={id}
        type="radio"
        name="network"
        value={value}
        checked={checked}
        onChange={() => onSelect(value)}
        className="size-4 accent-[#3c8aff]"
      />
      {label}
    </label>
  )
}

const PREVIEW_PULL: RevealPull = {
  id: 'preview-reveal',
  cardName: '2021 Pokemon Sword & Shield Evolving Skies Gold Rare Froslass #226',
  rarity: 'Common',
  imageUrl: 'https://d1xpxki1g4htqu.cloudfront.net/FVSM83GD7L2V_LG75OJXGGs5ajmu5Zl0D3FeIWVPYzQ',
  nftAddress: null,
  insuredUsd: '29',
  buybackUsd: '24.65',
}

const PREVIEW_FACE = {
  year: '2021',
  grade: 'CGC 10',
  backUrl: 'https://d1xpxki1g4htqu.cloudfront.net/SusoXraOPzXsfTM-0sJCwvLO_KlmqK5C4uYFTxS1WQA',
}

function useRevealPreview(): boolean {
  const [on, setOn] = useState(false)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const enabled = params.get('preview') === 'reveal'
    setOn(enabled)
    if (enabled) document.getElementById('pack-detail')?.scrollIntoView({ block: 'center' })
  }, [])
  return on
}

function ChoiceBlock({
  doubleOffered,
  deadline,
  busy,
  disabled,
  onChoose,
}: {
  doubleOffered: boolean
  deadline: string | null
  busy: boolean
  disabled: boolean
  onChoose: (choice: 'BUYBACK' | 'DOUBLE') => void
}) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm leading-relaxed text-[#b1b7c3]">
        Buyback pays the quote
        {doubleOffered ? '. Double flips a coin: heads pays 2×, and heads lands 49% of the time. The card is listed either way. A win is sold back if nobody funds it within 2 days.' : '. Double is only shown on a Common card.'}
        {deadline ? ` Choose before ${new Date(deadline).toLocaleString()}.` : ''}
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={disabled || busy} onClick={() => onChoose('BUYBACK')} className="h-12 rounded-xl bg-[#3c8aff] px-4 text-sm font-bold uppercase tracking-wide text-white disabled:bg-white/10 disabled:text-[#b1b7c3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3c8aff]">
          Buyback
        </button>
        {doubleOffered && (
          <button type="button" disabled={disabled || busy} onClick={() => onChoose('DOUBLE')} className="h-12 rounded-xl border border-[#ffd12f] px-4 text-sm font-bold uppercase tracking-wide text-[#ffd12f] disabled:border-white/10 disabled:text-[#b1b7c3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3c8aff]">
            Double
          </button>
        )}
      </div>
    </div>
  )
}

function reducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function Coin({ face }: { face: 'spin' | 'win' | 'loss' }) {
  const reduced = reducedMotion()
  const pose = reduced
    ? face === 'loss' ? styles.showTails : ''
    : face === 'spin' ? styles.spin : face === 'win' ? styles.landWin : styles.landLoss
  return (
    <div className={styles.coinScene} aria-label={face === 'spin' ? 'Flipping the coin' : face === 'win' ? 'Heads' : 'Tails'}>
      <div className={`${styles.coin} ${pose}`}>
        <div className={`${styles.face} ${styles.heads}`}>Heads</div>
        <div className={`${styles.face} ${styles.tails}`}>Tails</div>
      </div>
      <p className="text-center text-xs uppercase tracking-wide text-[#b1b7c3]">
        {face === 'spin' ? '49% heads' : face === 'win' ? 'Heads · 2×' : 'Tails'}
      </p>
    </div>
  )
}

function statusCopy(order: PublicPull): string {
  switch (order.status) {
    case 'PAYMENT_CONFIRMED':
    case 'OPENING':
      return 'Payment confirmed. The pack is opening.'
    case 'BUYBACK_CONFIRMED':
    case 'PAYOUT_PENDING':
      return order.choice === 'DOUBLE' ? 'Double won. The 2× buyback is being paid, and the card is listed for 2 days.' : 'Buyback confirmed. The refund is being paid.'
    case 'PAID_OUT':
      return order.choice === 'DOUBLE' && order.draw === 'WIN' && order.lendDealId
        ? `Paid ${order.payoutUsd ?? ''} USDG. The card is listed. If nobody funds it within 2 days, the vault sells it.`
        : `Paid ${order.payoutUsd ?? ''} USDG.`
    case 'DOUBLE_WON':
      return 'Double won. The 2× buyback is next, and the card is listed for 2 days.'
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
