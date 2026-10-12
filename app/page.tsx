import { SiteHeader } from '@/components/site-header'
import { HeroSection } from '@/components/hero-section'
import { HowItWorks } from '@/components/how-it-works'
import { BorrowDesk } from '@/components/borrow-desk'
import { PackFloor } from '@/components/gacha/pack-floor'
import { StatusCard } from '@/components/status-card'
import { TasksCard } from '@/components/tasks-card'
import { LeaderboardCard } from '@/components/leaderboard-card'
import { SiteFooter } from '@/components/site-footer'
import { loadPublicMachines } from '@/lib/gacha/catalog'
import type { GachaMachine } from '@/lib/gacha/types'
import { listListedDeals, type ListedDeal } from '@/lib/gacha/pull-store'
import { loadVaultListing } from '@/lib/gacha/vault-listing'
import { treasuryAddress } from '@/lib/gacha/verify-payment'

export const dynamic = 'force-dynamic'

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ category?: string | string[] }>
}) {
  const params = await searchParams
  const requested = Array.isArray(params.category) ? params.category[0] : params.category
  const category = requested ?? ''
  let machines: GachaMachine[] = []
  let unavailable = false
  try {
    machines = await loadPublicMachines()
  } catch {
    unavailable = true
  }

  const shots = machines.flatMap((machine) =>
    machine.imageUrl?.includes('blob.vercel-storage.com')
      ? [{ name: machine.name, imageUrl: machine.imageUrl }]
      : [],
  )
  const starter = machines.find((machine) => machine.code === 'pokemon_25') ?? machines[0] ?? null
  const treasury = treasuryAddress()
  let deals: ListedDeal[] = []
  try {
    deals = await listListedDeals()
  } catch {
    deals = []
  }

  return (
    <div className="min-h-screen bg-[#0a0b0d]">
      <SiteHeader />
      <main id="main">
      <HeroSection />

      <div className="mx-auto flex max-w-7xl flex-col gap-24 px-6 pt-16 pb-24 sm:px-6 lg:gap-32 lg:px-12">
        <HowItWorks shots={shots.slice(0, 4)} />
        <PackFloor machines={machines} unavailable={unavailable} treasury={treasury} initialCategory={category} />
        <BorrowDesk machine={starter} listing={loadVaultListing()} deals={deals} treasury={treasury} />

        <section id="quests" className="grid scroll-mt-24 grid-cols-1 gap-6 md:grid-cols-2">
          <StatusCard />
          <TasksCard />
        </section>

        <section id="leaderboard" className="scroll-mt-24">
          <LeaderboardCard />
        </section>
      </div>
      </main>

      <SiteFooter />
    </div>
  )
}
