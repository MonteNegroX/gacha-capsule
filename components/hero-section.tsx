type Shot = {
  name: string
  imageUrl: string
}

function money(value: number): string {
  const digits = Number.isInteger(value) ? 0 : 2
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: digits,
    maximumFractionDigits: 2,
  })
}

export function HeroSection({
  shots,
  machineCount,
  fromPrice,
  buyback,
}: {
  shots: Shot[]
  machineCount: number
  fromPrice: number | null
  buyback: number | null
}) {
  const thumbs = shots.slice(0, 4)

  return (
    <section id="top" className="border-b border-white/10">
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center px-4 py-16 text-center sm:px-6 lg:py-20">
        <h1 className="font-heading text-5xl font-bold leading-[1.02] tracking-tight text-white sm:text-7xl">
          Collect. Open.
          <br />
          <span className="text-[#3c8aff]">Compete.</span>
        </h1>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-[#b1b7c3] sm:text-lg">
          Open a pack, or borrow against a pull. Odds and buyback are on the machine. The loan desk is a preview.
        </p>
        <p className="mt-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#b1b7c3]">
          <span className="inline-block size-2 rounded-full bg-[#66c800]" />
          Season 1 early access
        </p>

        <div className="mt-10 grid w-full gap-4 text-left md:grid-cols-2">
          <a
            href="#packs"
            className="flex flex-col rounded-2xl border border-white/10 bg-[#14171e] p-6 hover:border-[#3c8aff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3c8aff]"
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-heading text-2xl font-bold text-white">Open</h2>
              <span className="flex">
                {thumbs.map((shot, index) => (
                  <img
                    key={shot.imageUrl}
                    src={shot.imageUrl}
                    alt={index === 0 ? shot.name : ''}
                    width={64}
                    height={64}
                    fetchPriority={index === 0 ? 'high' : undefined}
                    decoding="async"
                    className={`size-12 rounded-lg border border-white/10 bg-[#0a0b0d] object-contain ${index > 0 ? '-ml-3' : ''}`}
                  />
                ))}
              </span>
            </div>
            <p className="mt-8 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#717886]">On the floor</p>
            <p className="font-heading text-6xl font-bold tracking-tight text-white">{machineCount || '—'}</p>
            <p className="mt-1 text-sm text-[#b1b7c3]">
              {fromPrice != null ? `From ${money(fromPrice)}. ` : ''}
              Odds, EV, and buyback sit on the pack.
            </p>
            <span className="mt-8 flex h-12 items-center justify-center rounded-lg bg-[#3c8aff] text-sm font-bold uppercase tracking-wide text-white">
              View packs
            </span>
          </a>

          <a
            href="#borrow"
            className="flex flex-col rounded-2xl border border-white/10 bg-[#14171e] p-6 hover:border-[#3c8aff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3c8aff]"
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-heading text-2xl font-bold text-white">Borrow</h2>
              {thumbs[0] && (
                <img
                  src={thumbs[0].imageUrl}
                  alt=""
                  width={64}
                  height={64}
                  decoding="async"
                  className="size-12 rounded-lg border border-white/10 bg-[#0a0b0d] object-contain"
                />
              )}
            </div>
            <p className="mt-8 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#717886]">Sample term</p>
            <p className="font-heading text-6xl font-bold tracking-tight text-[#ffd12f]">30 days</p>
            <p className="mt-1 text-sm text-[#b1b7c3]">Lock a pull. Repay, and it unlocks. Loans are not open.</p>
            <span className="mt-8 flex h-12 items-center justify-center rounded-lg border border-white/15 text-sm font-bold uppercase tracking-wide text-white">
              Borrow desk
            </span>
          </a>
        </div>

        <dl className="mt-8 grid w-full grid-cols-3 border-y border-white/10 py-6 text-center">
          <div>
            <dt className="text-xs text-[#717886]">Machines</dt>
            <dd className="mt-1 font-heading text-2xl font-bold text-white sm:text-3xl">{machineCount || '—'}</dd>
          </div>
          <div className="border-x border-white/10">
            <dt className="text-xs text-[#717886]">From</dt>
            <dd className="mt-1 font-heading text-2xl font-bold text-white sm:text-3xl">
              {fromPrice != null ? money(fromPrice) : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-[#717886]">Starter buyback</dt>
            <dd className="mt-1 font-heading text-2xl font-bold text-[#ffd12f] sm:text-3xl">
              {buyback != null ? `${buyback}%` : '—'}
            </dd>
          </div>
        </dl>
      </div>
    </section>
  )
}
