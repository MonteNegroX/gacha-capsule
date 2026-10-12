'use client'

import { useConnectWallet, useWallets } from '@privy-io/react-auth'
import { useSignAndSendTransaction, useWallets as useSolanaWallets } from '@privy-io/react-auth/solana'
import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { collateralMessage, parseCollateral } from '@/lib/gacha/collateral'
import { base58Encode } from '@/lib/gacha/solana-address'

type WalletCard = {
  mint: string
  name: string
  imageUrl: string | null
}

export function LendPledge({ vault }: { vault: string }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return <PledgeShell vault={vault} />
  return <PledgeForm vault={vault} />
}

function PledgeShell({ vault }: { vault: string }) {
  return (
    <section className="flex max-w-xl flex-col gap-4 rounded-[22px] border border-white/10 bg-[#14171e] p-5 sm:p-6">
      <div>
        <h2 className="font-heading text-2xl font-bold text-white">List a Card from Your Wallet</h2>
        <p className="mt-2 text-sm leading-relaxed text-[#b1b7c3]">
          Pick a card in your Solana wallet and sign the transfer into the vault. A funder can then deposit 1 to 500 USDG. You repay within 7 days from your Robinhood wallet, or the funder receives the card. Keep a little SOL for the network fee.
        </p>
        <p className="mt-2 break-all font-mono text-[11px] text-[#717886]">Vault {vault}</p>
      </div>
      <button type="button" disabled className="h-12 rounded-xl bg-white/10 text-sm font-bold uppercase tracking-wide text-[#b1b7c3]">
        Connect Solana Wallet
      </button>
    </section>
  )
}

