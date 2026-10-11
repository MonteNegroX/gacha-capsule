'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { usePrivy } from '@privy-io/react-auth'
import { Award, ShieldCheck, Zap, Flame } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export function StatusCard() {
  const { authenticated, user, login } = usePrivy()
  const [dbUser, setDbUser] = useState<{
    username: string
    avatar: string
    totalPoints: number
    rank: number
  } | null>(null)

  useEffect(() => {
    if (authenticated && user) {
      fetch('/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          privyId: user.id,
          username: user.email?.address?.split('@')[0] || (user.wallet?.address ? `${user.wallet.address.slice(0, 6)}...` : 'Collector'),
          avatar: '/images/avatar-1.png',
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.user) {
            setDbUser(data.user)
          }
        })
        .catch((err) => console.error('StatusCard fetch error:', err))
    } else {
      setDbUser(null)
    }
  }, [authenticated, user])

  const username = dbUser?.username || 'Collector'
  const points = dbUser?.totalPoints ?? 0
  const rank = dbUser?.rank ?? '-'

  // Calculate Level & Next Level Progress
  const level = Math.floor(points / 500) + 1
  const pointsInCurrentLevel = points % 500
  const progressPercent = Math.min(100, Math.max(8, Math.round((pointsInCurrentLevel / 500) * 100)))

  return (
    <div className="flex h-full min-w-0 flex-col gap-4 rounded-2xl border border-white/10 bg-[#14171e] p-5 shadow-xl">
      {/* Top Bar: Header & Connection Badge */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-4 text-[#3c8aff]" />
          <span className="text-xs font-bold uppercase tracking-widest text-[#b1b7c3]">
            <a href="/profile" className="hover:text-[#3c8aff]">Collector Profile</a>
          </span>
        </div>
        {authenticated ? (
          <Badge className="border border-[#66c800]/30 bg-[#66c800]/15 text-[10px] font-bold uppercase text-[#66c800]">
            Connected
          </Badge>
        ) : (
          <Badge className="border border-white/10 bg-white/5 text-[10px] font-bold uppercase text-[#b1b7c3]">
            Guest
          </Badge>
        )}
      </div>

      {/* Profile Box */}
      <div className="flex items-center justify-between rounded-xl border border-white/5 bg-[#1f232d]/70 p-3.5">
        <div className="flex items-center gap-3">
          <Image
            src={dbUser?.avatar || '/images/avatar-1.png'}
            alt=""
            width={44}
            height={44}
            className="size-11 rounded-full ring-2 ring-[#3c8aff]/60"
          />
          <div className="flex flex-col">
            <span className="font-heading text-base font-bold text-white">
              {username}
            </span>
            <span className="text-xs font-medium text-[#b1b7c3]">
              {authenticated ? 'Season 1 Participant' : 'Unregistered Collector'}
            </span>
          </div>
        </div>
        <Badge className="border border-[#3c8aff]/30 bg-[#3c8aff]/15 text-[10px] font-bold uppercase text-[#3c8aff]">
          LVL {level}
        </Badge>
      </div>

      {/* Points & Rank Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1 rounded-xl border border-white/5 bg-[#1f232d]/40 p-3.5">
          <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#b1b7c3]">
            <Zap className="size-3.5 text-[#3c8aff]" />
            Earned PTS
          </span>
          <span className="font-heading text-3xl font-bold text-[#3c8aff]">
            {points.toLocaleString('en-US')}
          </span>
        </div>

        <div className="flex flex-col gap-1 rounded-xl border border-white/5 bg-[#1f232d]/40 p-3.5">
          <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#b1b7c3]">
            <Award className="size-3.5 text-[#ffd12f]" />
            Global Rank
          </span>
          <span className="font-heading text-3xl font-bold text-white">
            #{rank}
          </span>
        </div>
      </div>

      {/* Level Progress Bar */}
      <div className="flex flex-col gap-2 rounded-xl border border-white/5 bg-[#1f232d]/40 p-3.5">
        <div className="flex items-center justify-between text-xs font-semibold text-[#b1b7c3]">
          <span className="flex items-center gap-1.5 text-white">
            <Flame className="size-3.5 text-[#fc401f]" />
            Level {level} Progress
          </span>
          <span>{pointsInCurrentLevel} / 500 PTS</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-[#0a0b0d]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#3c8aff] to-[#66c800] transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Bottom CTA Button if not authenticated */}
      {!authenticated && (
        <Button
          size="sm"
          onClick={login}
          className="mt-auto h-10 w-full bg-[#3c8aff] text-xs font-bold uppercase tracking-wider text-white hover:bg-[#0000ff] shadow-sm shadow-[#3c8aff]/20"
        >
          Sign In to Start
        </Button>
      )}
    </div>
  )
}
