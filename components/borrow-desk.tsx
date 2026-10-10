import type { GachaMachine } from '@/lib/gacha/types'
import type { VaultListing } from '@/lib/gacha/vault-listing'
import { VaultFund } from '@/components/vault-fund'

function money(value: number): string {
  const digits = Number.isInteger(value) ? 0 : 2
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: digits,
    maximumFractionDigits: 2,
  })
}

function short(value: string): string {
  if (value.length <= 16) return value
  return `${value.slice(0, 6)}…${value.slice(-6)}`
}

function ListedDesk({ listing }: { listing: VaultListing }) {
  return (
    <section id="borrow" aria-labelledby="borrow-heading" className="scroll-mt-24">
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="flex flex-col gap-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#3c8aff]">Lend</p>
          <h2 id="borrow-heading" className="font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Fund the vault card.
          </h2>
          <p className="max-w-xl text-sm leading-relaxed text-[#b1b7c3] sm:text-base">
            This card stays in the Capsule vault. Lenders fund its Collector Crypt buyback in USDG, plus a 3% protocol fee. The 7-day term starts when the cap is filled.
          </p>
          <figure className="rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_50%_28%,#1a2a4a_0%,#0a0b0d_68%)] p-6">
            <img
              src={listing.imageUrl}
              alt={listing.name}
              width={640}
              height={880}
              className="mx-auto max-h-80 w-full object-contain"
            />
          </figure>
        </div>

        <div className="rounded-3xl border border-white/10 bg-[#14171e] p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-heading text-xl font-bold text-white">Vault listing</h3>
            <p className="rounded-full bg-[#ffd12f]/15 px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#ffd12f]">
              Listing
            </p>
          </div>

          <div className="mt-5 flex flex-col gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-[#717886]">Collateral</p>
              <p className="font-heading text-xl font-bold text-white">{listing.name}</p>
              <p className="mt-1 text-sm text-[#ffd12f]">
                {listing.rarity}
                {listing.grade ? ` · ${listing.grade}` : ''}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-black/30 px-3 py-2">
                <p className="text-[10px] uppercase tracking-wide text-[#717886]">Insured</p>
                <p className="font-heading text-lg font-bold text-white">{money(listing.insuredUsd)}</p>
              </div>
              <div className="rounded-xl bg-black/30 px-3 py-2">
                <p className="text-[10px] uppercase tracking-wide text-[#717886]">Cap</p>
                <p className="font-heading text-lg font-bold text-[#ffd12f]">{money(listing.capUsd)} USDG</p>
              </div>
              <div className="rounded-xl bg-black/30 px-3 py-2">
                <p className="text-[10px] uppercase tracking-wide text-[#717886]">Funded</p>
                <p className="font-heading text-lg font-bold text-white">
                  {money(listing.fundedUsd)} / {money(listing.capUsd)}
                </p>
              </div>
              <div className="rounded-xl bg-black/30 px-3 py-2">
                <p className="text-[10px] uppercase tracking-wide text-[#717886]">Term</p>
                <p className="font-heading text-lg font-bold text-white">{listing.termDays} days</p>
              </div>
            </div>

            <p className="break-all font-mono text-[11px] leading-relaxed text-[#b1b7c3]">
              NFT {listing.nftAddress}
              <br />
              Vault {short(listing.vault)}
            </p>

            <VaultFund treasury={listing.treasury} capRaw={listing.capRaw} fundedRaw={listing.fundedRaw} />
          </div>
        </div>
      </div>
    </section>
  )
}

