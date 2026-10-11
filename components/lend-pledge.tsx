'use client'

import { useState, type FormEvent } from 'react'
import { useConnectWallet, useWallets } from '@privy-io/react-auth'
import { collateralMessage, parseCollateral } from '@/lib/gacha/collateral'

export function LendPledge({ vault }: { vault: string }) {
  const { wallets, ready } = useWallets()
  const { connectWallet } = useConnectWallet()
  const wallet = wallets.find((item) => item.type === 'ethereum' && item.walletClientType !== 'privy' && item.walletClientType !== 'privy-v2')
  const [mint, setMint] = useState('')
  const [principal, setPrincipal] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [note, setNote] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setNote('')
    if (!wallet) {
      connectWallet()
      return
    }
    const parsed = parseCollateral(mint, principal)
    if (!parsed) {
      setError('Enter a Solana mint and a principal from 1 to 500 USDG.')
      return
    }
    setBusy(true)
    try {
      const provider = await wallet.getEthereumProvider()
      const from = wallet.address
      const signature = await provider.request({
        method: 'personal_sign',
        params: [collateralMessage(parsed.mint, parsed.raw.toString()), from],
      })
      if (typeof signature !== 'string') throw new Error('Wallet did not sign')
      const res = await fetch('/api/lend/collateral', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ mint: parsed.mint, principal: principal.trim(), signature }),
      })
      const body = (await res.json()) as { error?: string; status?: string }
      if (!res.ok) throw new Error(body.error || 'The card was not listed')
      setNote(body.status === 'LISTED' ? 'The card is listed.' : 'Request saved. The vault lists it after the card arrives.')
      setMint('')
      setPrincipal('')
    } catch (err) {
      const cancelled = typeof err === 'object' && err !== null && 'code' in err && err.code === 4001
      setError(cancelled ? 'Signing was cancelled.' : err instanceof Error ? err.message : 'The card was not listed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="flex max-w-xl flex-col gap-4 rounded-3xl border border-white/10 bg-[#14171e] p-5 sm:p-6">
      <div>
        <h2 className="font-heading text-2xl font-bold text-white">Put your card up</h2>
        <p id="pledge-help" className="mt-2 text-sm leading-relaxed text-[#b1b7c3]">
          Send the NFT to the vault, then name the principal. Your connected wallet becomes the owner: it can withdraw the deposit and repay within 7 days. 1 to 500 USDG.
        </p>
        <p className="mt-2 break-all font-mono text-[11px] text-[#717886]">Vault {vault}</p>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="pledge-mint" className="text-xs font-bold uppercase tracking-wide text-[#717886]">Mint</label>
        <input
          id="pledge-mint"
          name="mint"
          value={mint}
          onChange={(event) => {
            setMint(event.target.value)
            setError('')
          }}
          required
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          aria-describedby="pledge-help"
          className="h-12 rounded-xl border border-white/10 bg-black/30 px-3 text-base text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3c8aff]"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="pledge-principal" className="text-xs font-bold uppercase tracking-wide text-[#717886]">Principal, USDG</label>
        <input
          id="pledge-principal"
          name="principal"
          value={principal}
          onChange={(event) => {
            setPrincipal(event.target.value)
            setError('')
          }}
          required
          inputMode="decimal"
          autoComplete="off"
          spellCheck={false}
          className="h-12 rounded-xl border border-white/10 bg-black/30 px-3 text-base text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3c8aff]"
        />
      </div>
      <button type="submit" disabled={busy || !ready} className="h-12 rounded-xl bg-[#3c8aff] text-sm font-bold uppercase tracking-wide text-white disabled:bg-white/10 disabled:text-[#b1b7c3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3c8aff]">
        {busy ? 'Confirm in wallet' : wallet ? 'List my card' : 'Connect wallet'}
      </button>
      {note ? <p className="text-sm text-[#b1b7c3]">{note}</p> : null}
      {error ? <p className="text-sm text-[#fc401f]" role="alert">{error}</p> : null}
    </form>
  )
}
