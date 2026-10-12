'use client'

import { useMemo, useState } from 'react'
import { PackOpen } from '@/components/gacha/pack-open'
import { packOpenable } from '@/lib/gacha/pack-access'
import type { GachaMachine, Rarity } from '@/lib/gacha/types'

const RARITIES: { id: Rarity; label: string; color: string }[] = [
  { id: 'common', label: 'Common', color: '#8a8a8a' },
  { id: 'uncommon', label: 'Uncommon', color: '#3c8aff' },
  { id: 'rare', label: 'Rare', color: '#c8a24a' },
  { id: 'epic', label: 'Epic', color: '#fea8cd' },
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

function packArt(url: string | null): url is string {
  if (!url?.startsWith('https://')) return false
  return url.includes('blob.vercel-storage.com') || url.startsWith('https://assets.ripcars.io/')
}

// Rip Cars ships a 16:9 studio frame. Cover crops the side bars so the machine fills the square.
function fillsSquare(url: string | null): boolean {
  return !!url?.startsWith('https://assets.ripcars.io/')
}

export function PackFloor({
  machines,
  unavailable,
  treasury = '',
  initialCategory = '',
}: {
  machines: GachaMachine[]
  unavailable?: boolean
  treasury?: string
  initialCategory?: string
}) {
  const categories = useMemo(() => {
    const seen: string[] = []
    for (const machine of machines) {
      if (!seen.includes(machine.category)) seen.push(machine.category)
    }
    return seen
  }, [machines])

  const starter = machines.find((machine) => machine.code === 'pokemon_25') ?? machines[0]
  const fromUrl = categories.includes(initialCategory)
  const initial = fromUrl ? initialCategory : starter?.category ?? categories[0] ?? ''
  const [category, setCategory] = useState(initial)
  const visible = useMemo(
    () => machines.filter((machine) => machine.category === category),
    [machines, category],
  )
  const firstIn = machines.find((machine) => machine.category === initial)
  const [code, setCode] = useState(fromUrl ? firstIn?.code ?? '' : starter?.code ?? '')
  const selected = machines.find((machine) => machine.code === code) ?? visible[0] ?? machines[0]

  function chooseCategory(name: string) {
    setCategory(name)
    const next = machines.find((machine) => machine.category === name)
    if (next) setCode(next.code)
    const url = new URL(window.location.href)
    url.searchParams.set('category', name)
    const hash = url.hash || '#packs'
    window.history.replaceState(null, '', `${url.pathname}?${url.searchParams.toString()}${hash}`)
  }

  return (
    <section id="packs" className="flex scroll-mt-24 flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#3c8aff]">Machines</p>
        <h2 className="font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl">Packs</h2>
        <p className="max-w-2xl text-sm leading-relaxed text-[#b1b7c3] sm:text-base">
          The $20 Garage Pack and the $25 pack take USDG on Robinhood or USDC on Hyperliquid. Packs above $25 are coming soon.
        </p>
      </div>

      {machines.length === 0 ? (
        <p className="rounded-2xl border border-white/10 bg-[#14171e] px-4 py-6 text-sm text-[#b1b7c3]">
          Pack list is unavailable right now.
        </p>
      ) : (
        <>
          {unavailable && (
            <p className="text-sm text-[#b1b7c3]">The other packs are unavailable right now.</p>
          )}
          <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Pack categories">
            {categories.map((name) => {
              const active = name === category
              return (
                <button
                  key={name}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => chooseCategory(name)}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wide focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3c8aff] ${
                    active ? 'bg-[#3c8aff] text-white' : 'bg-white/5 text-[#b1b7c3] hover:text-white'
                  }`}
                >
                  {name}
                </button>
              )
            })}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {visible.map((machine) => {
              const active = machine.code === selected?.code
              const closed = !packOpenable(machine.price)
              return (
                <button
                  key={machine.code}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    setCode(machine.code)
                    document.getElementById('pack-detail')?.scrollIntoView({ block: 'nearest' })
                  }}
                  className={`flex h-full flex-col rounded-[22px] border bg-[#14171e] p-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3c8aff] ${
                    active ? 'border-[#3c8aff]' : 'border-white/10 hover:border-white/25'
                  }`}
                >
                  <span className={`relative block overflow-hidden ${fillsSquare(machine.imageUrl) ? 'rounded-2xl bg-black' : ''}`}>
                    {fillsSquare(machine.imageUrl) && <span className="block aspect-square" aria-hidden="true" />}
                    {packArt(machine.imageUrl) ? (
                      <img
                        src={machine.imageUrl}
                        alt={machine.name}
                        width={fillsSquare(machine.imageUrl) ? 1920 : 1080}
                        height={1080}
                        loading="lazy"
                        decoding="async"
                        className={fillsSquare(machine.imageUrl) ? 'absolute inset-0 size-full object-cover' : 'aspect-square w-full object-contain'}
                      />
                    ) : (
                      <span className="block aspect-square" />
                    )}
                    <span className="absolute top-2 right-2 rounded-full border border-white/20 bg-[#0a0a0a]/80 px-2 py-1 text-xs font-medium text-white/80">
                      {closed ? 'Coming Soon' : `${machine.instantBuyback}% buyback`}
                    </span>
                  </span>
                  <span className="mt-3 line-clamp-2 min-h-10 text-sm font-semibold text-white">{machine.name}</span>
                  <span className="mt-1 font-heading text-lg font-bold text-[#ffd12f]">{money(machine.price)}</span>
                  <span className={`mt-3 flex h-11 items-center justify-center rounded-xl text-sm font-bold uppercase tracking-wide ${closed ? 'bg-white/10 text-[#b1b7c3]' : 'bg-[#3c8aff] text-white'}`}>
                    {closed ? 'Coming Soon' : 'Open Pack'}
                  </span>
                </button>
              )
            })}
          </div>

          {selected && (
            <div id="pack-detail" className="grid scroll-mt-24 items-start gap-6 rounded-[22px] border border-white/10 bg-[#14171e] p-4 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] lg:p-6">
              <div className={`relative overflow-hidden rounded-2xl bg-[#0a0a0a] ${fillsSquare(selected.imageUrl) ? '' : 'p-4'}`}>
                {fillsSquare(selected.imageUrl) && <span className="block aspect-square" aria-hidden="true" />}
                {packArt(selected.imageUrl) && (
                  <img
                    src={selected.imageUrl}
                    alt={selected.name}
                    width={fillsSquare(selected.imageUrl) ? 1920 : 1080}
                    height={1080}
                    loading="lazy"
                    decoding="async"
                    className={fillsSquare(selected.imageUrl) ? 'absolute inset-0 size-full object-cover' : 'aspect-square w-full object-contain'}
                  />
                )}
              </div>
              <div className="flex flex-col gap-4">
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
                          <span className="size-2 rounded-full" style={{ background: rarity.color }} />
                          {rarity.label}
                        </span>
                        <span className="h-1.5 overflow-hidden rounded-full bg-white/10">
                          <span className="block h-full" style={{ width: `${Math.max(chance * 100, 1)}%`, background: rarity.color }} />
                        </span>
                        <span className="text-right text-[#b1b7c3]">
                          {percent(chance)}
                          {band ? ` · ${money(band.start)}–${money(band.end)}` : ''}
                        </span>
                      </li>
                    )
                  })}
                </ul>
                {packOpenable(selected.price) ? (
                  <PackOpen code={selected.code} price={selected.price} treasury={treasury} />
                ) : (
                  <button
                    type="button"
                    disabled
                    className="h-12 rounded-xl bg-white/10 text-sm font-bold uppercase tracking-wide text-[#b1b7c3]"
                  >
                    Coming Soon
                  </button>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  )
}
