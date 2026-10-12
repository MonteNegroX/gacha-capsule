import { SiteFrame } from '@/components/site-frame'
import { pageMeta } from '@/lib/site-meta'

export const metadata = pageMeta({
  path: '/terms',
  title: 'Terms of Service | Capsule',
  description:
    'Rules for the Capsule waitlist and quests. Points are promotional. Fraudulent task checks can remove them.',
})

export default function TermsPage() {
  return (
    <SiteFrame>
    <article className="max-w-2xl text-white">
      <h1 className="font-heading text-3xl font-bold">Terms of Service</h1>
      <p className="mt-4 text-sm text-[#b1b7c3]">Last updated: 2026</p>
      <div className="mt-8 flex flex-col gap-6 text-sm leading-relaxed text-[#b1b7c3]">
        <p>
          By accessing or joining the waitlist, you agree to these terms.
        </p>
        <h2 className="font-heading text-lg font-bold text-white">Waitlist and Quests</h2>
        <p>
          Points and leaderboard ranks are promotional incentives for early supporters. Sybil attacks
          or fraudulent task verification may result in points disqualification.
        </p>
        <h2 className="font-heading text-lg font-bold text-white">Limitation of Liability</h2>
        <p>
          Capsule is provided "as is". We reserve the right to modify or update quest rules and reward distribution schedules.
        </p>
      </div>
    </article>
    </SiteFrame>
  )
}

