import { SiteHeader } from '@/components/site-header'
import { HeroSection } from '@/components/hero-section'
import { StatusCard } from '@/components/status-card'
import { TasksCard } from '@/components/tasks-card'
import { LeaderboardCard } from '@/components/leaderboard-card'
import { SiteFooter } from '@/components/site-footer'

export default function Page() {
  return (
    <main className="min-h-screen">
      <SiteHeader />
      <HeroSection />

      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <StatusCard />
          <TasksCard />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 lg:px-8">
        <LeaderboardCard />
      </section>

      <SiteFooter />
    </main>
  )
}
