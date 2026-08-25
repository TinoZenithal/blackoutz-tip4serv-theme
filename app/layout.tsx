import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import Script from 'next/script';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: { default: 'BLACKOUTZ | DayZ Network Store', template: '%s | BLACKOUTZ' },
  description: 'Gear, access and tactical advantages for the BLACKOUTZ DayZ community.',
  applicationName: 'BLACKOUTZ Storefront',
  category: 'gaming',
  keywords: ['BLACKOUTZ', 'DayZ community', 'DayZ server store', 'survival gaming'],
  alternates: { canonical: '/' },
  icons: { icon: '/favicon-blackoutz-v2.png', apple: '/favicon-blackoutz-v2.png' },
  metadataBase: new URL('https://blackoutz-storefront.dylan-sciortino.chatgpt.site'),
  openGraph: {
    type: 'website',
    siteName: 'BLACKOUTZ',
    locale: 'en_US',
    title: 'BLACKOUTZ | Survive the Blackout',
    description: 'Premium access, custom loadouts and tactical supplies for the BLACKOUTZ DayZ network.',
    images: [{ url: '/og.webp', width: 1200, height: 630, alt: 'BLACKOUTZ — Survive the Blackout' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BLACKOUTZ | Survive the Blackout',
    description: 'Premium access, custom loadouts and tactical supplies for the BLACKOUTZ DayZ network.',
    images: ['/og.webp'],
  },
};

export const viewport: Viewport = {
  themeColor: '#050505',
  colorScheme: 'dark',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head><link rel="preload" as="image" href="/hero-command.webp" type="image/webp" /></head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Script src="https://js.tip4serv.com/tip4serv.min.js?v=1.0.16" data-store-id="21207" strategy="afterInteractive" />
      </body>
    </html>
  );
}

