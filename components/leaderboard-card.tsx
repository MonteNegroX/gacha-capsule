'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Trophy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { topThree as defaultTopThree, leaderboard as defaultLeaderboard, LeaderboardUser } from '@/lib/mock-data'

function PodiumSpot({ user, featured }: { user: LeaderboardUser; featured?: boolean }) {
  if (!user) return null
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-2 rounded-xl border border-white/5 bg-[#1f232d]/40 px-3 py-4 text-center transition-[transform,border-color,background-color]',
        featured && 'border-[#3c8aff]/50 bg-[#3c8aff]/10 sm:-translate-y-3',
      )}
    >
      <div className="relative">
        <Image
          src={user.avatar || '/placeholder.svg'}
          alt=""
          width={56}
          height={56}
          className={cn(
            'size-12 rounded-full ring-2 ring-white/10 sm:size-14',
            featured && 'ring-[#3c8aff]',
          )}
        />
        <span
          className={cn(
            'absolute -top-1.5 left-1/2 flex size-5 -translate-x-1/2 items-center justify-center rounded-full text-[10px] font-bold',
            featured ? 'bg-[#3c8aff] text-white' : 'bg-[#1f232d] text-white ring-1 ring-white/10',
          )}
        >
          {user.rank}
        </span>
      </div>
      <p className="truncate text-sm font-semibold text-white">{user.username}</p>
      <p className="text-xs font-bold text-[#3c8aff]">{user.points.toLocaleString('en-US')} pts</p>
    </div>
  )
}

export function LeaderboardCard() {
  const [boardList, setBoardList] = useState<LeaderboardUser[]>(defaultLeaderboard)
  const [topUsers, setTopUsers] = useState<LeaderboardUser[]>(defaultTopThree)

  useEffect(() => {
    fetch('/api/leaderboard')
      .then((res) => res.json())
      .then((data) => {
        if (data.leaderboard && data.leaderboard.length >= 3) {
          setTopUsers([data.leaderboard[1], data.leaderboard[0], data.leaderboard[2]])
          setBoardList(data.leaderboard.slice(3))
        }
      })
      .catch((err) => console.error('Leaderboard fetch error:', err))
  }, [])

  return (
    <div id="leaderboard" className="flex flex-col gap-6 rounded-2xl border border-white/10 bg-[#14171e] p-6 shadow-xl">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Trophy className="size-4 text-[#3c8aff]" />
          <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Leaderboard
          </span>
        </div>
        <span className="text-xs text-muted-foreground">Season 1</span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <PodiumSpot user={topUsers[0]} />
        <PodiumSpot user={topUsers[1]} featured />
        <PodiumSpot user={topUsers[2]} />
      </div>

      <Separator />

      <div className="flex flex-col">
        {boardList.map((user, i) => (
          <div key={`${user.username}-${i}`}>
            <div
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-white/5',
                user.isCurrentUser && 'border border-[#3c8aff]/40 bg-[#3c8aff]/15 hover:bg-[#3c8aff]/20',
              )}
            >
              <span className="w-6 shrink-0 text-sm font-semibold text-muted-foreground">
                {user.rank}
              </span>
              <Image
                src={user.avatar || '/placeholder.svg'}
                alt=""
                width={32}
                height={32}
                className="size-8 shrink-0 rounded-full ring-1 ring-border"
              />
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                {user.username}
              </span>
              <span className="shrink-0 text-sm font-bold text-[#3c8aff]">
                {user.points.toLocaleString('en-US')}
              </span>
              {user.isCurrentUser && (
                <Badge className="ml-1 shrink-0 border border-[#3c8aff]/30 bg-[#3c8aff]/20 text-[10px] font-bold uppercase text-[#3c8aff]">
                  You
                </Badge>
              )}
            </div>
            {i < boardList.length - 1 && !user.isCurrentUser && (
              <Separator className="opacity-50" />
            )}
          </div>
        ))}
      </div>

      <Button variant="secondary" className="w-full font-semibold border border-[#3c8aff]/30 text-[#3c8aff] hover:bg-[#3c8aff] hover:text-white transition-colors">
        View full leaderboard
      </Button>
    </div>
  )
}
