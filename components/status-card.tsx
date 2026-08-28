import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import { currentUser } from '@/lib/mock-data'

export function StatusCard() {
  return (
    <div className="flex h-full min-w-0 flex-col gap-6 rounded-2xl border border-border bg-card p-6">
      <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
        Your status
      </span>

      <div className="flex items-center gap-3">
        <Image
          src={currentUser.avatar || '/placeholder.svg'}
          alt=""
          width={48}
          height={48}
          className="size-12 rounded-full ring-2 ring-brand-cerulean/60"
        />
        <div className="flex items-center gap-2">
          <span className="font-heading text-base font-bold text-foreground">
            {currentUser.username}
          </span>
          <Badge className="border border-brand-cerulean/30 bg-brand-cerulean/15 text-[10px] font-bold uppercase tracking-wide text-brand-cerulean">
            You
          </Badge>
        </div>
      </div>

      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Total points
          </p>
          <p className="font-heading text-4xl font-bold text-[#3c8aff]">
            {currentUser.totalPoints.toLocaleString()}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Your rank
          </p>
          <p className="font-heading text-4xl font-bold text-foreground">
            #{currentUser.rank}
          </p>
        </div>
      </div>
    </div>
  )
}
