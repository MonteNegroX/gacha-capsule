import { ProfileDesk } from '@/components/profile-desk'
import { SiteFrame } from '@/components/site-frame'
import { pageMeta } from '@/lib/site-meta'

export const metadata = pageMeta({
  path: '/profile',
  title: 'Your Opens | Capsule',
  description: 'Pack openings and payouts for the wallet that paid on Robinhood.',
  index: false,
})

export default function ProfilePage() {
  return (
    <SiteFrame>
      <ProfileDesk />
    </SiteFrame>
  )
}
