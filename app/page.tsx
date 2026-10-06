import { SiteHeader } from '@/components/site-header'
import { HeroSection } from '@/components/hero-section'
import { MachineFloor } from '@/components/gacha/machine-floor'
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

  return (
    <main className="min-h-screen bg-[#0a0b0d]">
      <SiteHeader />
      <HeroSection />

      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-12 sm:px-6 lg:px-8">
        <MachineFloor mode="preview" machines={machines} unavailable={unavailable} />

        <section id="quests" className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <StatusCard />
          <TasksCard />
        </section>

        <section id="leaderboard">
          <LeaderboardCard />
        </section>
      </div>

      <SiteFooter />
    </main>
  )
}
