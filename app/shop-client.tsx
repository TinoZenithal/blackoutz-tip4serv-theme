'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import type { Product, StoreCurrency } from './products';

type Tip4ServCheckoutFailure = { message?: string };

declare global {
  interface Window {
    Tip4Serv?: {
      Checkout?: {
        open: (options: {
          storeId: number;
          product: string;
          onFail?: (failure: Tip4ServCheckoutFailure) => void;
        }) => Promise<unknown> | unknown;
      };
    };
  }
}

const currencies = ['USD', 'AUD', 'GBP', 'EUR', 'CAD', 'NZD', 'JPY', 'SGD'] as const satisfies readonly StoreCurrency[];
type Currency = StoreCurrency;

const currencySymbols: Record<Currency, string> = {
  AUD: 'A$', USD: 'US$', GBP: '£', EUR: '€', CAD: 'C$', NZD: 'NZ$', JPY: '¥', SGD: 'S$',
};

const euroRegions = new Set(['AT', 'BE', 'CY', 'DE', 'EE', 'ES', 'FI', 'FR', 'GR', 'HR', 'IE', 'IT', 'LT', 'LU', 'LV', 'MT', 'NL', 'PT', 'SI', 'SK']);

function detectCurrency(): Currency {
  const locales = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const locale of locales) {
    const region = locale.split('-').at(-1)?.toUpperCase();
    if (region === 'US') return 'USD';
    if (region === 'GB') return 'GBP';
    if (region === 'CA') return 'CAD';
    if (region === 'NZ') return 'NZD';
    if (region === 'JP') return 'JPY';
    if (region === 'SG') return 'SGD';
    if (region && euroRegions.has(region)) return 'EUR';
    if (region === 'AU') return 'AUD';
  }
  return 'USD';
}

