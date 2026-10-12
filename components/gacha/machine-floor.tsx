'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type { GachaMachine, Rarity, SpinResult } from '@/lib/gacha/types'
import { CapsuleMachine, toneForCategory } from '@/components/gacha/capsule-machine'
import {
  ROBINHOOD_CHAIN_HEX,
  ROBINHOOD_EXPLORER,
  ROBINHOOD_RPC,
  ROBINHOOD_USDG,
  encodeUsdgTransfer,
  usdgAmount,
} from '@/lib/gacha/robinhood-transfer'

const RARITIES: { id: Rarity; label: string; swatch: string }[] = [
  { id: 'common', label: 'Common', swatch: 'bg-[#b1b7c3]' },
  { id: 'uncommon', label: 'Uncommon', swatch: 'bg-[#3c8aff]' },
  { id: 'rare', label: 'Rare', swatch: 'bg-[#ffd12f]' },
  { id: 'epic', label: 'Epic', swatch: 'bg-[#fea8cd]' },
]

function money(value: number): string {
  const digits = Number.isInteger(value) ? 0 : 2
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: digits,
    maximumFractionDigits: 2,
  })
}

function percent(value: number): string {
  const pct = value * 100
  return `${Number.isInteger(pct) ? pct.toFixed(0) : pct.toFixed(1)}%`
}

function slabColor(rarity: string): string {
  if (rarity === 'epic') return '#fea8cd'
  if (rarity === 'rare') return '#ffd12f'
  if (rarity === 'uncommon') return '#3c8aff'
  return '#b1b7c3'
}

type PayOrder = {
  orderId: string
  status: string
  packType: string
  error: string | null
  cardName?: string | null
  rarity?: string | null
  buybackAmount?: number | null
  payoutTx?: string | null
}

type Props = {
  mode: 'preview' | 'lab'
  machines: GachaMachine[]
  unavailable?: boolean
  liveEnabled?: boolean
  treasuryConfigured?: boolean
  treasuryAddress?: string
}

type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
}

function walletErrorCode(err: unknown): number | null {
  if (typeof err === 'object' && err !== null && 'code' in err && typeof err.code === 'number') return err.code
  return null
}

function browserWallet(): EthereumProvider | null {
  if (typeof window === 'undefined') return null
  const value = (window as Window & { ethereum?: EthereumProvider }).ethereum
  if (!value || typeof value.request !== 'function') return null
  return value
}

