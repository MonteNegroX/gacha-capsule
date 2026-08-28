import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Space_Grotesk, Inter } from 'next/font/google'
import { Providers } from '@/components/providers'
import './globals.css'

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  weight: ['500', '600', '700'],
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'Capsule — Collect. Open. Compete.',
  description:
    'Join the Gacha Capsules waitlist, complete missions, earn points, and climb the leaderboard for Pokémon-style collectible card drops.',
  generator: 'v0.app',
  other: {
    'virtual-protocol-site-verification': 'd81bb2e81f510c38dacb3ea2b51098b3',
  },
  icons: {
    icon: '/images/logo.jpg',
    shortcut: '/images/logo.jpg',
    apple: '/images/logo.jpg',
  },
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#0a0c14',
  userScalable: true,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`dark bg-background ${spaceGrotesk.variable} ${inter.variable}`}>
      <head>
        <meta name="virtual-protocol-site-verification" content="d81bb2e81f510c38dacb3ea2b51098b3" />
      </head>
      <body className="antialiased font-sans">
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  )
}
