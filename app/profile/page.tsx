import type { Metadata } from 'next'
import { ProfileDesk } from '@/components/profile-desk'
import { SiteFrame } from '@/components/site-frame'

export const metadata: Metadata = {
  title: 'Profile — Capsule',
  description: 'Your pack openings and payouts.',
}

export default function ProfilePage() {
  return (
    <SiteFrame>
      <ProfileDesk />
    </SiteFrame>
  )
}
