'use client'

import { useEffect } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { Button } from '@/components/ui/button'
import { LogOut, User as UserIcon } from 'lucide-react'
import { XIcon } from '@/components/icons'

export function AuthButton({
  className,
  size = 'default',
}: {
  className?: string
  size?: 'default' | 'sm' | 'lg'
}) {
  const { ready, authenticated, user, login, logout } = usePrivy()

  useEffect(() => {
    console.log('[AUTH_LOG] Privy State:', { ready, authenticated, userId: user?.id, user })

    if (authenticated && user) {
      console.log('[AUTH_LOG] Syncing authenticated user with API /api/user...')
      fetch('/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          privyId: user.id,
          username: user.twitter?.username || user.email?.address || 'Collector',
          avatar: user.twitter?.profilePictureUrl || '/images/avatar-1.png',
        }),
      })
        .then((res) => res.json())
        .then((data) => console.log('[AUTH_LOG] API Sync Success:', data))
        .catch((err) => console.error('[AUTH_LOG] API Sync Error:', err))
    }
  }, [ready, authenticated, user])

  // Helper to determine display name from Privy profile
  const getDisplayName = () => {
    if (!user) return 'Collector'
    if (user.twitter?.username) return `@${user.twitter.username}`
    if (user.email?.address) return user.email.address.split('@')[0]
    if (user.wallet?.address)
      return `${user.wallet.address.slice(0, 4)}...${user.wallet.address.slice(-4)}`
    return 'Collector'
  }

  if (!ready) {
    return (
      <Button disabled size={size} className={className}>
        Loading...
      </Button>
    )
  }

  if (authenticated && user) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#1f232d] px-3 py-1.5 text-xs font-bold text-white">
          {user.twitter ? (
            <XIcon className="size-3.5 text-[#3c8aff]" />
          ) : (
            <UserIcon className="size-3.5 text-[#3c8aff]" />
          )}
          <span className="max-w-[120px] truncate">{getDisplayName()}</span>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={logout}
          title="Log out"
          className="size-8 border-white/10 bg-[#1f232d] p-0 text-[#b1b7c3] hover:bg-red-500/20 hover:text-red-400"
        >
          <LogOut className="size-3.5" />
        </Button>
      </div>
    )
  }

  return (
    <Button
      size={size}
      onClick={login}
      className={
        className ||
        'bg-[#3c8aff] font-bold uppercase text-white hover:bg-[#0000ff] shadow-lg shadow-[#3c8aff]/25 border-none'
      }
    >
      Connect / Join
    </Button>
  )
}

