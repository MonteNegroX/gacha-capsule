import type { MetadataRoute } from 'next'

import { siteUrl } from '@/lib/site-meta'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: siteUrl, changeFrequency: 'daily', priority: 1 },
    { url: `${siteUrl}/lend`, changeFrequency: 'daily', priority: 0.8 },
    { url: `${siteUrl}/statistics`, changeFrequency: 'daily', priority: 0.6 },
    { url: `${siteUrl}/terms`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${siteUrl}/privacy`, changeFrequency: 'yearly', priority: 0.3 },
  ]
}
