import 'server-only';
import type { NextRequest } from 'next/server';

export function checkoutSiteOrigin(request: NextRequest) {
  const requested = new URL(request.nextUrl.origin);
  const isLocal = requested.hostname === 'localhost' || requested.hostname === '127.0.0.1';
  if (isLocal) return requested.origin;

  const configured = new URL(process.env.SITE_URL || request.nextUrl.origin);
  if (configured.protocol !== 'https:') throw new Error('The public storefront must use HTTPS.');
  return configured.origin;
}

