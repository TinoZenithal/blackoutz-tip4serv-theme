import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import type { Product, StoreCurrency } from '../../products';
import { DISCORD_SESSION_COOKIE, readDiscordSession } from '../oauth/discord/session-token';
import { checkoutSiteOrigin } from '../oauth/discord/site-origin';
import { InvalidStorefrontProductError, requiredCheckoutIdentifiers, resolveStorefrontProduct, TIP4SERV_API_BASE, type CheckoutIdentifier } from './tip4serv';

const requestBuckets = new Map<string, { count: number; resetAt: number }>();
const supportedCurrencies = new Set<StoreCurrency>(['USD', 'AUD', 'GBP', 'EUR', 'CAD', 'CHF']);

type CheckoutRequest = {
  productId?: unknown;
  email?: unknown;
  ingameUsername?: unknown;
  amount?: unknown;
  currency?: unknown;
};

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
  try {
    return new URL(source).origin === checkoutSiteOrigin(request);
  } catch {
    return false;
  }
}

function cleanText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

export async function POST(request: NextRequest) {
  if (!requestOriginAllowed(request)) return NextResponse.json({ error: 'This checkout request did not come from BLACKOUTZ.' }, { status: 403 });
  if (checkoutRateLimited(request)) return NextResponse.json({ error: 'Too many checkout attempts. Please wait one minute and try again.' }, { status: 429, headers: { 'retry-after': '60' } });
  const contentLength = Number(request.headers.get('content-length') || '0');
  if (Number.isFinite(contentLength) && contentLength > 16 * 1024) return NextResponse.json({ error: 'Checkout request is too large.' }, { status: 413 });
  if (!request.headers.get('content-type')?.startsWith('application/json')) return NextResponse.json({ error: 'Unsupported checkout request.' }, { status: 415 });

  let input: CheckoutRequest;
  try {
    input = await request.json() as CheckoutRequest;
  } catch {
    return NextResponse.json({ error: 'Malformed checkout request.' }, { status: 400 });
  }

  const discord = await readDiscordSession(request.cookies.get(DISCORD_SESSION_COOKIE)?.value);
  if (!discord) return NextResponse.json({ error: 'Please link Discord again before continuing.' }, { status: 401 });

  const productId = cleanText(input.productId);
  const email = cleanText(input.email).toLowerCase();
  const ingameUsername = cleanText(input.ingameUsername);
  const currency = cleanText(input.currency).toUpperCase() as StoreCurrency;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return NextResponse.json({ error: 'Please provide a valid email address.' }, { status: 400 });
  }
  if (ingameUsername.length < 2 || ingameUsername.length > 80) {
    return NextResponse.json({ error: 'Please provide a valid in-game username.' }, { status: 400 });
  }
  if (!supportedCurrencies.has(currency)) return NextResponse.json({ error: 'Please select a supported payment currency.' }, { status: 400 });

  const apiKey = process.env.TIP4SERV_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'Checkout is awaiting the private Tip4Serv connection.' }, { status: 503 });

  let product: Product;
  let storeId: string;
  let tip4servProductId: string;
  try {
    ({ product, storeId, tip4servProductId } = await resolveStorefrontProduct(apiKey, productId));
  } catch (error) {
    if (error instanceof InvalidStorefrontProductError) return NextResponse.json({ error: 'Please select a valid product.' }, { status: 400 });
    return NextResponse.json({ error: 'Tip4Serv could not identify this product. Please try again shortly.' }, { status: 502 });
  }

  const donationAmount = Number(input.amount);
  if (product.customAmount && (!Number.isFinite(donationAmount) || donationAmount < 1 || donationAmount > 5000)) {
    return NextResponse.json({ error: 'Donation amount must be between US$1.00 and US$5,000.00.' }, { status: 400 });
  }

  const { identifiers } = await requiredCheckoutIdentifiers(storeId, tip4servProductId, product);
  const availableIdentifiers: Partial<Record<CheckoutIdentifier, string>> = {
    email,
    discord_id: discord.id,
    ingame_username: ingameUsername,
  };
  const unsupportedIdentifier = identifiers.find((identifier) => !availableIdentifiers[identifier]);
  if (unsupportedIdentifier) {
    return NextResponse.json({ error: 'This product requires an additional player field that BLACKOUTZ has not enabled yet.' }, { status: 409 });
  }
  const user = Object.fromEntries(identifiers.map((identifier) => [identifier, availableIdentifiers[identifier] as string]));

  let origin: string;
  try {
    origin = checkoutSiteOrigin(request);
  } catch {
    return NextResponse.json({ error: 'The storefront URL is not configured safely.' }, { status: 503 });
  }
  const redirectUrl = (status: 'success' | 'canceled' | 'pending') => {
    const url = new URL('/', origin);
    url.searchParams.set('checkout', status);
    url.hash = 'store';
    return url.toString();
  };

  let response: Response;
  try {
    const endpoint = new URL(`${TIP4SERV_API_BASE}/store/checkout`);
    endpoint.searchParams.set('store', storeId);
    endpoint.searchParams.set('currency', currency);
    endpoint.searchParams.set('redirect', 'true');
    response = await fetch(endpoint, {
      method: 'POST',
      headers: { accept: 'application/json', 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        products: [{
          product_id: Number(tip4servProductId),
          type: product.billing === 'monthly' ? 'subscribe' : 'addtocart',
          quantity: 1,
          ...(product.customAmount ? { donation_amount: Number(donationAmount.toFixed(2)) } : {}),
        }],
        user,
        currency,
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

  const result = await response.json().catch(() => null) as { url?: unknown; error?: unknown } | null;
  if (!response.ok || !result || typeof result.url !== 'string') {
    return NextResponse.json({ error: 'Tip4Serv could not prepare the secure payment. Please check your details and try again.' }, { status: response.status >= 400 && response.status < 500 ? response.status : 502 });
  }

  try {
    const checkoutUrl = new URL(result.url);
    if (checkoutUrl.protocol !== 'https:' || (checkoutUrl.hostname !== 'tip4serv.com' && !checkoutUrl.hostname.endsWith('.tip4serv.com'))) throw new Error('Unexpected checkout host');
    return NextResponse.json({ checkoutUrl: checkoutUrl.toString() });
  } catch {
    return NextResponse.json({ error: 'Tip4Serv returned an invalid checkout link.' }, { status: 502 });
  }
}

