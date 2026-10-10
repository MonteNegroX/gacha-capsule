import Image from 'next/image'

export function HeroSection() {
  return (
    <section id="top" className="relative -mt-[73px] flex min-h-[660px] w-full items-center overflow-hidden border-b border-white/10">
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/hero.jfif"
          alt="Capsule machine"
          fill
          priority
          className="object-cover object-right sm:object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0b0d] via-[#0a0b0d]/80 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0b0d] via-transparent to-[#0a0b0d]/40" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pt-28 pb-14 sm:px-6 md:pt-36 md:pb-20 lg:px-8">
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
            <p className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#0a0b0d]/80 px-4 py-3 text-xs font-semibold text-[#b1b7c3]">
              <span className="inline-block size-2 rounded-full bg-[#66c800]" />
              Season 1 Early Access
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
