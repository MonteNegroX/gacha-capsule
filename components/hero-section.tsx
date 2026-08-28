import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { XIcon } from '@/components/icons'
import { AuthButton } from '@/components/auth-button'

export function HeroSection() {
  return (
    <section id="top" className="relative -mt-[73px] min-h-[660px] w-full overflow-hidden border-b border-border flex items-center">
      {/* Full-width Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/hero.jfif"
          alt="Retro pixel art Gacha capsule machine banner"
          fill
          priority
          className="object-cover object-right sm:object-center"
        />
        {/* Dark Overlay Gradients for readable text */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0b0d] via-[#0a0b0d]/80 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0b0d] via-transparent to-[#0a0b0d]/40" />
      </div>

      {/* Hero Content */}
      <div className="relative z-10 mx-auto w-full max-w-6xl px-4 pt-32 pb-16 sm:px-6 md:pt-40 md:pb-24 lg:px-8">
        <div className="flex max-w-xl flex-col gap-6">
          <h1 className="font-heading text-5xl font-bold leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-7xl">
            Collect.
            <br />
            Open.
            <br />
            <span className="text-[#3c8aff] drop-shadow-md">Compete.</span>
          </h1>

          <p className="text-base leading-relaxed text-[#b1b7c3] sm:text-lg">
            Open, play, and trade all on-chain collectibles — Pokémon, One Piece, Sports Cards, and TCG — in one place. Join the waitlist and climb the leaderboard.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <AuthButton
              size="lg"
              className="h-12 bg-[#3c8aff] px-8 text-sm font-bold uppercase tracking-wide text-white hover:bg-[#0000ff] shadow-lg shadow-[#3c8aff]/30 border-none"
            />
            <div className="flex items-center gap-2 text-xs font-medium text-[#b1b7c3] bg-[#0a0b0d]/70 backdrop-blur-md px-3.5 py-2.5 rounded-xl border border-white/10">
              <span className="inline-block size-2 rounded-full bg-[#3c8aff]" />
              Connect with Email or Wallet
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