export default function ShopClient({ products }: { products: Product[] }) {
  const [catalogProducts, setCatalogProducts] = useState(products);
  const [catalogSource, setCatalogSource] = useState<'loading' | 'tip4serv' | 'fallback'>('loading');
  const [filter, setFilter] = useState<'all' | Product['group']>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [currency, setCurrency] = useState<Currency>('USD');
  const [rates, setRates] = useState<Record<string, number>>({ USD: 1 });
  const [ratesStatus, setRatesStatus] = useState<'loading' | 'ready' | 'unavailable'>('loading');
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  useEffect(() => {
    const script = document.querySelector<HTMLScriptElement>('script[src*="js.tip4serv.com/tip4serv.min.js"]');
    if (window.Tip4Serv?.Checkout) return;

    function handleLoad() {
      if (window.Tip4Serv?.Checkout) {
        setCheckoutError(null);
      } else {
        setCheckoutError('Secure checkout did not finish loading. Refresh the page and try again.');
      }
    }

    function handleError() {
      setCheckoutError('Secure checkout is temporarily unavailable. Refresh the page and try again.');
    }

    const readyCheck = window.setInterval(() => {
      if (!window.Tip4Serv?.Checkout) return;
      window.clearInterval(readyCheck);
      setCheckoutError(null);
    }, 100);
    const loadTimeout = window.setTimeout(() => {
      window.clearInterval(readyCheck);
      if (!window.Tip4Serv?.Checkout) handleError();
    }, 10_000);

    script?.addEventListener('load', handleLoad);
    script?.addEventListener('error', handleError);
    return () => {
      window.clearInterval(readyCheck);
      window.clearTimeout(loadTimeout);
      script?.removeEventListener('load', handleLoad);
      script?.removeEventListener('error', handleError);
    };
  }, []);

  useEffect(() => {
    let active = true;
    async function loadCatalog() {
      try {
        const response = await fetch('/api/catalog');
        const body = await response.json() as { products?: unknown; source?: unknown };
        if (!response.ok || !Array.isArray(body.products) || !body.products.length) throw new Error('Catalogue unavailable');
        if (!active) return;
        setCatalogProducts(body.products as Product[]);
        setCatalogSource(body.source === 'tip4serv' ? 'tip4serv' : 'fallback');
      } catch {
        if (active) setCatalogSource('fallback');
      }
    }
    void loadCatalog();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    const savedCurrency = localStorage.getItem('blackoutz-currency');
    const preferredCurrency = currencies.includes(savedCurrency as Currency) ? savedCurrency as Currency : detectCurrency();
    async function loadRates() {
      try {
        const response = await fetch('/api/exchange-rates');
        const body = await response.json() as { rates?: unknown; unavailable?: unknown };
        let nextRates = body.rates && typeof body.rates === 'object' ? body.rates as Record<string, number> : { USD: 1 };
        if (body.unavailable) {
          const directRates = await Promise.all(currencies.filter((targetCurrency) => targetCurrency !== 'USD').map(async (targetCurrency) => {
            const directResponse = await fetch(`https://api.frankfurter.dev/v2/rate/USD/${targetCurrency}`);
            if (!directResponse.ok) throw new Error('Rate request failed');
            const directBody = await directResponse.json() as { rate?: unknown };
            if (typeof directBody.rate !== 'number' || !Number.isFinite(directBody.rate) || directBody.rate <= 0) throw new Error('Invalid rate');
            return [targetCurrency, directBody.rate] as const;
          }));
          nextRates = { USD: 1, ...Object.fromEntries(directRates) };
        }
        if (!active) return;
        setRates(nextRates);
        if (typeof nextRates[preferredCurrency] === 'number') {
          setCurrency(preferredCurrency);
          setRatesStatus('ready');
        } else {
          setCurrency('USD');
          setRatesStatus('unavailable');
        }
      } catch {
        if (active) { setCurrency('USD'); setRatesStatus('unavailable'); }
      }
    }
    void loadRates();
    return () => { active = false; };
  }, []);

  const categoryNames = Array.from(new Set(catalogProducts.map((product) => product.categoryName).filter((value): value is string => Boolean(value))));
  const groupProducts = filter === 'all' ? catalogProducts : catalogProducts.filter((product) => product.group === filter);
  const visibleProducts = categoryFilter === 'all' ? groupProducts : groupProducts.filter((product) => product.categoryName === categoryFilter);

  function changeCurrency(nextCurrency: Currency) {
    if (nextCurrency !== 'USD' && (typeof rates.USD !== 'number' || typeof rates[nextCurrency] !== 'number')) return;
    setCurrency(nextCurrency);
    localStorage.setItem('blackoutz-currency', nextCurrency);
  }

  function formatAmount(amount: number, amountCurrency: Currency) {
    const fractionDigits = amountCurrency === 'JPY' ? 0 : 2;
    return `${currencySymbols[amountCurrency]}${new Intl.NumberFormat(undefined, { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits }).format(amount)}`;
  }

  function canConvert(product: Product) {
    if (currency === product.priceCurrency) return true;
    return typeof rates[product.priceCurrency] === 'number' && typeof rates[currency] === 'number';
  }

  function formatPrice(product: Product, rawPrice = product.price) {
    if (!rawPrice.trim()) return '—';
    const amount = Number(rawPrice);
    if (!Number.isFinite(amount)) return '—';
    if (currency === product.priceCurrency || !canConvert(product)) return formatAmount(amount, product.priceCurrency);
    const usdAmount = product.priceCurrency === 'USD' ? amount : amount / rates[product.priceCurrency];
    return formatAmount(usdAmount * rates[currency], currency);
  }

  function isEstimated(product: Product) {
    return currency !== product.priceCurrency && canConvert(product);
  }

  function openCheckout(product: Product) {
    const checkout = window.Tip4Serv?.Checkout;
    if (!checkout?.open) {
      setCheckoutError('Secure checkout is still loading. Refresh the page and try again.');
      return;
    }

    setCheckoutError(null);
    try {
      const result = checkout.open({
        storeId: 21207,
        product: String(product.tip4servProductId ?? product.id),
        onFail: (failure) => setCheckoutError(failure.message || 'Tip4Serv could not start this checkout. Please try again.'),
      });
      if (result instanceof Promise) {
        void result.catch(() => setCheckoutError('Tip4Serv could not start this checkout. Please try again.'));
      }
    } catch {
      setCheckoutError('Tip4Serv could not start this checkout. Please try again.');
    }
  }

  return <>
    <div className="store-toolbar" aria-label="Filter store products">
      {([['all', 'All gear'], ['subscription', 'Subscriptions'], ['base', 'Custom bases'], ['credits', 'Credits'], ['support', 'Support']] as const).map(([value, label]) => (
        <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</button>
      ))}
      {categoryNames.length > 1 && <label className="currency-picker category-picker"><span>CATEGORY</span><select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} aria-label="Product category"><option value="all">ALL CATEGORIES</option>{categoryNames.map((category) => <option key={category} value={category}>{category.toUpperCase()}</option>)}</select></label>}
      <label className="currency-picker"><span>CURRENCY</span><select value={currency} onChange={(event) => changeCurrency(event.target.value as Currency)} aria-label="Display currency">
        {currencies.map((option) => <option key={option} value={option} disabled={option !== 'USD' && (typeof rates.USD !== 'number' || typeof rates[option] !== 'number')}>{option}</option>)}
      </select><small aria-live="polite">{ratesStatus === 'loading' ? 'LOADING RATES' : ratesStatus === 'ready' ? currency === 'USD' ? 'USD BASE PRICE' : 'ESTIMATED PRICE' : 'USD BASE ONLY'}</small></label>
      <span className="catalog-source" data-source={catalogSource}>{catalogSource === 'tip4serv' ? 'LIVE TIP4SERV CATALOG' : catalogSource === 'loading' ? 'SYNCING TIP4SERV…' : 'BRANDED FALLBACK'} • {visibleProducts.length.toString().padStart(2, '0')} PRODUCTS</span>
    </div>
    {checkoutError && <p className="checkout-launch-error" role="alert"><b>CHECKOUT ALERT</b>{checkoutError}</p>}
    <div className="product-grid">
      {visibleProducts.map((product) => <article className="product" key={product.id}>
        <div className="product-media"><Image src={product.image} alt={product.imageAlt} fill sizes="(max-width: 900px) 100vw, 33vw" unoptimized={product.image.startsWith('https://')}/><span className="product-number">{product.number}</span><span className="product-perk">{product.perk}</span></div>
        <div className="product-info"><p className="product-tag">{product.tag}</p><h3>{product.name}</h3><p>{product.description}</p><small className="product-legal">{product.customAmount ? 'VOLUNTARY SUPPORT • NO IN-GAME ADVANTAGE' : 'NON-REDEEMABLE DIGITAL REWARD • NO REAL-WORLD VALUE'}</small>
          <div className="product-action"><div><small>{product.customAmount ? 'MINIMUM DONATION' : product.billing === 'monthly' ? 'MONTHLY ACCESS' : 'ONE-TIME PURCHASE'}{isEstimated(product) && ' • EST.'}</small><strong>{product.customAmount && 'FROM '}{formatPrice(product)}{product.billing === 'monthly' && <em>/mo</em>}</strong></div><button type="button" className="blackoutz-checkout-btn" onClick={() => openCheckout(product)} aria-label={`Buy ${product.name}`}>BUY NOW <b>↗</b></button></div>
        </div>
      </article>)}
    </div>
  </>;
}

