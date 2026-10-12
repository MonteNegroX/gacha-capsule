import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/lab', '/api'],
    },
    sitemap: 'https://www.capsulepull.xyz/sitemap.xml',
  }
}