function PledgeForm({ vault }: { vault: string }) {
  const { wallets, ready } = useWallets()
  const { wallets: solanaWallets, ready: solanaReady } = useSolanaWallets()
  const { signAndSendTransaction } = useSignAndSendTransaction()
  const { connectWallet } = useConnectWallet()
  const loan = wallets.find((item) => item.type === 'ethereum' && item.walletClientType !== 'privy' && item.walletClientType !== 'privy-v2')
  const solanaExternal = solanaWallets.find((item) => !/privy/i.test(item.standardWallet.name))
  const solana = solanaExternal ?? solanaWallets[0]
  const solanaAddress = solana?.address ?? ''
  const helpId = useId()
  const errorRef = useRef<HTMLParagraphElement>(null)
  const alive = useRef(true)
  const [cards, setCards] = useState<WalletCard[]>([])
  const [truncated, setTruncated] = useState(false)
  const [loading, setLoading] = useState(false)
  const [scan, setScan] = useState(0)
  const [mint, setMint] = useState('')
  const [principal, setPrincipal] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [note, setNote] = useState('')

  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  useEffect(() => {
    if (!error) return
    errorRef.current?.focus()
  }, [error])

  useEffect(() => {
    if (!solanaAddress) {
      setCards([])
      setTruncated(false)
      setMint('')
      return
    }
    const ac = new AbortController()
    setLoading(true)
    setError('')
    fetch(`/api/lend/wallet?owner=${encodeURIComponent(solanaAddress)}`, { signal: ac.signal })
      .then(async (res) => {
        const body = (await res.json()) as { error?: string; cards?: WalletCard[]; truncated?: boolean }
        if (!res.ok) throw new Error(body.error || 'Cards could not be read')
        if (ac.signal.aborted || !alive.current) return
        const next = Array.isArray(body.cards) ? body.cards : []
        setCards(next)
        setTruncated(Boolean(body.truncated))
        setMint((current) => (next.some((card) => card.mint === current) ? current : ''))
      })
      .catch((err: unknown) => {
        if (ac.signal.aborted || !alive.current) return
        setCards([])
        setMint('')
        setError(err instanceof Error ? err.message : 'Cards could not be read')
      })
      .finally(() => {
        if (!ac.signal.aborted && alive.current) setLoading(false)
      })
    return () => ac.abort()
  }, [solanaAddress, scan])

  function connectSolana() {
    connectWallet({
      walletChainType: 'solana-only',
      walletList: ['phantom', 'solflare', 'backpack', 'detected_solana_wallets'],
    })
  }

  function connectLoan() {
    connectWallet({ walletChainType: 'ethereum-only' })
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setNote('')
    if (!solana) {
      connectSolana()
      return
    }
    if (!loan) {
      connectLoan()
      return
    }
    const parsed = parseCollateral(mint, principal)
    if (!parsed) {
      setError('Choose a card and a principal from 1 to 500 USDG, with at most two decimals.')
      return
    }
    const amount = principal.trim()
    setBusy(true)
    try {
      const provider = await loan.getEthereumProvider()
      const signature = await provider.request({
        method: 'personal_sign',
        params: [collateralMessage(parsed.mint, parsed.raw.toString()), loan.address],
      })
      if (typeof signature !== 'string') throw new Error('Wallet did not sign')
      const saved = await postJson('/api/lend/collateral', { mint: parsed.mint, principal: amount, signature })
      if (saved.status === 'LISTED') {
        setNote(`The card is listed. It waits for a funder to deposit ${amount} USDG. Refresh this page to see it under Listed now.`)
        setPrincipal('')
        return
      }
      const id = typeof saved.id === 'string' ? saved.id : ''
      let transferSig = ''
      try {
        const built = await postJson('/api/lend/transfer', { owner: solana.address, mint: parsed.mint })
        const raw = typeof built.transaction === 'string' ? bytesFromBase64(built.transaction) : null
        if (!raw) throw new Error('The transfer was not built')
        const sent = await signAndSendTransaction({
          transaction: raw,
          wallet: solana,
          chain: 'solana:mainnet',
        })
        transferSig = base58Encode(sent.signature)
      } catch (err) {
        if (cancelled(err)) throw err
        if (id) {
          const listed = await waitForListing(id)
          if (listed === 'LISTED') {
            setNote(`The card is listed. It waits for a funder to deposit ${amount} USDG. Refresh this page to see it under Listed now.`)
            setPrincipal('')
            setScan((value) => value + 1)
            return
          }
        }
        throw err
      }
      if (alive.current) setNote('Card sent. Waiting for the vault to list it.')
      const listed = id ? await waitForListing(id) : 'PENDING'
      if (!alive.current) return
      if (listed === 'LISTED') {
        setNote(`The card is listed${transferSig ? ` (${short(transferSig)})` : ''}. It waits for a funder to deposit ${amount} USDG. Refresh this page to see it under Listed now.`)
      } else {
        setNote(`The card was sent to the vault${transferSig ? ` (${short(transferSig)})` : ''}. Listing starts once that transfer confirms. Then it waits for a funder to deposit ${amount} USDG.`)
      }
      setPrincipal('')
      setScan((value) => value + 1)
    } catch (err) {
      if (!alive.current) return
      setError(cancelled(err) ? 'Signing was cancelled.' : err instanceof Error ? err.message : 'The card was not listed')
    } finally {
      if (alive.current) setBusy(false)
    }
  }

  const buttonLabel = busy
    ? 'Confirm in Wallet'
    : parseCollateral(mint, principal)
      ? `List for ${principal.trim()} USDG`
      : 'List My Card'

  return (
    <form action="/api/lend/collateral" method="post" onSubmit={(event) => void submit(event)} aria-busy={loading || busy} className="flex max-w-xl flex-col gap-4 rounded-[22px] border border-white/10 bg-[#14171e] p-5 sm:p-6">
      <div>
        <h2 className="font-heading text-2xl font-bold text-white">List a Card from Your Wallet</h2>
        <p id={helpId} className="mt-2 text-sm leading-relaxed text-[#b1b7c3]">
          Pick a card in your Solana wallet and sign the transfer into the vault. A funder can then deposit 1 to 500 USDG. You repay within 7 days from your Robinhood wallet, or the funder receives the card. Keep a little SOL for the network fee.
        </p>
        <p className="mt-2 break-all font-mono text-[11px] text-[#717886]">Vault {vault}</p>
        {solanaAddress ? <p className="mt-1 break-all font-mono text-[11px] text-[#717886]">Solana {solanaAddress}</p> : null}
        {loan ? <p className="mt-1 break-all font-mono text-[11px] text-[#717886]">Loan {loan.address}</p> : null}
      </div>

      {!solana ? (
        <button type="button" onClick={connectSolana} disabled={!ready || !solanaReady} className="h-12 rounded-xl bg-[#3c8aff] text-sm font-bold uppercase tracking-wide text-white disabled:bg-white/10 disabled:text-[#b1b7c3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3c8aff]">
          Connect Solana Wallet
        </button>
      ) : null}

      {solana ? (
        <fieldset className="flex flex-col gap-2">
          <legend className="text-xs font-bold uppercase tracking-wide text-[#717886]">Cards in This Wallet</legend>
          {loading ? <p className="text-sm text-[#b1b7c3]">Reading cards…</p> : null}
          {!loading && cards.length === 0 ? <p className="text-sm text-[#b1b7c3]">No card with a balance of 1 was found in this wallet.</p> : null}
          {cards.length > 0 ? (
            <div className="flex max-h-80 flex-col gap-2 overflow-y-auto">
              {cards.map((card) => (
                <label key={card.mint} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-black/30 px-3 py-2 has-[:checked]:border-[#3c8aff]">
                  <input
                    type="radio"
                    name="mint"
                    value={card.mint}
                    checked={mint === card.mint}
                    onChange={() => {
                      setMint(card.mint)
                      setError('')
                    }}
                    required
                    className="size-4 accent-[#3c8aff]"
                  />
                  {card.imageUrl ? (
                    <img src={card.imageUrl} alt="" width={48} height={64} referrerPolicy="no-referrer" className="h-16 w-12 rounded-lg object-contain" />
                  ) : null}
                  <span className="min-w-0">
                    <span className="block truncate text-sm text-white">{card.name}</span>
                    <span className="block truncate font-mono text-[11px] text-[#717886]">{card.mint}</span>
                  </span>
                </label>
              ))}
            </div>
          ) : null}
          {truncated ? <p className="text-xs text-[#717886]">Showing the first 24 cards.</p> : null}
          <button type="button" onClick={() => setScan((value) => value + 1)} disabled={loading || busy} className="self-start text-xs font-bold uppercase tracking-wide text-[#3c8aff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3c8aff]">
            Refresh Cards
          </button>
        </fieldset>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="pledge-principal" className="text-xs font-bold uppercase tracking-wide text-[#717886]">Principal, USDG</label>
        <input
          id="pledge-principal"
          name="principal"
          value={principal}
          onChange={(event) => {
            setPrincipal(event.target.value)
            event.currentTarget.setCustomValidity('')
            setError('')
          }}
          onBlur={() => {
            if (!principal.trim()) return
            if (!parseCollateral(mint || vault, principal)) setError('Enter a principal from 1 to 500 USDG, with at most two decimals.')
          }}
          onInvalid={(event) => {
            event.currentTarget.setCustomValidity('Enter a principal from 1 to 500 USDG, with at most two decimals.')
          }}
          required
          inputMode="decimal"
          enterKeyHint="done"
          autoComplete="off"
          spellCheck={false}
          pattern="\d+(\.\d{1,2})?"
          aria-describedby={helpId}
          className="h-12 rounded-xl border border-white/10 bg-black/30 px-3 text-base text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3c8aff]"
        />
      </div>

      {solana && !loan ? (
        <button type="button" onClick={connectLoan} disabled={!ready} className="h-12 rounded-xl bg-[#3c8aff] text-sm font-bold uppercase tracking-wide text-white disabled:bg-white/10 disabled:text-[#b1b7c3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3c8aff]">
          Connect Loan Wallet
        </button>
      ) : null}

      {solana && loan ? (
        <button type="submit" disabled={busy || loading || !ready || !solanaReady} className="h-12 rounded-xl bg-[#3c8aff] text-sm font-bold uppercase tracking-wide text-white disabled:bg-white/10 disabled:text-[#b1b7c3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3c8aff]">
          {buttonLabel}
        </button>
      ) : null}
      {note ? <p className="text-sm text-[#b1b7c3]" aria-live="polite">{note}</p> : null}
      {error ? <p ref={errorRef} tabIndex={-1} className="text-sm text-[#fc401f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3c8aff]" role="alert">{error}</p> : null}
    </form>
  )
}

async function postJson(url: string, body: unknown): Promise<{ error?: string; status?: string; id?: string; transaction?: string }> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  const parsed = (await res.json()) as { error?: string; status?: string; id?: string; transaction?: string }
  if (!res.ok) throw new Error(parsed.error || 'The card was not listed')
  return parsed
}

async function waitForListing(id: string): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 4000))
    try {
      const res = await fetch(`/api/lend/collateral?id=${encodeURIComponent(id)}`)
      const body = (await res.json()) as { status?: string; error?: string | null }
      if (body.status === 'LISTED') return 'LISTED'
      if (body.status === 'REJECTED') throw new Error(body.error || 'This card was not listed')
    } catch (err) {
      if (err instanceof Error && /not listed|already held/i.test(err.message)) throw err
    }
  }
  return 'PENDING'
}

function bytesFromBase64(value: string): Uint8Array {
  const bin = atob(value)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i)
  return out
}

function short(value: string): string {
  if (value.length <= 12) return value
  return `${value.slice(0, 4)}…${value.slice(-4)}`
}

function cancelled(err: unknown): boolean {
  if (typeof err === 'object' && err !== null && 'code' in err && (err as { code?: unknown }).code === 4001) return true
  const message = err instanceof Error ? err.message : ''
  return /user rejected|rejected the request|signing was cancelled/i.test(message)
}
