'use client'

import { useState } from 'react'
import { useConnectWallet, useWallets } from '@privy-io/react-auth'
import {
  ROBINHOOD_CHAIN_HEX,
  ROBINHOOD_EXPLORER,
  ROBINHOOD_RPC,
  ROBINHOOD_USDG,
  BUYOUT_FEE_PERCENT,
  buyoutCharge,
  encodeUsdgTransfer,
  parseUsdg,
} from '@/lib/gacha/robinhood-transfer'

const SCALE = BigInt('1000000')

function formatRaw(raw: bigint): string {
  const whole = raw / SCALE
  const frac = (raw % SCALE).toString().padStart(6, '0').replace(/0+$/, '')
  return frac ? `${whole.toString()}.${frac}` : whole.toString()
}

function walletErrorCode(err: unknown): number | null {
  if (typeof err === 'object' && err !== null && 'code' in err && typeof err.code === 'number') return err.code
  return null
}

export function VaultFund({
  treasury,
  capRaw,
  fundedRaw,
}: {
  treasury: string
  capRaw: string
  fundedRaw: string
}) {
  const { wallets, ready } = useWallets()
  const { connectWallet } = useConnectWallet()
  const remaining = BigInt(capRaw) - BigInt(fundedRaw)
  const [amount, setAmount] = useState(remaining > BigInt(0) ? formatRaw(remaining) : '0')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [txHash, setTxHash] = useState('')
  const wallet = wallets.find((item) => item.type === 'ethereum' && item.walletClientType !== 'privy' && item.walletClientType !== 'privy-v2')
  const parsed = parseUsdg(amount, remaining)
  const charge = parsed ? buyoutCharge(parsed) : null
  const buttonLabel = busy ? 'Confirm in wallet' : wallet ? `Fund ${charge ? formatRaw(charge.total) : amount} USDG` : 'Connect wallet'

  async function fund(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!ready || busy) return
    if (!wallet) {
      connectWallet()
      return
    }
    if (!parsed || !charge) {
      setError('Enter a USDG amount up to the remaining cap.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const provider = await wallet.getEthereumProvider()
      try {
        await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: ROBINHOOD_CHAIN_HEX }] })
      } catch (err) {
        if (walletErrorCode(err) !== 4902) throw err
        await provider.request({
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
      const accounts = await provider.request({ method: 'eth_requestAccounts' })
      const from = Array.isArray(accounts) ? accounts[0] : ''
      if (typeof from !== 'string' || !from) throw new Error('Wallet did not return an account')
      const hash = await provider.request({
        method: 'eth_sendTransaction',
        params: [{
          from,
          to: ROBINHOOD_USDG,
          data: encodeUsdgTransfer(treasury, charge.total),
          value: '0x0',
        }],
      })
      if (typeof hash !== 'string' || !/^0x[a-fA-F0-9]{64}$/.test(hash)) {
        throw new Error('Wallet did not return a transaction hash')
      }
      setTxHash(hash)
    } catch (err) {
      const cancelled = walletErrorCode(err) === 4001
      setError(cancelled ? 'Funding was cancelled.' : err instanceof Error ? err.message : 'Funding failed')
    } finally {
      setBusy(false)
    }
  }

  if (remaining <= BigInt(0)) {
    return <p className="text-sm text-[#b1b7c3]">This listing is fully funded.</p>
  }

  return (
    <form method="post" action="#borrow" onSubmit={fund} className="flex flex-col gap-3">
      <label htmlFor="fund-amount" className="flex flex-col gap-1.5 text-sm text-[#eef0f3]">
        Amount
        <input
          id="fund-amount"
          name="amount"
          inputMode="decimal"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          enterKeyHint="done"
          value={amount}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'fund-note fund-error' : 'fund-note'}
          onChange={(event) => {
            setAmount(event.target.value)
            setError('')
          }}
          className="h-12 rounded-xl border border-white/10 bg-black/30 px-3 text-base text-white outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3c8aff]"
        />
      </label>
      {charge ? (
        <p className="text-xs leading-relaxed text-[#b1b7c3]">
          Protocol fee {BUYOUT_FEE_PERCENT}%: {formatRaw(charge.fee)} USDG. Total {formatRaw(charge.total)} USDG.
        </p>
      ) : null}
      <button
        type="submit"
        disabled={!ready || busy}
        className="h-12 rounded-xl bg-[#3c8aff] text-sm font-bold uppercase tracking-wide text-white disabled:bg-white/10 disabled:text-[#b1b7c3]"
      >
        {ready ? buttonLabel : 'Loading'}
      </button>
      <p id="fund-note" className="text-xs leading-relaxed text-[#717886]">
        Sends the total on Robinhood to {treasury}. The buyback covers the card. The {BUYOUT_FEE_PERCENT}% fee stays in the treasury for the bot. The card stays in the Solana vault.
      </p>
      {error ? (
        <p id="fund-error" role="alert" className="text-xs leading-relaxed text-[#fc401f]">
          {error}
        </p>
      ) : null}
      {txHash ? (
        <p className="break-all text-xs leading-relaxed text-[#66c800]">
          Sent.{' '}
          <a className="underline" href={`${ROBINHOOD_EXPLORER}/tx/${txHash}`} target="_blank" rel="noreferrer">
            View transaction
          </a>
        </p>
      ) : null}
    </form>
  )
}
