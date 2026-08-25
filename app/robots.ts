import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: 'https://blackoutz-storefront.dylan-sciortino.chatgpt.site/sitemap.xml',
  };
}
