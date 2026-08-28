import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { XIcon } from '@/components/icons'

export function HeroSection() {
  return (
    <section id="top" className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 top-0 size-[420px] rounded-full bg-gold/10 blur-3xl" />
        <div className="absolute right-0 top-40 size-[320px] rounded-full bg-gold/5 blur-3xl" />
      </div>

      <div className="relative mx-auto grid max-w-6xl gap-10 px-4 pb-16 pt-14 sm:px-6 md:grid-cols-2 md:items-center md:gap-8 md:pb-24 md:pt-20 lg:px-8">
        <div className="flex flex-col gap-6">
          <h1 className="font-heading text-5xl font-bold leading-[1.05] tracking-tight text-foreground sm:text-6xl">
            Collect.
            <br />
            Open.
            <br />
            <span className="text-gold">Compete.</span>
          </h1>

          <p className="max-w-md text-base leading-relaxed text-muted-foreground">
            Gacha Capsule Collectibles for Pokémon Card Lovers.
          </p>

          <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
            Join the waitlist, complete missions, earn points and climb the leaderboard.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button
              size="lg"
              className="h-12 bg-gold px-8 text-sm font-bold uppercase tracking-wide text-gold-foreground hover:bg-gold/90"
            >
              Join Waitlist
            </Button>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <XIcon className="size-3.5" />
              Connect with Twitter / X
            </div>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-md md:max-w-none">
          <Image
            src="/images/hero-capsule-machine.png"
            alt="Illustration of a glowing gacha capsule vending machine surrounded by floating holographic collectible cards"
            width={900}
            height={900}
            priority
            className="h-auto w-full"
          />
        </div>
      </div>
    </section>
  )
}
