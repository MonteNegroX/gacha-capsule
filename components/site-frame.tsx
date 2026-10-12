import type { ReactNode } from 'react'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'

export function SiteFrame({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0a0b0d]">
      <SiteHeader />
      <main id="main" className="mx-auto flex max-w-7xl flex-col gap-16 px-6 py-16 sm:px-6 lg:px-12">{children}</main>
      <SiteFooter />
    </div>
  )
}
