import type { Metadata } from 'next'

export const siteUrl = 'https://www.capsulepull.xyz'

const image = {
  url: '/images/hero.jfif',
  alt: 'Capsule',
}

export function pageMeta({
  path,
  title,
  description,
  index = true,
}: {
  path: string
  title: string
  description: string
  index?: boolean
}): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    robots: index ? { index: true, follow: true } : { index: false, follow: true },
    openGraph: {
      title,
      description,
      url: path,
      siteName: 'Capsule',
      type: 'website',
      images: [image],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image.url],
    },
  }
}
