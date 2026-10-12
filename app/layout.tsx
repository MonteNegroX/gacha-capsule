import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { Providers } from '@/components/providers'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

const homeTitle = 'Collect. Open. Compete. | Capsule'
const homeDescription =
  'Open the $25 pack in USDG on Robinhood or USDC on Hyperliquid. Take the buyback, or Double a Common within 24 hours. The card stays in the vault.'

export const metadata: Metadata = {
  metadataBase: new URL('https://www.capsulepull.xyz'),
  title: homeTitle,
  description: homeDescription,
  alternates: { canonical: '/' },
  openGraph: {
    title: homeTitle,
    description: homeDescription,
    url: '/',
    siteName: 'Capsule',
    type: 'website',
    images: [{ url: '/images/hero.jfif', alt: 'Capsule' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: homeTitle,
    description: homeDescription,
    images: ['/images/hero.jfif'],
  },
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
  themeColor: '#0a0a0a',
  userScalable: true,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`dark bg-background ${inter.variable}`}>
      <head>
        <meta name="virtual-protocol-site-verification" content="d81bb2e81f510c38dacb3ea2b51098b3" />
      </head>
      <body className="antialiased font-sans">
        <a href="#main" className="skip-link">Skip to Content</a>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@graph': [
                {
                  '@type': 'Organization',
                  name: 'Capsule',
                  url: 'https://www.capsulepull.xyz',
                  logo: 'https://www.capsulepull.xyz/images/logo.jpg',
                  sameAs: ['https://x.com/capsulepull'],
                },
                {
                  '@type': 'WebSite',
                  name: 'Capsule',
                  url: 'https://www.capsulepull.xyz',
                  description: homeDescription,
                },
              ],
            }),
          }}
        />
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  )
}
