import Image from 'next/image'
import { DiscordIcon, InstagramIcon, XIcon } from '@/components/icons'

const socials = [
  { label: 'X', icon: XIcon, href: 'https://x.com/capsulepull' },
  { label: 'Discord', icon: DiscordIcon, href: '#' },
  { label: 'Instagram', icon: InstagramIcon, href: '#' },
]

export function SiteFooter() {
  return (
    <footer className="relative overflow-hidden border-t border-border bg-[#0a0b0d]">
      {/* Dimmed Background Image */}
      <div className="absolute inset-0 z-0 opacity-45 filter brightness-60 pointer-events-none">
        <Image
          src="/images/hero.jpg"
          alt=""
          fill
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0b0d] via-[#0a0b0d]/50 to-[#0a0b0d]" />
      </div>
      <div className="relative z-10 mx-auto flex max-w-7xl flex-col gap-10 px-4 py-12 sm:px-6 md:flex-row md:justify-between lg:px-8">
        <div className="flex max-w-xs flex-col gap-3">
          <div className="flex items-center gap-2.5">
            <Image
              src="/images/logo.jpg"
              alt="Capsule Logo"
              width={28}
              height={28}
              className="size-7 rounded-full object-cover ring-2 ring-brand-cerulean/60"
            />
            <span className="font-heading text-sm font-bold uppercase tracking-wider text-white">
              Capsule
            </span>
          </div>
          <p className="text-sm leading-relaxed text-[#b1b7c3]">
            The on-chain layer & bridge for Pokémon, One Piece, and TCG collectibles.
          </p>
        </div>

        <div className="flex gap-16">
          <div className="flex flex-col gap-3">
            <span className="text-xs font-bold uppercase tracking-widest text-[#b1b7c3]">
              Connect
            </span>
            <div className="flex items-center gap-3">
              {socials.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  aria-label={s.label}
                  className="flex size-9 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md transition-colors hover:bg-[#3c8aff]"
                >
                  <s.icon className="size-4" />
                </a>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <span className="text-xs font-bold uppercase tracking-widest text-[#b1b7c3]">
              Legal
            </span>
            <a href="/terms" className="text-sm text-[#b1b7c3] hover:text-[#3c8aff] transition-colors">
              Terms of Service
            </a>
            <a href="/privacy" className="text-sm text-[#b1b7c3] hover:text-[#3c8aff] transition-colors">
              Privacy Policy
            </a>
          </div>
        </div>
      </div>

      <div className="relative z-10 border-t border-white/10 px-4 py-6 sm:px-6 lg:px-8">
        <p className="mx-auto max-w-7xl text-xs text-[#b1b7c3]">
          © 2026 Capsule. All rights reserved.
        </p>
      </div>
    </footer>
  )
}
