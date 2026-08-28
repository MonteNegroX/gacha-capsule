import { Check, Heart, Repeat2, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { XIcon } from '@/components/icons'
import { tasks, type Task } from '@/lib/mock-data'

const iconMap: Record<Task['icon'], React.ComponentType<{ className?: string }>> = {
  follow: XIcon,
  like: Heart,
  repost: Repeat2,
  invite: UserPlus,
}

export function TasksCard() {
  return (
    <div className="flex h-full min-w-0 flex-col gap-4 rounded-2xl border border-border bg-card p-6">
      <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
        Earn more points
      </span>

      <ul className="flex flex-col gap-2">
        {tasks.map((task) => {
          const Icon = iconMap[task.icon]
          const isDone = task.status === 'completed'

          return (
            <li
              key={task.id}
              className="flex min-w-0 items-center gap-3 rounded-xl bg-secondary/60 px-3 py-3"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-background text-foreground">
                <Icon className="size-4" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">{task.title}</p>
                <p className="truncate text-xs text-muted-foreground">{task.description}</p>
              </div>

              <span className="shrink-0 text-xs font-bold text-gold">+{task.points}</span>

              <Button
                size="sm"
                disabled={isDone}
                variant={isDone ? 'secondary' : 'default'}
                className={
                  isDone
                    ? 'shrink-0 gap-1 bg-transparent text-xs text-muted-foreground disabled:opacity-100'
                    : 'shrink-0 bg-foreground text-xs font-bold text-background hover:bg-foreground/85'
                }
              >
                {isDone ? (
                  <>
                    <Check className="size-3.5" />
                    Done
                  </>
                ) : (
                  task.cta
                )}
              </Button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
