import type { Metadata } from 'next'
import { MachineFloor } from '@/components/gacha/machine-floor'
import { loadPublicMachines } from '@/lib/gacha/catalog'
import { labConfigured, labUnlocked, liveOpenEnabled } from '@/lib/gacha/lab-session'
import { LabGate } from './gate'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Lab | Capsule',
  robots: { index: false, follow: false },
}

export default async function LabPage() {
  if (!(await labUnlocked())) {
    return <LabGate configured={labConfigured()} />
  }

  let machines: Awaited<ReturnType<typeof loadPublicMachines>> = []
  let unavailable = false
  try {
    machines = await loadPublicMachines()
  } catch {
    unavailable = true
  }

  const treasury = process.env.GACHA_TREASURY_ADDRESS?.trim() ?? ''
  const treasuryAddress = /^0x[a-fA-F0-9]{40}$/.test(treasury) && !/^0x0{40}$/i.test(treasury) ? treasury : ''

  return (
    <main id="main" className="min-h-screen bg-[#0a0b0d]">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 lg:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#66c800]">Private</p>
        <MachineFloor
          mode="lab"
          machines={machines}
          unavailable={unavailable}
          liveEnabled={liveOpenEnabled()}
          treasuryConfigured={treasuryAddress.length > 0}
          treasuryAddress={treasuryAddress}
        />
      </div>
    </main>
  )
}
