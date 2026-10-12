import Image from 'next/image'
import { XIcon } from '@/components/icons'

const socials = [
  { label: 'X', icon: XIcon, href: 'https://x.com/capsulepull' },
]

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-[#0a0b0d]">
      <div className="mx-auto flex max-w-7xl flex-col gap-10 px-6 py-16 sm:px-6 md:flex-row md:items-start md:justify-between lg:px-12">
        <div className="flex max-w-xs flex-col gap-3">
          <div className="flex items-center gap-2.5">
            <Image
              src="/images/logo.jpg"
              alt="Capsule Logo"
              width={28}
              height={28}
              className="size-7 rounded-full object-cover"
            />
            <span className="font-heading text-sm font-bold uppercase tracking-[0.05em] text-white">Capsule</span>
          </div>
          <p className="text-sm leading-relaxed text-[#b1b7c3]">
            Open the $25 pack. Take the buyback, or Double a Common.
          </p>
        </div>

        <div className="flex gap-16">
          <div className="flex flex-col gap-3">
            <span className="text-xs font-bold uppercase tracking-[0.08em] text-[#b1b7c3]">Connect</span>
            <div className="flex items-center gap-3">
              {socials.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  aria-label={s.label}
                  className="flex size-9 items-center justify-center rounded-full border border-white/10 text-white hover:border-[#3c8aff] hover:text-[#3c8aff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3c8aff]"
                >
                  <s.icon className="size-4" />
                </a>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <span className="text-xs font-bold uppercase tracking-[0.08em] text-[#b1b7c3]">Legal</span>
            <a href="/statistics" className="text-sm text-[#b1b7c3] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3c8aff]">
              Statistics
            </a>
            <a href="/lend" className="text-sm text-[#b1b7c3] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3c8aff]">
              Lend
            </a>
            <a href="/terms" className="text-sm text-[#b1b7c3] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3c8aff]">
              Terms of Service
            </a>
            <a href="/privacy" className="text-sm text-[#b1b7c3] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3c8aff]">
              Privacy Policy
            </a>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10 px-4 py-6 sm:px-6 lg:px-8">
        <p className="mx-auto max-w-7xl text-xs text-[#717886]">© 2026 Capsule. All rights reserved.</p>
      </div>
    </footer>
  )
}
