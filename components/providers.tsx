'use client'

import { useEffect, useState } from 'react'
import { PrivyProvider } from '@privy-io/react-auth'

export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID

  useEffect(() => {
    setMounted(true)
  }, [])

  // If not mounted or no Privy App ID configured, render children directly
  if (!mounted || !appId || appId === 'demo-app-id') {
    return <>{children}</>
  }

  return (
    <PrivyProvider
      appId={appId}
      config={{
        loginMethods: ['email', 'wallet'],
        appearance: {
          theme: 'dark',
          accentColor: '#3c8aff',
          logo: '/images/logo.jpg',
        },
      }}
      onSuccess={(user, isNewUser) => {
        console.log('[PRIVY_LOG] Login success:', { user, isNewUser })
      }}
    >
      {children}
    </PrivyProvider>
  )
}
