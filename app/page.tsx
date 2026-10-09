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

export default async function Page() {
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
  const fromPrice = machines.reduce<number | null>(
    (lowest, machine) => (lowest == null || machine.price < lowest ? machine.price : lowest),
    null,
  )

  return (
    <main className="min-h-screen bg-[#0a0b0d]">
      <SiteHeader />
      <HeroSection
        shots={shots.slice(0, 4)}
        machineCount={machines.length}
        fromPrice={fromPrice}
        buyback={starter?.instantBuyback ?? null}
      />

      <div className="mx-auto flex max-w-7xl flex-col gap-16 px-4 py-14 sm:px-6 lg:px-8">
        <HowItWorks />
        <PackFloor machines={machines} unavailable={unavailable} />
        <BorrowDesk machine={starter} />

        <section id="quests" className="grid scroll-mt-24 grid-cols-1 gap-6 md:grid-cols-2">
          <StatusCard />
          <TasksCard />
        </section>

        <section id="leaderboard" className="scroll-mt-24">
          <LeaderboardCard />
        </section>
      </div>

      <SiteFooter />
    </main>
  )
}
