type Shot = {
  name: string
  imageUrl: string
}

export function HeroSection({ shots }: { shots: Shot[] }) {
  const lead = shots[0]
  const rest = shots.slice(1, 3)

  return (
    <section id="top" className="border-b border-white/10">
      <div className="mx-auto grid w-full max-w-7xl items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:px-8 lg:py-20">
        <div className="flex max-w-xl flex-col gap-5">
          <h1 className="font-heading text-5xl font-bold leading-[1.05] tracking-tight text-white sm:text-6xl">
            Collect.
            <br />
            Open.
            <br />
            <span className="text-[#3c8aff]">Compete.</span>
          </h1>
          <p className="text-base leading-relaxed text-[#b1b7c3] sm:text-lg">
            Open a pack. Read the odds and the buyback. Borrow against a pull when the desk opens.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <a
              href="#packs"
              className="inline-flex h-12 items-center justify-center rounded-lg bg-[#3c8aff] px-6 text-sm font-bold uppercase tracking-wide text-white shadow-lg shadow-[#3c8aff]/25 hover:bg-[#0000ff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3c8aff]"
            >
              View packs
            </a>
            <a
              href="#borrow"
              className="inline-flex h-12 items-center justify-center rounded-lg border border-white/15 px-5 text-sm font-bold uppercase tracking-wide text-white hover:border-[#3c8aff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3c8aff]"
            >
              Borrow desk
            </a>
            <p className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#14171e] px-4 py-3 text-xs font-semibold text-[#b1b7c3]">
              <span className="inline-block size-2 rounded-full bg-[#66c800]" />
              Season 1 Early Access
            </p>
          </div>
        </div>

        {lead && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-[minmax(0,1.35fr)_minmax(0,0.85fr)] sm:grid-rows-2">
            <figure className="col-span-2 rounded-3xl border border-white/10 bg-[#14171e] p-4 sm:col-span-1 sm:row-span-2 sm:p-6">
              <img
                src={lead.imageUrl}
                alt={lead.name}
                width={1080}
                height={1080}
                fetchPriority="high"
                decoding="async"
                className="aspect-square w-full object-contain"
              />
            </figure>
            {rest.map((shot) => (
              <figure key={shot.imageUrl} className="rounded-3xl border border-white/10 bg-[#14171e] p-3">
                <img
                  src={shot.imageUrl}
                  alt={shot.name}
                  width={1080}
                  height={1080}
                  decoding="async"
                  className="aspect-square w-full object-contain"
                />
              </figure>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
