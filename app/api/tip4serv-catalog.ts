import 'server-only';
import { products as brandedProducts, type Product, type StoreCurrency } from '../products';

export const TIP4SERV_API_BASE = process.env.TIP4SERV_API_BASE || 'https://api.tip4serv.com/v1';
const CATALOG_CACHE_MS = 5 * 60 * 1000;

type UnknownRecord = Record<string, unknown>;

export type Tip4ServStore = {
  id: number;
  title: string;
  description: string;
  domain: string;
  currency: StoreCurrency;
  logo?: string;
  color?: string;
};

export type Tip4ServCategory = {
  id: number;
  name: string;
  slug: string;
};

export type Tip4ServCatalog = {
  store: Tip4ServStore;
  categories: Tip4ServCategory[];
  products: Product[];
};

let catalogCache: { value: Tip4ServCatalog; expiresAt: number } | null = null;

function asRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as UnknownRecord : null;
}

function asNumber(value: unknown): number | undefined {
  const parsed = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : NaN;
  return Number.isFinite(parsed) ? parsed : undefined;
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function normalizeName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function normalizeCurrency(value: unknown): StoreCurrency {
  const supported: StoreCurrency[] = ['USD', 'AUD', 'GBP', 'EUR', 'CAD', 'CHF'];
  const currency = asString(value)?.toUpperCase() as StoreCurrency | undefined;
  return currency && supported.includes(currency) ? currency : 'USD';
}

function stripHtml(value: unknown) {
  const source = asString(value) || '';
  const text = source
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/p>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > 280 ? `${text.slice(0, 277).trimEnd()}…` : text;
}

function tip4servImage(value: unknown) {
  const source = asString(value);
  if (!source) return undefined;
  try {
    const url = new URL(source);
    return url.protocol === 'https:' && url.hostname === 'cdn.tip4serv.com' ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

function responseArray(value: unknown, key: 'products' | 'categories') {
  if (Array.isArray(value)) return value;
  const body = asRecord(value);
  if (!body) return [];
  if (Array.isArray(body[key])) return body[key] as unknown[];
  if (Array.isArray(body.data)) return body.data as unknown[];
  const data = asRecord(body.data);
  return data && Array.isArray(data[key]) ? data[key] as unknown[] : [];
}

function categoryFromProduct(raw: UnknownRecord, categories: Tip4ServCategory[]) {
  const category = asRecord(raw.category);
  const id = asNumber(category?.id ?? raw.category);
  const known = id === undefined ? undefined : categories.find((candidate) => candidate.id === id);
  return {
    id,
    name: asString(category?.name) || known?.name,
  };
}

function deriveGroup(name: string, categoryName: string | undefined, subscription: boolean, donation: boolean): Product['group'] {
  const searchable = `${name} ${categoryName || ''}`.toLowerCase();
  if (donation || /donat|support/.test(searchable)) return 'support';
  if (subscription) return 'subscription';
  if (/currency|credit|money|cash/.test(searchable)) return 'credits';
  if (/base|shed|hatch|build/.test(searchable)) return 'base';
  return 'support';
}

function mapProduct(rawValue: unknown, index: number, categories: Tip4ServCategory[], currency: StoreCurrency): Product | null {
  const raw = asRecord(rawValue);
  if (!raw || raw.status === false) return null;
  const id = asNumber(raw.id ?? raw.product_id);
  const name = asString(raw.name ?? raw.title);
  const price = asNumber(raw.price);
  if (id === undefined || !name || price === undefined || price < 0) return null;

  const slug = asString(raw.slug) || '';
  const normalizedName = normalizeName(name);
  const local = brandedProducts.find((candidate) => normalizeName(candidate.name) === normalizedName || normalizeName(candidate.id) === normalizeName(slug));
  const category = categoryFromProduct(raw, categories);
  const subscription = Boolean(raw.subscription);
  const donation = Boolean(raw.donation) || local?.customAmount === true;
  const group = deriveGroup(name, category.name, subscription, donation);
  const apiDescription = stripHtml(raw.small_description ?? raw.description);
  const image = local?.image || tip4servImage(raw.image) || '/products/donation.webp';
  const stock = asNumber(raw.stock);

  return {
    id: `api-${id}`,
    tip4servProductId: id,
    number: String(index + 1).padStart(2, '0'),
    tag: (category.name || local?.tag || (subscription ? 'SUBSCRIPTION' : 'TIP4SERV PRODUCT')).toUpperCase(),
    name,
    description: local?.description || apiDescription || 'Digital BLACKOUTZ reward fulfilled through Tip4Serv.',
    price: price.toFixed(2),
    priceCurrency: currency,
    image,
    imageAlt: local?.imageAlt || `${name} product artwork supplied by Tip4Serv`,
    perk: local?.perk || (donation ? 'SUPPORT THE SERVER' : subscription ? 'MONTHLY ACCESS' : group === 'credits' ? 'BOOST YOUR RUN' : 'DEPLOY READY'),
    billing: subscription ? 'monthly' : 'once',
    group,
    customAmount: donation || undefined,
    categoryId: category.id,
    categoryName: category.name,
    stock,
  };
}

async function apiJson(path: string, apiKey: string) {
  const response = await fetch(`${TIP4SERV_API_BASE}${path}`, {
    headers: { accept: 'application/json', authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(10_000),
    cache: 'no-store',
  });
  const body = await response.json().catch(() => null) as unknown;
  if (!response.ok || body === null) throw new Error(`Tip4Serv request failed with status ${response.status}.`);
  return body;
}

export async function loadTip4ServCatalog(apiKey: string): Promise<Tip4ServCatalog> {
  if (catalogCache && catalogCache.expiresAt > Date.now()) return catalogCache.value;

  const [storeBody, productsBody, categoriesResult] = await Promise.all([
    apiJson('/store/whoami', apiKey),
    apiJson('/store/products?page=1&max_page=50&details=true&only_enabled=true', apiKey),
    apiJson('/store/categories?page=1&max_page=50', apiKey).catch(() => null),
  ]);

  const rawStore = asRecord(storeBody);
  const storeId = asNumber(rawStore?.id ?? rawStore?.store_id);
  if (!rawStore || storeId === undefined) throw new Error('Tip4Serv did not return a valid store.');

  const categories = responseArray(categoriesResult, 'categories').flatMap((value) => {
    const category = asRecord(value);
    const id = asNumber(category?.id);
    const name = asString(category?.name);
    if (id === undefined || !name || category?.hide === true) return [];
    return [{ id, name, slug: asString(category?.slug) || String(id) }];
  });
  const currency = normalizeCurrency(rawStore.currency);
  const mappedProducts = responseArray(productsBody, 'products')
    .map((value, index) => mapProduct(value, index, categories, currency))
    .filter((product): product is Product => product !== null);
  if (!mappedProducts.length) throw new Error('Tip4Serv did not return any enabled products.');

  const derivedCategories = new Map(categories.map((category) => [category.id, category]));
  for (const product of mappedProducts) {
    if (product.categoryId === undefined || !product.categoryName || derivedCategories.has(product.categoryId)) continue;
    derivedCategories.set(product.categoryId, { id: product.categoryId, name: product.categoryName, slug: String(product.categoryId) });
  }

  const value: Tip4ServCatalog = {
    store: {
      id: storeId,
      title: asString(rawStore.title) || 'BLACKOUTZ STORE',
      description: stripHtml(rawStore.description),
      domain: asString(rawStore.domain) || '',
      currency,
      logo: tip4servImage(rawStore.logo),
      color: asString(rawStore.color),
    },
    categories: Array.from(derivedCategories.values()),
    products: mappedProducts,
  };

  catalogCache = { value, expiresAt: Date.now() + CATALOG_CACHE_MS };
  return value;
}

export function apiProductId(productId: string) {
  const match = /^api-(\d+)$/.exec(productId);
  return match ? Number(match[1]) : undefined;
}

