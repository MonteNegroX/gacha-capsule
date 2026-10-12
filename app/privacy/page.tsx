import { SiteFrame } from '@/components/site-frame'
import { pageMeta } from '@/lib/site-meta'

export const metadata = pageMeta({
  path: '/privacy',
  title: 'Privacy Policy | Capsule',
  description:
    'What Capsule collects when you sign in with Privy, and how that information is used for the waitlist, quests, and leaderboard.',
})

export default function PrivacyPage() {
  return (
    <SiteFrame>
    <article className="max-w-2xl text-white">
      <h1 className="font-heading text-3xl font-bold">Privacy Policy</h1>
      <p className="mt-4 text-sm text-[#b1b7c3]">Last updated: 2026</p>
      <div className="mt-8 flex flex-col gap-6 text-sm leading-relaxed text-[#b1b7c3]">
        <h2 className="font-heading text-lg font-bold text-white">Information We Collect</h2>
        <p>
          We may collect public account details (such as your Twitter username, wallet address, or email)
          when you authenticate via Privy to calculate leaderboard rank and rewards.
        </p>
        <h2 className="font-heading text-lg font-bold text-white">How We Use Information</h2>
        <p>
          Your information is used solely to verify waitlist eligibility, process quest completions,
          and assign reward points.
        </p>
      </div>
    </article>
    </SiteFrame>
  )
}