export function MachineFloor({ mode, machines, unavailable, liveEnabled = false, treasuryConfigured = false, treasuryAddress = '' }: Props) {
  const categories = useMemo(() => {
    const seen: string[] = []
    for (const machine of machines) {
      if (!seen.includes(machine.category)) seen.push(machine.category)
    }
    return seen
  }, [machines])

  const starter = machines.find((machine) => machine.code === 'pokemon_25') ?? machines[0]
  const [category, setCategory] = useState(starter?.category ?? categories[0] ?? '')
  const visible = useMemo(
    () => machines.filter((machine) => machine.category === category),
    [machines, category],
  )
  const [code, setCode] = useState(starter?.code ?? '')
  const selected = machines.find((machine) => machine.code === code) ?? visible[0] ?? machines[0]

  const [turbo, setTurbo] = useState(true)
  const [busy, setBusy] = useState<'test' | 'live' | 'drop' | null>(null)
  const [error, setError] = useState('')
  const [result, setResult] = useState<SpinResult | null>(null)
  const [confirmLive, setConfirmLive] = useState(false)
  const [confirmDrop, setConfirmDrop] = useState(false)
  const [txHash, setTxHash] = useState('')
  const [payBusy, setPayBusy] = useState(false)
  const [payError, setPayError] = useState('')
  const [payOrder, setPayOrder] = useState<PayOrder | null>(null)
  const [payReplay, setPayReplay] = useState(false)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const machineClipBase = useId().replace(/:/g, '')

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (result && !dialog.open) dialog.showModal()
    if (!result && dialog.open) dialog.close()
  }, [result])

  useEffect(() => {
    if (!visible.some((machine) => machine.code === code) && visible[0]) {
      setCode(visible[0].code)
    }
  }, [category, code, visible])

  async function spin(live: boolean) {
    if (!selected || mode !== 'lab') return
    setBusy(live ? 'live' : 'test')
    setError('')
    try {
      const res = await fetch('/api/lab/open', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          packType: selected.code,
          turbo: turbo && selected.turboMode,
          live,
          confirm: live ? 'OPEN' : '',
        }),
      })
      const body = (await res.json()) as { result?: SpinResult; error?: string }
      if (!res.ok || !body.result) {
        setError(body.error || 'Spin failed')
        return
      }
      setResult(body.result)
      setConfirmLive(false)
    } catch {
      setError('Spin failed')
    } finally {
      setBusy(null)
    }
  }

  async function dropCard() {
    if (!selected || mode !== 'lab' || !confirmDrop) return
    setBusy('drop')
    setError('')
    try {
      const res = await fetch('/api/lab/drop', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ packType: selected.code, confirm: 'DROP' }),
      })
      const body = (await res.json()) as { result?: SpinResult; error?: string }
      if (!res.ok || !body.result) {
        setError(body.error || 'Card drop failed')
        return
      }
      setResult(body.result)
      setConfirmDrop(false)
    } catch {
      setError('Card drop failed')
    } finally {
      setBusy(null)
    }
  }

  function syncHashValidity(field: HTMLInputElement) {
    field.setAttribute('aria-invalid', field.matches(':user-invalid') ? 'true' : 'false')
  }

  async function submitPayment(hash: string) {
    if (!selected || mode !== 'lab' || !treasuryConfigured) return
    setPayBusy(true)
    setPayError('')
    setPayOrder(null)
    setPayReplay(false)
    try {
      for (let attempt = 0; attempt < 8; attempt += 1) {
        const res = await fetch('/api/lab/payment', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ packType: selected.code, txHash: hash }),
        })
        const body = (await res.json()) as { error?: string; replay?: boolean; order?: PayOrder | null; result?: SpinResult | null }
        setPayReplay(Boolean(body.replay))
        if (body.order) setPayOrder(body.order)
        if (body.result) {
          setResult(body.result)
          return
        }
        const pending = /not found yet|Waiting for confirmations/i.test(body.error ?? '')
        if (res.ok || !pending || attempt === 7) {
          if (!res.ok) setPayError(body.order?.error || body.error || 'Payment check failed')
          return
        }
        await new Promise((resolve) => setTimeout(resolve, 2000))
      }
    } catch {
      setPayError('Payment check failed')
    } finally {
      setPayBusy(false)
    }
  }

  async function checkPayment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const field = event.currentTarget.elements.namedItem('txHash')
    if (!(field instanceof HTMLInputElement) || !field.validity.valid) return
    await submitPayment(field.value.trim())
  }

  async function payOnRobinhood() {
    if (!selected || !treasuryAddress) return
    const wallet = browserWallet()
    if (!wallet) {
      setPayError('No wallet in this browser. Paste the transaction hash instead.')
      return
    }
    setPayBusy(true)
    setPayError('')
    try {
      try {
        await wallet.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: ROBINHOOD_CHAIN_HEX }] })
      } catch (err) {
        if (walletErrorCode(err) !== 4902) throw err
        await wallet.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: ROBINHOOD_CHAIN_HEX,
            chainName: 'Robinhood Chain',
            nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
            rpcUrls: [ROBINHOOD_RPC],
            blockExplorerUrls: [ROBINHOOD_EXPLORER],
          }],
        })
      }
      const accounts = await wallet.request({ method: 'eth_requestAccounts' })
      const from = Array.isArray(accounts) ? accounts[0] : ''
      if (typeof from !== 'string' || !from) throw new Error('Wallet did not return an account')
      const hash = await wallet.request({
        method: 'eth_sendTransaction',
        params: [{
          from,
          to: ROBINHOOD_USDG,
          data: encodeUsdgTransfer(treasuryAddress, usdgAmount(selected.price)),
          value: '0x0',
        }],
      })
      if (typeof hash !== 'string' || !/^0x[a-fA-F0-9]{64}$/.test(hash)) {
        throw new Error('Wallet did not return a transaction hash')
      }
      setTxHash(hash)
      setPayBusy(false)
      await submitPayment(hash)
    } catch (err) {
      const cancelled = walletErrorCode(err) === 4001
      setPayError(cancelled ? 'Payment was cancelled.' : err instanceof Error ? err.message : 'Payment failed')
      setPayBusy(false)
    }
  }

  return (
    <section id={mode === 'preview' ? 'packs' : undefined} className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#3c8aff]">Machines</p>
        <h2 className="font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl">
          {mode === 'lab' ? 'Test a pull' : 'The floor'}
        </h2>
        <p className="max-w-2xl text-sm leading-relaxed text-[#b1b7c3] sm:text-base">
          {mode === 'lab'
            ? 'Same layout as the public floor. Test spin rolls the published odds and stops there. It does not spend USDC.'
            : 'Pick a machine, read the odds, the expected value, and the instant buyback. Opening is not on this page.'}
        </p>
      </div>

      {unavailable || machines.length === 0 ? (
        <p className="rounded-2xl border border-white/10 bg-[#14171e] px-4 py-6 text-sm text-[#b1b7c3]">
          Pack list is unavailable right now.
        </p>
      ) : (
        <>
          <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Pack categories">
            {categories.map((name) => {
              const active = name === category
              return (
                <button
                  key={name}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setCategory(name)}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wide ${
                    active ? 'bg-[#3c8aff] text-white' : 'bg-white/5 text-[#b1b7c3] hover:text-white'
                  }`}
                >
                  {name}
                </button>
              )
            })}
          </div>

          <div className="flex gap-3 overflow-x-auto pb-1" aria-label="Machines">
            {visible.map((machine, index) => {
              const active = machine.code === selected?.code
              return (
                <button
                  key={machine.code}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setCode(machine.code)}
                  className={`flex w-32 shrink-0 flex-col items-start gap-2 rounded-2xl border p-2 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3c8aff] ${
                    active ? 'border-[#3c8aff] bg-[#3c8aff]/10' : 'border-white/10 bg-[#14171e] hover:border-white/25'
                  }`}
                >
                  <CapsuleMachine
                    price={money(machine.price)}
                    tone={toneForCategory(machine.category)}
                    clipId={`${machineClipBase}-rail-${index}`}
                  />
                  <span className="line-clamp-2 text-[11px] font-semibold leading-tight text-white">{machine.name}</span>
                  <span className="text-xs font-bold text-[#ffd12f]">{money(machine.price)}</span>
                </button>
              )
            })}
          </div>

          {selected && (
            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
              <div className="relative flex min-h-[28rem] items-end justify-center overflow-hidden rounded-3xl border border-white/10 bg-[#0a0a0a] px-6 pt-6 pb-2">
                <div className="w-full max-w-[17rem] drop-shadow-[0_24px_40px_rgba(60,138,255,0.28)]">
                  <CapsuleMachine
                    price={money(selected.price)}
                    tone={toneForCategory(selected.category)}
                    spinning={busy !== null}
                    clipId={`${machineClipBase}-hero`}
                  />
                </div>
              </div>

              <aside className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-[#14171e] p-5">
                <div>
                  <h3 className="font-heading text-2xl font-bold text-white">{selected.name}</h3>
                  <p className="mt-1 text-sm text-[#b1b7c3]">{selected.category}</p>
                </div>

                <dl className="grid grid-cols-3 gap-2">
                  <div className="rounded-xl bg-black/30 px-3 py-2">
                    <dt className="text-[10px] uppercase tracking-wide text-[#717886]">Price</dt>
                    <dd className="font-heading text-lg font-bold text-white">{money(selected.price)}</dd>
                  </div>
                  <div className="rounded-xl bg-black/30 px-3 py-2">
                    <dt className="text-[10px] uppercase tracking-wide text-[#717886]">EV</dt>
                    <dd className="font-heading text-lg font-bold text-white">{money(selected.ev)}</dd>
                  </div>
                  <div className="rounded-xl bg-black/30 px-3 py-2">
                    <dt className="text-[10px] uppercase tracking-wide text-[#717886]">Buyback</dt>
                    <dd className="font-heading text-lg font-bold text-[#ffd12f]">{selected.instantBuyback}%</dd>
                  </div>
                </dl>

                <ul className="flex flex-col gap-2">
                  {RARITIES.map((rarity) => {
                    const chance = selected.odds[rarity.id] ?? 0
                    const band = selected.tierRanges[rarity.id]
                    return (
                      <li key={rarity.id} className="grid grid-cols-[5.5rem_1fr_auto] items-center gap-2 text-xs">
                        <span className="flex items-center gap-2 text-[#eef0f3]">
                          <span className={`size-2 rounded-full ${rarity.swatch}`} />
                          {rarity.label}
                        </span>
                        <span className="h-1.5 overflow-hidden rounded-full bg-white/10">
                          <span className={`block h-full ${rarity.swatch}`} style={{ width: `${Math.max(chance * 100, 1)}%` }} />
                        </span>
                        <span className="text-right text-[#b1b7c3]">
                          {percent(chance)}
                          {band ? ` · ${money(band.start)}–${money(band.end)}` : ''}
                        </span>
                      </li>
                    )
                  })}
                </ul>

                <label className="flex items-center justify-between gap-3 rounded-xl border border-white/10 px-3 py-2 text-sm">
                  <span>
                    <span className="block font-semibold text-white">Turbo</span>
                    <span className="text-xs text-[#717886]">Sells a Common as soon as it lands</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={turbo && selected.turboMode}
                    disabled={mode !== 'lab' || !selected.turboMode || busy !== null}
                    onChange={(event) => setTurbo(event.target.checked)}
                    className="size-4 accent-[#3c8aff]"
                  />
                </label>

                {mode === 'preview' ? (
                  <button
                    type="button"
                    disabled
                    className="h-12 rounded-xl bg-white/10 text-sm font-bold uppercase tracking-wide text-[#b1b7c3]"
                  >
                    Early access
                  </button>
                ) : (
                  <div className="flex flex-col gap-3">
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() => spin(false)}
                      className="h-12 rounded-xl bg-[#3c8aff] text-sm font-bold uppercase tracking-wide text-white hover:bg-[#0000ff] disabled:opacity-60"
                    >
                      {busy === 'test' ? 'Rolling…' : 'Test spin'}
                    </button>
                    <label className="flex items-start gap-2 text-xs text-[#b1b7c3]">
                      <input
                        type="checkbox"
                        checked={confirmDrop}
                        disabled={busy !== null}
                        onChange={(event) => setConfirmDrop(event.target.checked)}
                        className="mt-0.5 size-4 accent-[#ffd12f]"
                      />
                      <span>
                        Spend {money(selected.price)} USDC from the bot wallet and show the card. Turbo stays off.
                      </span>
                    </label>
                    <button
                      type="button"
                      disabled={!confirmDrop || busy !== null}
                      onClick={() => void dropCard()}
                      className="h-12 rounded-xl bg-[#ffd12f] text-sm font-bold uppercase tracking-wide text-[#0a0b0d] disabled:opacity-40"
                    >
                      {busy === 'drop' ? 'Opening…' : 'Drop the card'}
                    </button>
                    <label className="flex items-start gap-2 text-xs text-[#b1b7c3]">
                      <input
                        type="checkbox"
                        checked={confirmLive}
                        disabled={!liveEnabled || busy !== null}
                        onChange={(event) => setConfirmLive(event.target.checked)}
                        className="mt-0.5 size-4 accent-[#fc401f]"
                      />
                      <span>
                        Live open spends USDC from the bot wallet
                        {liveEnabled ? '.' : ' and is switched off.'}
                      </span>
                    </label>
                    <button
                      type="button"
                      disabled={!liveEnabled || !confirmLive || busy !== null}
                      onClick={() => spin(true)}
                      className="h-10 rounded-xl border border-[#fc401f]/50 text-sm font-semibold text-[#fc401f] disabled:opacity-40"
                    >
                      {busy === 'live' ? 'Opening…' : 'Open for real'}
                    </button>
                    <form method="post" action="/api/lab/payment" onSubmit={checkPayment} className="flex flex-col gap-2 border-t border-white/10 pt-3">
                      <fieldset disabled={!treasuryConfigured || payBusy} className="flex min-w-0 flex-col gap-2 border-0 p-0">
                        <legend className="text-xs font-semibold uppercase tracking-wide text-[#717886]">Robinhood USDG</legend>
                        <p id="payment-help" className="text-xs leading-relaxed text-[#b1b7c3]">
                          Pay the pack price in USDG on Robinhood. A confirmed payment shows a test card. It does not open a Collector Crypt pack and does not pay a buyback.
                        </p>
                        {treasuryAddress && (
                          <p className="break-all font-mono text-[11px] leading-relaxed text-[#eef0f3]">
                            Send USDG to {treasuryAddress}
                          </p>
                        )}
                        <button
                          type="button"
                          disabled={!treasuryAddress || payBusy}
                          onClick={() => void payOnRobinhood()}
                          className="h-12 rounded-xl bg-[#3c8aff] text-sm font-bold uppercase tracking-wide text-white hover:bg-[#0000ff] disabled:opacity-40"
                        >
                          {payBusy ? 'Checking…' : `Pay ${money(selected.price)} USDG`}
                        </button>
                        <label htmlFor="payment-tx" className="text-sm text-[#eef0f3]">
                          Or paste the transaction hash
                        </label>
                        <input
                          id="payment-tx"
                          name="txHash"
                          value={txHash}
                          onChange={(event) => setTxHash(event.target.value.trim())}
                          onBlur={(event) => syncHashValidity(event.currentTarget)}
                          onInput={(event) => {
                            if (event.currentTarget.hasAttribute('aria-invalid')) syncHashValidity(event.currentTarget)
                          }}
                          required
                          pattern="0x[a-fA-F0-9]{64}"
                          spellCheck={false}
                          autoComplete="off"
                          autoCapitalize="off"
                          enterKeyHint="done"
                          placeholder="0x…"
                          aria-describedby="payment-help"
                          aria-errormessage="payment-format"
                          className="h-12 w-full rounded-xl border border-white/15 bg-black/30 px-3 font-mono text-base text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3c8aff]"
                        />
                        <p id="payment-format" className="hidden text-xs text-[#fc401f]">
                          Transaction hash is not a 32-byte hex value.
                        </p>
                        <button
                          type="submit"
                          className="h-12 rounded-xl border border-[#3c8aff]/50 text-sm font-semibold text-[#3c8aff] disabled:opacity-40"
                        >
                          {payBusy ? 'Checking…' : 'Check payment'}
                        </button>
                      </fieldset>
                      {!treasuryConfigured && (
                        <p className="text-xs leading-relaxed text-[#b1b7c3]">
                          Set GACHA_TREASURY_ADDRESS before a payment can be confirmed.
                        </p>
                      )}
                      {payOrder && (
                        <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-xs leading-relaxed text-[#b1b7c3]">
                          {payReplay && <p className="text-[#ffd12f]">Already recorded.</p>}
                          <p className="font-mono text-[10px] text-[#717886]">{payOrder.orderId}</p>
                          <p className="mt-1 font-semibold text-white">
                            {payOrder.status === 'PAYMENT_CONFIRMED' && 'Payment confirmed on Robinhood.'}
                            {payOrder.status === 'PAYMENT_INVALID' && 'Payment invalid'}
                          </p>
                          {payOrder.status === 'PAYMENT_CONFIRMED' && (
                            <p className="mt-1">Test card only. The Solana pack was not opened.</p>
                          )}
                          {payOrder.cardName && (
                            <p className="mt-2 font-semibold text-white">{payOrder.cardName}</p>
                          )}
                          {payOrder.rarity && (
                            <p className="text-[#ffd12f] capitalize">{payOrder.rarity}</p>
                          )}
                          {payOrder.buybackAmount != null && (
                            <p className="mt-1">
                              Buyback:{' '}
                              <span className="font-bold text-white">{money(payOrder.buybackAmount)} USDG</span>
                            </p>
                          )}
                          {payOrder.payoutTx && (
                            <p className="mt-1 font-mono text-[10px] break-all text-[#3c8aff]">{payOrder.payoutTx}</p>
                          )}
                          {payOrder.error && (
                            <p className="mt-1 text-[#fc401f]">{payOrder.error}</p>
                          )}
                        </div>
                      )}
                      {payError && (
                        <p role="alert" className="text-sm text-[#fc401f]">
                          {payError}
                        </p>
                      )}
                    </form>
                  </div>
                )}

                {error && (
                  <p role="alert" className="text-sm text-[#fc401f]">
                    {error}
                  </p>
                )}
              </aside>
            </div>
          )}
        </>
      )}

      <dialog
        ref={dialogRef}
        className="reveal-dialog"
        aria-labelledby="reveal-title"
        onClose={() => setResult(null)}
      >
        {result && (
          <div
            className={`rounded-3xl border bg-[#14171e] p-6 ${result.memo === 'card-drop' ? 'card-drop' : ''}`}
            style={{ borderColor: result.memo === 'card-drop' ? slabColor(result.rarity) : 'rgb(255 255 255 / 0.1)' }}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#3c8aff]">
              {result.memo === 'card-drop'
                ? 'Card drop'
                : result.memo === 'test-display'
                  ? 'Robinhood payment'
                  : result.mode === 'test'
                    ? 'Test spin'
                    : 'Live open'}
            </p>
            {result.imageUrl && (
              <img
                src={result.imageUrl}
                alt=""
                className="mt-4 h-56 w-full rounded-2xl bg-black/30 object-contain"
              />
            )}
            <h3 id="reveal-title" className="mt-4 font-heading text-2xl font-bold text-white">
              {result.nftName}
            </h3>
            <p className="mt-1 text-sm capitalize" style={{ color: slabColor(result.rarity) }}>{result.rarity}</p>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-[#717886]">Insured</dt>
                <dd className="font-semibold text-white">
                  {result.insuredValue == null ? '—' : money(result.insuredValue)}
                </dd>
              </div>
              <div>
                <dt className="text-[#717886]">Buyback{result.buybackPct ? ` ${result.buybackPct}%` : ''}</dt>
                <dd className="font-semibold text-white">
                  {result.buybackAmount == null ? '—' : money(result.buybackAmount)}
                </dd>
              </div>
            </dl>
            <p className="mt-4 text-sm leading-relaxed text-[#b1b7c3]">
              {result.memo === 'card-drop'
                ? 'The card stayed in the bot wallet. Turbo was off, and nothing was paid on Robinhood.'
                : result.memo === 'test-display'
                  ? 'Payment confirmed. This is a test card. The Solana pack was not opened and nothing was paid out.'
                  : result.mode === 'test'
                    ? 'No Collector Crypt pack was opened. Nothing was paid out.'
                    : result.turboBuyback
                      ? 'Common was sold by turbo. The buyback stayed on the Solana bot wallet.'
                      : 'Buyback, when it ran, stayed on the Solana bot wallet. The player was not paid.'}
            </p>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="mt-5 h-10 w-full rounded-xl bg-white text-sm font-bold text-[#0a0b0d]"
            >
              Close
            </button>
          </div>
        )}
      </dialog>

      <style>{`
        #payment-tx:user-invalid {
          border-color: #fc401f;
        }
        #payment-tx:user-invalid + #payment-format {
          display: block;
        }
        .card-drop {
          animation: card-drop 720ms cubic-bezier(.16, .84, .32, 1);
        }
        @keyframes card-drop {
          from { transform: translateY(-28%) rotate(-6deg) scale(.92); opacity: 0; }
          to { transform: none; opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .card-drop { animation: none; }
        }
      `}</style>
    </section>
  )
}
