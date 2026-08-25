import 'server-only';
import { products, type Product } from '../../products';
import { checkoutIdentifiers, type CheckoutIdentifier } from '../../checkout-identifiers';
import { apiProductId, loadTip4ServCatalog, TIP4SERV_API_BASE } from '../tip4serv-catalog';

export { TIP4SERV_API_BASE } from '../tip4serv-catalog';
const CACHE_MS = 5 * 60 * 1000;

export { checkoutIdentifiers, type CheckoutIdentifier } from '../../checkout-identifiers';

export class InvalidStorefrontProductError extends Error {
  constructor(message = 'Unable to find this product.') {
    super(message);
    this.name = 'InvalidStorefrontProductError';
  }
}

const checkoutIdentifierSet = new Set<string>(checkoutIdentifiers);

const productIdEnvironment: Record<string, string | undefined> = {
  'building-shed': process.env.TIP4SERV_PRODUCT_BUILDING_SHED,
  'weapon-workbench': process.env.TIP4SERV_PRODUCT_WEAPON_WORKBENCH,
  'priority-queue': process.env.TIP4SERV_PRODUCT_PRIORITY_QUEUE,
  'zone-alert': process.env.TIP4SERV_PRODUCT_ZONE_ALERT,
  'back-hatch': process.env.TIP4SERV_PRODUCT_BACK_HATCH,
  'prebuilt-base': process.env.TIP4SERV_PRODUCT_PREBUILT_BASE,
  'custom-base': process.env.TIP4SERV_PRODUCT_CUSTOM_BASE,
  'credits-75k': process.env.TIP4SERV_PRODUCT_CREDITS_75K,
  'credits-180k': process.env.TIP4SERV_PRODUCT_CREDITS_180K,
  'credits-300k': process.env.TIP4SERV_PRODUCT_CREDITS_300K,
  donation: process.env.TIP4SERV_PRODUCT_DONATION,
};

let catalogCache: { storeId: string; productIds: Record<string, string>; expiresAt: number } | null = null;
const identifierCache = new Map<string, { identifiers: CheckoutIdentifier[]; expiresAt: number }>();

function numericSetting(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed && /^\d+$/.test(trimmed) ? trimmed : undefined;
}

function normalizeProductName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

export function fallbackIdentifiers(product: Product): CheckoutIdentifier[] {
  return product.customAmount ? ['email'] : ['email', 'ingame_username'];
}

