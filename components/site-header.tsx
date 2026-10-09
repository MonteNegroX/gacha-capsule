'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AuthButton } from '@/components/auth-button'

const navLinks = [
  { label: 'Packs', href: '/#packs', external: false },
  { label: 'Borrow', href: '/#borrow', external: false },
  { label: 'Quests', href: '/#quests', external: false },
  { label: 'Leaderboard', href: '/#leaderboard', external: false },
  { label: 'Community', href: 'https://x.com/capsulepull', external: true },
]

export function SiteHeader() {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0a0b0d]/70 backdrop-blur-lg">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
        <a href="#top" className="flex items-center gap-2.5">
          <Image
            src="/images/logo.jpg"
            alt="Capsule Logo"
            width={32}
            height={32}
            className="size-8 rounded-full object-cover ring-2 ring-brand-cerulean/60"
          />
          <span className="font-heading text-base font-bold uppercase tracking-wider text-foreground">
            Capsule
          </span>
        </a>

        <nav className="hidden items-center gap-8 lg:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              target={link.external ? '_blank' : undefined}
              rel={link.external ? 'noopener noreferrer' : undefined}
              className="text-sm font-medium text-[#b1b7c3] transition-colors hover:text-[#3c8aff]"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden lg:block">
          <AuthButton />
        </div>

        <button
          type="button"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="flex size-9 items-center justify-center rounded-md text-white lg:hidden"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-white/10 px-4 pb-6 pt-2 lg:hidden">
          <nav className="flex flex-col gap-4 py-4">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target={link.external ? '_blank' : undefined}
                rel={link.external ? 'noopener noreferrer' : undefined}
                onClick={() => setOpen(false)}
                className="text-sm font-medium text-[#b1b7c3] transition-colors hover:text-[#3c8aff]"
              >
                {link.label}
              </a>
            ))}
          </nav>
          <AuthButton className="w-full" />
        </div>
      )}
    </header>
  )
}
