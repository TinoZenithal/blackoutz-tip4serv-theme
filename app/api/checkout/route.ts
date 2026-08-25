import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import type { Product } from '../../products';
import { identifierLabel } from '../../checkout-identifiers';
import { checkoutIdentifiers, InvalidStorefrontProductError, requiredCheckoutIdentifiers, resolveStorefrontProduct, TIP4SERV_API_BASE, type CheckoutIdentifier } from './tip4serv';

const checkoutIdentifierSet = new Set<string>(checkoutIdentifiers);
const requestBuckets = new Map<string, { count: number; resetAt: number }>();

function checkoutRateLimited(request: NextRequest) {
  const address = request.headers.get('cf-connecting-ip') || 'local';
  const now = Date.now();
  if (requestBuckets.size >= 1_000) {
    for (const [key, bucket] of requestBuckets) if (bucket.resetAt <= now) requestBuckets.delete(key);
  }
  const current = requestBuckets.get(address);
  if (!current || current.resetAt <= now) {
    if (requestBuckets.size >= 2_000) return true;
    requestBuckets.set(address, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  current.count += 1;
  return current.count > 8;
}

function requestOriginAllowed(request: NextRequest) {
  const source = request.headers.get('origin') || request.headers.get('referer');
  if (!source) return false;
  const allowedOrigins = new Set([request.nextUrl.origin]);
  try {
    if (process.env.SITE_URL) allowedOrigins.add(new URL(process.env.SITE_URL).origin);
  } catch {
    // SITE_URL is validated before a checkout is created.
  }
  try {
    return allowedOrigins.has(new URL(source).origin);
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  if (!requestOriginAllowed(request)) return NextResponse.json({ error: 'This checkout request did not come from BLACKOUTZ.' }, { status: 403 });
  if (checkoutRateLimited(request)) return NextResponse.json({ error: 'Too many checkout attempts. Please wait one minute and try again.' }, { status: 429, headers: { 'retry-after': '60' } });
  const contentLength = Number(request.headers.get('content-length') || '0');
  if (Number.isFinite(contentLength) && contentLength > 64 * 1024) return NextResponse.json({ error: 'Checkout request is too large.' }, { status: 413 });

  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.startsWith('multipart/form-data') && !contentType.startsWith('application/x-www-form-urlencoded')) {
    return NextResponse.json({ error: 'Unsupported checkout request.' }, { status: 415 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Malformed checkout request.' }, { status: 400 });
  }

  const productId = String(form.get('productId') ?? '');
  const apiKey = process.env.TIP4SERV_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'Checkout is awaiting the private Tip4Serv connection.' }, { status: 503 });

  let product: Product;
  let storeId: string;
  let tip4servProductId: string;
  try {
    ({ product, storeId, tip4servProductId } = await resolveStorefrontProduct(apiKey, productId));
  } catch (error) {
    if (error instanceof InvalidStorefrontProductError) {
      return NextResponse.json({ error: 'Please select a valid product.' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Tip4Serv could not identify this product. Please try again shortly.' }, { status: 502 });
  }

  const donationAmount = Number(String(form.get('amount') ?? ''));
  if (product.customAmount && (!Number.isFinite(donationAmount) || donationAmount < 1 || donationAmount > 5000)) {
    return NextResponse.json({ error: 'Donation amount must be between US$1.00 and US$5,000.00.' }, { status: 400 });
  }

  const { identifiers: requiredIdentifiers } = await requiredCheckoutIdentifiers(storeId, tip4servProductId, product);
  const missingIdentifiers = requiredIdentifiers.filter((identifier) => !String(form.get(`identifier:${identifier}`) ?? '').trim());
  if (missingIdentifiers.length) {
    return NextResponse.json({
      error: 'Tip4Serv requires additional player information for this product. Complete the updated fields and continue.',
      identifiers: requiredIdentifiers,
    }, { status: 409 });
  }
  const user: Partial<Record<CheckoutIdentifier, string>> = {};
  for (const identifier of requiredIdentifiers) {
    if (!checkoutIdentifierSet.has(identifier)) continue;
    const rawValue = String(form.get(`identifier:${identifier}`) ?? '').trim();
    const value = identifier === 'email' ? rawValue.toLowerCase() : rawValue;
    if (identifier === 'email') {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) || value.length > 254) {
        return NextResponse.json({ error: 'Please provide a valid email address.' }, { status: 400 });
      }
    } else if (value.length < 2 || value.length > 160) {
      return NextResponse.json({ error: `Please provide a valid ${identifierLabel(identifier).toLowerCase()}.` }, { status: 400 });
    }
    user[identifier] = value;
  }

  let siteUrl: URL;
  try {
    siteUrl = new URL(process.env.SITE_URL || request.nextUrl.origin);
    const isLocal = siteUrl.hostname === 'localhost' || siteUrl.hostname === '127.0.0.1';
    if (siteUrl.protocol !== 'https:' && !(isLocal && siteUrl.protocol === 'http:')) throw new Error('HTTPS required');
  } catch {
    return NextResponse.json({ error: 'The storefront URL is not configured safely.' }, { status: 503 });
  }

  const redirectUrl = (status: 'success' | 'canceled' | 'pending') => {
    const url = new URL('/', siteUrl);
    url.searchParams.set('checkout', status);
    url.hash = 'store';
    return url.toString();
  };

  let response: Response;
  try {
    response = await fetch(`${TIP4SERV_API_BASE}/store/checkout?store=${encodeURIComponent(storeId)}&redirect=true`, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        products: [{
          product_id: Number(tip4servProductId),
          type: product.billing === 'monthly' ? 'subscribe' : 'addtocart',
          quantity: 1,
          ...(product.customAmount ? { donation_amount: Number(donationAmount.toFixed(2)) } : {}),
        }],
        user,
        redirect_success_checkout: redirectUrl('success'),
        redirect_canceled_checkout: redirectUrl('canceled'),
        redirect_pending_checkout: redirectUrl('pending'),
      }),
      signal: AbortSignal.timeout(12_000),
      cache: 'no-store',
    });
  } catch {
    return NextResponse.json({ error: 'Tip4Serv is temporarily unreachable. Please try again shortly.' }, { status: 502 });
  }

  const result = await response.json().catch(() => null) as { url?: unknown } | null;
  if (!response.ok || !result || typeof result.url !== 'string') {
    return NextResponse.json({ error: 'Tip4Serv could not start this checkout. Please verify your details or contact BLACKOUTZ support.' }, { status: response.status >= 400 && response.status < 500 ? response.status : 502 });
  }

  try {
    const checkoutUrl = new URL(result.url);
    if (checkoutUrl.protocol !== 'https:' || (checkoutUrl.hostname !== 'tip4serv.com' && !checkoutUrl.hostname.endsWith('.tip4serv.com'))) {
      throw new Error('Unexpected checkout host');
    }
    return NextResponse.json({ checkoutUrl: checkoutUrl.toString() });
  } catch {
    return NextResponse.json({ error: 'Tip4Serv returned an invalid checkout link.' }, { status: 502 });
  }
}
