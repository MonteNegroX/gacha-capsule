import Image from 'next/image'
import { Trophy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { topThree, leaderboard } from '@/lib/mock-data'

function PodiumSpot({ user, featured }: { user: (typeof topThree)[number]; featured?: boolean }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-2 rounded-xl border border-border bg-secondary/50 px-3 py-4 text-center',
        featured && 'border-gold/40 bg-gold/10 sm:-translate-y-3',
      )}
    >
      <div className="relative">
        <Image
          src={user.avatar || '/placeholder.svg'}
          alt=""
          width={56}
          height={56}
          className={cn(
            'size-12 rounded-full ring-2 ring-border sm:size-14',
            featured && 'ring-gold',
          )}
        />
        <span
          className={cn(
            'absolute -top-1.5 left-1/2 flex size-5 -translate-x-1/2 items-center justify-center rounded-full text-[10px] font-bold',
            featured ? 'bg-gold text-gold-foreground' : 'bg-secondary text-foreground ring-1 ring-border',
          )}
        >
          {user.rank}
        </span>
      </div>
      <p className="truncate text-sm font-semibold text-foreground">{user.username}</p>
      <p className="text-xs font-bold text-gold">{user.points.toLocaleString()} pts</p>
    </div>
  )
}

export function LeaderboardCard() {
  return (
    <div id="leaderboard" className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Trophy className="size-4 text-gold" />
          <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Leaderboard
          </span>
        </div>
        <span className="text-xs text-muted-foreground">Resets in 30 days</span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <PodiumSpot user={topThree[0]} />
        <PodiumSpot user={topThree[1]} featured />
        <PodiumSpot user={topThree[2]} />
      </div>

      <Separator />

      <div className="flex flex-col">
        {leaderboard.map((user, i) => (
          <div key={user.username}>
            <div
              className={cn(
                'flex items-center gap-3 rounded-lg px-2 py-2.5',
                user.isCurrentUser && 'border border-gold/40 bg-gold/10',
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
              <span className="shrink-0 text-sm font-bold text-foreground">
                {user.points.toLocaleString()}
              </span>
              {user.isCurrentUser && (
                <Badge className="ml-1 shrink-0 bg-gold/20 text-[10px] font-bold uppercase text-gold">
                  You
                </Badge>
              )}
            </div>
            {i < leaderboard.length - 1 && !user.isCurrentUser && (
              <Separator className="opacity-50" />
            )}
          </div>
        ))}
      </div>

      <Button variant="secondary" className="w-full font-semibold">
        View full leaderboard
      </Button>
    </div>
  )
}
