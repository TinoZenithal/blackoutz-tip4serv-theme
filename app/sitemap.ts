import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://blackoutz-storefront.dylan-sciortino.chatgpt.site';
  return [
    { url: baseUrl, lastModified: new Date('2026-08-23'), changeFrequency: 'weekly', priority: 1 },
    { url: `${baseUrl}/policies`, lastModified: new Date('2026-08-23'), changeFrequency: 'monthly', priority: 0.4 },
  ];
}