export function BorrowDesk({ machine, listing = null }: { machine: GachaMachine | null; listing?: VaultListing | null }) {
  if (listing) return <ListedDesk listing={listing} />
  return (
    <section id="borrow" aria-labelledby="borrow-heading" className="scroll-mt-24">
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="flex flex-col gap-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#3c8aff]">Borrow</p>
          <h2 id="borrow-heading" className="font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Lock a pull. Take a term.
          </h2>
          <p className="max-w-xl text-sm leading-relaxed text-[#b1b7c3] sm:text-base">
            The pull is the collateral. You repay, and it unlocks. This desk is a preview. Loans are not open.
          </p>
          <ol className="flex flex-col gap-3">
            {[
              'Put a pull up as collateral.',
              'Take a fixed-term advance.',
              'Repay. The pull unlocks.',
            ].map((step, index) => (
              <li key={step} className="flex items-baseline gap-3 text-sm text-[#eef0f3]">
                <span className="font-heading text-xs font-bold text-[#3c8aff]">{index + 1}</span>
                {step}
              </li>
            ))}
          </ol>
          {machine?.imageUrl?.includes('blob.vercel-storage.com') && (
            <figure className="rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_50%_28%,#1a2a4a_0%,#0a0b0d_68%)] p-6">
              <img
                src={machine.imageUrl}
                alt={machine.name}
                width={1080}
                height={1080}
                loading="lazy"
                decoding="async"
                className="mx-auto aspect-square w-full max-w-xs object-contain"
              />
            </figure>
          )}
        </div>

        <form aria-describedby="borrow-note" className="rounded-3xl border border-white/10 bg-[#14171e] p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-heading text-xl font-bold text-white">Loan desk</h3>
            <p className="rounded-full bg-[#3c8aff]/15 px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#3c8aff]">
              Preview
            </p>
          </div>

          <fieldset disabled className="mt-5 flex flex-col gap-4 border-0 p-0 opacity-100 [&:disabled_input]:text-white [&:disabled_input]:opacity-100">
            <legend className="sr-only">Sample loan</legend>

            <div className="flex items-center gap-3 rounded-2xl bg-black/30 p-3">
              {machine?.imageUrl?.includes('blob.vercel-storage.com') && (
                <img
                  src={machine.imageUrl}
                  alt=""
                  width={72}
                  height={72}
                  loading="lazy"
                  decoding="async"
                  className="size-16 rounded-xl object-contain"
                />
              )}
              <div>
                <p className="text-[10px] uppercase tracking-wide text-[#717886]">Collateral</p>
                <p className="font-heading text-base font-bold text-white">{machine?.name ?? 'A pull from the floor'}</p>
              </div>
            </div>

            <label className="flex flex-col gap-1.5 text-sm text-[#eef0f3]">
              Catalog EV
              <input
                readOnly
                value={machine ? money(machine.ev) : '—'}
                className="h-12 rounded-xl border border-white/10 bg-black/30 px-3 font-heading text-lg font-bold text-white"
              />
            </label>

            <fieldset className="border-0 p-0">
              <legend className="text-sm text-[#eef0f3]">Term</legend>
              <div className="mt-1.5 grid grid-cols-3 gap-2">
                {[
                  ['7', '7 days'],
                  ['14', '14 days'],
                  ['30', '30 days'],
                ].map(([value, label]) => (
                  <label
                    key={value}
                    className="flex h-12 items-center justify-center gap-2 rounded-xl border border-white/10 bg-black/30 text-sm font-semibold text-white has-checked:border-[#3c8aff] has-checked:bg-[#3c8aff]/15"
                  >
                    <input
                      type="radio"
                      name="term"
                      value={value}
                      defaultChecked={value === '30'}
                      className="sr-only"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>

            <label className="flex flex-col gap-1.5 text-sm text-[#eef0f3]">
              Advance
              <input
                inputMode="decimal"
                placeholder="Set when the desk opens"
                className="h-12 rounded-xl border border-white/10 bg-black/30 px-3 text-base text-white placeholder:text-[#717886]"
              />
            </label>

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-black/30 px-3 py-2">
                <p className="text-[10px] uppercase tracking-wide text-[#717886]">Repay</p>
                <p className="font-heading text-lg font-bold text-white">—</p>
              </div>
              <div className="rounded-xl bg-black/30 px-3 py-2">
                <p className="text-[10px] uppercase tracking-wide text-[#717886]">Buyback on pack</p>
                <p className="font-heading text-lg font-bold text-[#ffd12f]">
                  {machine ? `${machine.instantBuyback}%` : '—'}
                </p>
              </div>
            </div>

            <button
              type="submit"
              className="h-12 rounded-xl bg-[#3c8aff] text-sm font-bold uppercase tracking-wide text-white disabled:bg-white/10 disabled:text-[#b1b7c3]"
            >
              Borrow
            </button>
          </fieldset>

          <p id="borrow-note" className="mt-4 text-xs leading-relaxed text-[#717886]">
            Preview only. Nothing here sends a transaction or opens a loan.
          </p>
        </form>
      </div>
    </section>
  )
}
