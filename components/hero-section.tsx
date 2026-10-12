import Image from 'next/image'

export function HeroSection() {
  return (
    <section id="top" className="relative -mt-16 flex min-h-[660px] w-full items-center overflow-hidden border-b border-white/10" aria-labelledby="hero-heading">
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/hero.jfif"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-right sm:object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0b0d] via-[#0a0b0d]/80 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0b0d] via-transparent to-[#0a0b0d]/40" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col items-start gap-5 px-6 pt-28 pb-14 sm:px-6 md:pt-36 md:pb-20 lg:px-12">
        <p className="flex items-center gap-2 text-sm font-medium text-white/50">
          <span className="inline-block size-2 rounded-full bg-[#66c800]" aria-hidden="true" />
          Season 1 Early Access
        </p>
        <h1 id="hero-heading" className="font-heading text-5xl font-semibold leading-[1.05] tracking-tight text-white sm:text-6xl">
          Collect.
          <br />
          Open.
          <br />
          Compete.
        </h1>
        <p className="max-w-xl text-base leading-relaxed text-white/55 sm:text-lg">
          Pay 25 USDG on Robinhood or 25 USDC on Hyperliquid. Take the buyback, or Double a Common within 24 hours.
        </p>
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <a
            href="#packs"
            className="inline-flex h-12 items-center justify-center rounded-lg bg-white px-6 text-base font-medium text-[#0a0a0a] hover:bg-white/85 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3c8aff]"
          >
            Open the $25 Pack
          </a>
          <a
            href="/lend"
            className="inline-flex h-12 items-center justify-center rounded-lg border border-white/20 px-5 text-base font-medium text-white hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3c8aff]"
          >
            Fund a Listed Card
          </a>
        </div>
      </div>
    </section>
  )
}
