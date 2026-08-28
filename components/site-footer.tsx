import Image from 'next/image'
import { DiscordIcon, InstagramIcon, XIcon } from '@/components/icons'

const socials = [
  { label: 'X', icon: XIcon, href: '#' },
  { label: 'Discord', icon: DiscordIcon, href: '#' },
  { label: 'Instagram', icon: InstagramIcon, href: '#' },
]

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-12 sm:px-6 md:flex-row md:justify-between lg:px-8">
        <div className="flex max-w-xs flex-col gap-3">
          <div className="flex items-center gap-2.5">
            <Image
              src="/images/avatar-8.png"
              alt=""
              width={28}
              height={28}
              className="size-7 rounded-full ring-1 ring-gold/40"
            />
            <span className="font-heading text-sm font-bold uppercase tracking-wide text-foreground">
              Gacha Capsules
            </span>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            The ultimate gacha experience for Pokémon card collectors.
          </p>
        </div>

        <div className="flex gap-16">
          <div className="flex flex-col gap-3">
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Connect
            </span>
            <div className="flex items-center gap-3">
              {socials.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  aria-label={s.label}
                  className="flex size-9 items-center justify-center rounded-full bg-secondary text-foreground transition-colors hover:bg-secondary/70"
                >
                  <s.icon className="size-4" />
                </a>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Legal
            </span>
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground">
              Terms of Service
            </a>
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground">
              Privacy Policy
            </a>
          </div>
        </div>
      </div>

      <div className="border-t border-border px-4 py-6 sm:px-6 lg:px-8">
        <p className="mx-auto max-w-6xl text-xs text-muted-foreground">
          © 2024 Gacha Capsules. All rights reserved.
        </p>
      </div>
    </footer>
  )
}
