'use client'

import { useState } from 'react'
import { Check, Copy, Heart, Loader2, Repeat2, Share2, Sparkles, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { XIcon } from '@/components/icons'
import { Badge } from '@/components/ui/badge'

type TaskState = {
  id: string
  title: string
  description: string
  points: number
  status: 'available' | 'verifying' | 'completed'
  cta: string
  icon: 'follow' | 'like' | 'repost' | 'invite'
  url?: string
}

const initialTasks: TaskState[] = [
  {
    id: 'follow',
    title: 'Follow @CapsuleOnChain on X',
    description: 'Get instant updates & early Gacha drops',
    points: 100,
    status: 'available',
    cta: 'Follow',
    icon: 'follow',
    url: 'https://x.com/intent/follow?screen_name=CapsuleOnChain',
  },
  {
    id: 'like',
    title: 'Like our Pinned Announcement',
    description: 'Show support for the genesis capsule release',
    points: 50,
    status: 'completed',
    cta: 'Like',
    icon: 'like',
    url: 'https://x.com',
  },
  {
    id: 'repost',
    title: 'Repost our Genesis Pack Tweet',
    description: 'Help spread the word to fellow collectors',
    points: 100,
    status: 'available',
    cta: 'Repost',
    icon: 'repost',
    url: 'https://x.com',
  },
  {
    id: 'invite',
    title: 'Invite Friends with Referral Link',
    description: 'Earn +200 points for every friend who joins',
    points: 200,
    status: 'available',
    cta: 'Copy link',
    icon: 'invite',
  },
]

const iconMap: Record<TaskState['icon'], React.ComponentType<{ className?: string }>> = {
  follow: XIcon,
  like: Heart,
  repost: Repeat2,
  invite: UserPlus,
}

export function TasksCard() {
  const [taskList, setTaskList] = useState<TaskState[]>(initialTasks)
  const [copied, setCopied] = useState(false)
  const [totalEarned, setTotalEarned] = useState(50) // starts with 1 completed task

  const referralLink = 'https://capsule.game/waitlist?ref=GachaMaster'

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleRunTask = (taskId: string) => {
    if (taskId === 'invite') {
      handleCopyLink()
      return
    }

    // Set verifying status
    setTaskList((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: 'verifying' } : t)),
    )

    // Simulate X API verification delay (1.5 seconds)
    setTimeout(() => {
      setTaskList((prev) =>
        prev.map((t) => {
          if (t.id === taskId) {
            setTotalEarned((earned) => earned + t.points)
            return { ...t, status: 'completed' }
          }
          return t
        }),
      )
    }, 1500)
  }

  return (
    <div className="flex h-full min-w-0 flex-col gap-5 rounded-2xl border border-white/10 bg-[#14171e] p-6 shadow-xl">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-[#3c8aff]" />
          <span className="text-xs font-bold uppercase tracking-widest text-[#b1b7c3]">
            Quests & Social Missions
          </span>
        </div>
        <Badge className="border border-[#66c800]/30 bg-[#66c800]/15 text-[10px] font-bold uppercase text-[#66c800]">
          +{totalEarned} PTS Earned
        </Badge>
      </div>

      {/* Quest Tasks List */}
      <ul className="flex flex-col gap-2.5">
        {taskList.map((task) => {
          const Icon = iconMap[task.icon]
          const isDone = task.status === 'completed'
          const isVerifying = task.status === 'verifying'

          return (
            <li
              key={task.id}
              className="flex min-w-0 items-center gap-3 rounded-xl border border-white/5 bg-[#1f232d]/70 px-3.5 py-3 transition-colors hover:border-white/10"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#0a0b0d] text-white">
                <Icon className="size-4" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">{task.title}</p>
                <p className="truncate text-xs text-[#b1b7c3]">{task.description}</p>
              </div>

              <span className="shrink-0 text-xs font-bold text-[#3c8aff]">+{task.points}</span>

              <Button
                size="sm"
                disabled={isDone || isVerifying}
                onClick={() => handleRunTask(task.id)}
                className={
                  isDone
                    ? 'shrink-0 gap-1 border border-[#66c800]/30 bg-[#66c800]/15 text-xs font-bold text-[#66c800] disabled:opacity-100'
                    : isVerifying
                    ? 'shrink-0 gap-1.5 bg-[#3c8aff]/20 text-xs font-bold text-[#3c8aff]'
                    : 'shrink-0 bg-[#3c8aff] text-xs font-bold text-white hover:bg-[#0000ff] shadow-sm shadow-[#3c8aff]/20'
                }
              >
                {isDone ? (
                  <>
                    <Check className="size-3.5" />
                    Done
                  </>
                ) : isVerifying ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    Verifying
                  </>
                ) : (
                  task.cta
                )}
              </Button>
            </li>
          )
        })}
      </ul>

      {/* Referral Link Box */}
      <div className="flex flex-col gap-2.5 rounded-xl border border-[#3c8aff]/30 bg-[#3c8aff]/10 p-4">
        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#3c8aff]">
          <span className="flex items-center gap-1.5">
            <Share2 className="size-3.5" />
            Your Referral Link
          </span>
          <span className="text-[10px] text-[#b1b7c3]">+200 PTS per friend</span>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={referralLink}
            className="w-full min-w-0 rounded-lg border border-white/10 bg-[#0a0b0d] px-3 py-2 text-xs font-mono text-white outline-none focus:border-[#3c8aff]"
          />
          <Button
            size="sm"
            onClick={handleCopyLink}
            className="shrink-0 gap-1 bg-[#3c8aff] px-3.5 text-xs font-bold text-white hover:bg-[#0000ff]"
          >
            {copied ? (
              <>
                <Check className="size-3.5" />
                Copied
              </>
            ) : (
              <>
                <Copy className="size-3.5" />
                Copy
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