export async function resolveTip4ServProduct(apiKey: string, productId: string) {
  const configuredStoreId = numericSetting(process.env.TIP4SERV_STORE_ID);
  const configuredProductIds = Object.fromEntries(
    Object.entries(productIdEnvironment)
      .map(([id, value]) => [id, numericSetting(value)] as const)
      .filter((entry): entry is [string, string] => Boolean(entry[1])),
  );

  const cached = catalogCache && catalogCache.expiresAt > Date.now() ? catalogCache : null;
  let storeId = configuredStoreId || cached?.storeId;
  const resolvedProductIds = { ...(cached?.productIds || {}), ...configuredProductIds };
  const headers = { accept: 'application/json', authorization: `Bearer ${apiKey}` };

  if (!storeId) {
    const response = await fetch(`${TIP4SERV_API_BASE}/store/whoami`, {
      headers,
      signal: AbortSignal.timeout(6_000),
      cache: 'no-store',
    });
    const body = await response.json().catch(() => null) as { id?: unknown; store_id?: unknown; store?: { id?: unknown } } | null;
    const rawStoreId = body?.id ?? body?.store_id ?? body?.store?.id;
    const discoveredStoreId = typeof rawStoreId === 'number' || typeof rawStoreId === 'string' ? String(rawStoreId) : undefined;
    storeId = numericSetting(discoveredStoreId);
    if (!response.ok || !storeId) throw new Error('Unable to identify the Tip4Serv store.');
  }

  if (!resolvedProductIds[productId]) {
    const response = await fetch(`${TIP4SERV_API_BASE}/store/products?max_page=50`, {
      headers,
      signal: AbortSignal.timeout(6_000),
      cache: 'no-store',
    });
    const body = await response.json().catch(() => null) as unknown;
    const catalog = Array.isArray(body)
      ? body
      : body && typeof body === 'object' && Array.isArray((body as { products?: unknown }).products)
        ? (body as { products: unknown[] }).products
        : body && typeof body === 'object' && Array.isArray((body as { data?: unknown }).data)
          ? (body as { data: unknown[] }).data
          : body && typeof body === 'object' && (body as { data?: unknown }).data && typeof (body as { data?: unknown }).data === 'object' && Array.isArray(((body as { data: { products?: unknown } }).data).products)
            ? (body as { data: { products: unknown[] } }).data.products
          : null;
    if (!response.ok || !catalog) throw new Error('Unable to read the Tip4Serv catalogue.');

    for (const localProduct of products) {
      const localName = normalizeProductName(localProduct.name);
      const match = catalog.find((candidate) => {
        if (!candidate || typeof candidate !== 'object') return false;
        const item = candidate as { name?: unknown; title?: unknown };
        const name = typeof item.name === 'string' ? item.name : typeof item.title === 'string' ? item.title : '';
        return normalizeProductName(name) === localName;
      }) as { id?: unknown; product_id?: unknown } | undefined;
      const rawProductId = match?.id ?? match?.product_id;
      const discoveredId = typeof rawProductId === 'number' || typeof rawProductId === 'string' ? numericSetting(String(rawProductId)) : undefined;
      if (discoveredId) resolvedProductIds[localProduct.id] = discoveredId;
    }
  }

  const tip4servProductId = resolvedProductIds[productId];
  if (!tip4servProductId) throw new Error('Unable to match this product with the Tip4Serv catalogue.');

  catalogCache = { storeId, productIds: resolvedProductIds, expiresAt: Date.now() + CACHE_MS };
  return { storeId, tip4servProductId };
}

export async function resolveStorefrontProduct(apiKey: string, productId: string) {
  const directProductId = apiProductId(productId);
  if (directProductId !== undefined) {
    const catalog = await loadTip4ServCatalog(apiKey);
    const product = catalog.products.find((candidate) => candidate.tip4servProductId === directProductId);
    if (!product) throw new InvalidStorefrontProductError('Unable to find this product in the live Tip4Serv catalogue.');
    return {
      product,
      storeId: String(catalog.store.id),
      tip4servProductId: String(directProductId),
    };
  }

  const product = products.find((candidate) => candidate.id === productId);
  if (!product) throw new InvalidStorefrontProductError();
  const resolved = await resolveTip4ServProduct(apiKey, productId);
  return { product, ...resolved };
}

export async function requiredCheckoutIdentifiers(storeId: string, tip4servProductId: string, product: Product) {
  const cacheKey = `${storeId}:${tip4servProductId}`;
  const cached = identifierCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return { identifiers: cached.identifiers, source: 'tip4serv' as const };

  try {
    const productIds = encodeURIComponent(JSON.stringify([Number(tip4servProductId)]));
    const response = await fetch(`${TIP4SERV_API_BASE}/store/checkout/identifiers?store=${encodeURIComponent(storeId)}&products=${productIds}`, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(6_000),
      cache: 'no-store',
    });
    const body = await response.json().catch(() => null) as unknown;
    const rawIdentifiers = Array.isArray(body)
      ? body
      : body && typeof body === 'object' && Array.isArray((body as { identifiers?: unknown }).identifiers)
        ? (body as { identifiers: unknown[] }).identifiers
        : null;
    if (!response.ok || !rawIdentifiers) throw new Error('Unable to read checkout requirements.');

    const identifiers = Array.from(new Set([
      'email',
      ...rawIdentifiers.filter((value): value is CheckoutIdentifier => typeof value === 'string' && checkoutIdentifierSet.has(value)),
    ])) as CheckoutIdentifier[];
    const resolved = identifiers.length > 1 || product.customAmount ? identifiers : fallbackIdentifiers(product);
    identifierCache.set(cacheKey, { identifiers: resolved, expiresAt: Date.now() + CACHE_MS });
    return { identifiers: resolved, source: 'tip4serv' as const };
  } catch {
    return { identifiers: fallbackIdentifiers(product), source: 'fallback' as const };
  }
}
