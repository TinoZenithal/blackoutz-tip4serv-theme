import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'BLACKOUTZ Storefront',
    short_name: 'BLACKOUTZ',
    description: 'Premium access, custom loadouts and tactical supplies for the BLACKOUTZ DayZ network.',
    start_url: '/',
    display: 'standalone',
    background_color: '#050505',
    theme_color: '#050505',
    icons: [{ src: '/favicon-blackoutz-v2.png', sizes: '128x128', type: 'image/png' }],
  };
}
