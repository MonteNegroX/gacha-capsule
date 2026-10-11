import type { ReactNode } from 'react'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'

export function SiteFrame({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-[#0a0b0d]">
      <SiteHeader />
      <div className="mx-auto flex max-w-7xl flex-col gap-10 px-4 py-14 sm:px-6 lg:px-8">{children}</div>
      <SiteFooter />
    </main>
  )
}
