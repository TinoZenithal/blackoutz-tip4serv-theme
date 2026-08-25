'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import type { Product, StoreCurrency } from './products';
import { checkoutIdentifiers, identifierField, type CheckoutIdentifier } from './checkout-identifiers';

const currencies = ['USD', 'AUD', 'GBP', 'EUR', 'CAD', 'NZD', 'JPY', 'SGD'] as const satisfies readonly StoreCurrency[];
type Currency = StoreCurrency;

const currencySymbols: Record<Currency, string> = {
  AUD: 'A$', USD: 'US$', GBP: '£', EUR: '€', CAD: 'C$', NZD: 'NZ$', JPY: '¥', SGD: 'S$',
};

const euroRegions = new Set(['AT', 'BE', 'CY', 'DE', 'EE', 'ES', 'FI', 'FR', 'GR', 'HR', 'IE', 'IT', 'LT', 'LU', 'LV', 'MT', 'NL', 'PT', 'SI', 'SK']);

const checkoutIdentifierSet = new Set<string>(checkoutIdentifiers);

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
  const [selected, setSelected] = useState<Product | null>(null);
  const [filter, setFilter] = useState<'all' | Product['group']>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [identifiers, setIdentifiers] = useState<CheckoutIdentifier[]>([]);
  const [identifierValues, setIdentifierValues] = useState<Partial<Record<CheckoutIdentifier, string>>>({});
  const [identifierStatus, setIdentifierStatus] = useState<'idle' | 'loading' | 'ready' | 'fallback'>('idle');
  const [donationAmount, setDonationAmount] = useState('5.00');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [currency, setCurrency] = useState<Currency>('USD');
  const [rates, setRates] = useState<Record<string, number>>({ USD: 1 });
  const [ratesStatus, setRatesStatus] = useState<'loading' | 'ready' | 'unavailable'>('loading');
  const closeRef = useRef<HTMLButtonElement>(null);
  const firstIdentifierRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLElement>(null);

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

  useEffect(() => {
    if (!selected) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelected(null);
      if (event.key === 'Tab' && dialogRef.current) {
        const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button, input, [href], [tabindex]:not([tabindex="-1"])')).filter((element) => !element.hasAttribute('disabled'));
        const first = focusable[0]; const last = focusable.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener('keydown', handleKey);
    document.body.classList.add('modal-open');
    return () => { document.removeEventListener('keydown', handleKey); document.body.classList.remove('modal-open'); previousFocus?.focus(); };
  }, [selected]);

  useEffect(() => {
    if (!selected) return;

    const selectedProduct = selected;
    const controller = new AbortController();
    const fallback: CheckoutIdentifier[] = selectedProduct.customAmount ? ['email'] : ['email', 'ingame_username'];
    async function loadIdentifiers() {
      try {
        const response = await fetch(`/api/checkout/identifiers?productId=${encodeURIComponent(selectedProduct.id)}`, { signal: controller.signal });
        const body = await response.json() as { identifiers?: unknown; source?: unknown };
        if (!response.ok || !Array.isArray(body.identifiers)) throw new Error('Requirements unavailable');
        const resolved = Array.from(new Set(body.identifiers.filter((value): value is CheckoutIdentifier => typeof value === 'string' && checkoutIdentifierSet.has(value))));
        if (!resolved.includes('email')) resolved.unshift('email');
        if (!resolved.length) throw new Error('Requirements unavailable');
        setIdentifiers(resolved);
        setIdentifierStatus(body.source === 'fallback' ? 'fallback' : 'ready');
      } catch {
        if (controller.signal.aborted) return;
        setIdentifiers(fallback);
        setIdentifierStatus('fallback');
      }
    }
    void loadIdentifiers();
    return () => controller.abort();
  }, [selected]);

  useEffect(() => {
    if (identifierStatus === 'ready' || identifierStatus === 'fallback') firstIdentifierRef.current?.focus();
  }, [identifierStatus]);

  async function checkout(event: FormEvent) {
    event.preventDefault();
    if (!selected || identifierStatus === 'loading' || identifiers.some((identifier) => !identifierValues[identifier]?.trim())) return;
    if (selected.customAmount) {
      const amount = Number(donationAmount);
      if (!Number.isFinite(amount) || amount < 1 || amount > 5000) return;
    }
    setStatus('loading'); setMessage('');
    const form = new FormData();
    form.set('productId', selected.id);
    for (const identifier of identifiers) form.set(`identifier:${identifier}`, identifierValues[identifier]?.trim() || '');
    if (selected.customAmount) form.set('amount', donationAmount);
    try {
      const response = await fetch('/api/checkout', { method: 'POST', body: form });
      const body = await response.json().catch(() => ({})) as { checkoutUrl?: unknown; error?: unknown; identifiers?: unknown };
      if (response.ok && typeof body.checkoutUrl === 'string') { window.location.assign(body.checkoutUrl); return; }
      if (response.status === 409 && Array.isArray(body.identifiers)) {
        const updatedIdentifiers = Array.from(new Set(body.identifiers.filter((value): value is CheckoutIdentifier => typeof value === 'string' && checkoutIdentifierSet.has(value))));
        if (updatedIdentifiers.length) {
          setIdentifiers(updatedIdentifiers);
          setIdentifierStatus('ready');
        }
      }
      setStatus('error'); setMessage(typeof body.error === 'string' ? body.error : 'Checkout could not be started. Please try again.');
    } catch {
      setStatus('error'); setMessage('Connection lost. Check your network and try again.');
    }
  }

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
    <div className="product-grid">
      {visibleProducts.map((product) => <article className="product" key={product.id}>
        <div className="product-media"><Image src={product.image} alt={product.imageAlt} fill sizes="(max-width: 900px) 100vw, 33vw" unoptimized={product.image.startsWith('https://')}/><span className="product-number">{product.number}</span><span className="product-perk">{product.perk}</span></div>
        <div className="product-info"><p className="product-tag">{product.tag}</p><h3>{product.name}</h3><p>{product.description}</p><small className="product-legal">{product.customAmount ? 'VOLUNTARY SUPPORT • NO IN-GAME ADVANTAGE' : 'NON-REDEEMABLE DIGITAL REWARD • NO REAL-WORLD VALUE'}</small>
          <div className="product-action"><div><small>{product.customAmount ? 'MINIMUM DONATION' : product.billing === 'monthly' ? 'MONTHLY ACCESS' : 'ONE-TIME PURCHASE'}{isEstimated(product) && ' • EST.'}</small><strong>{product.customAmount && 'FROM '}{formatPrice(product)}{product.billing === 'monthly' && <em>/mo</em>}</strong></div><button type="button" onClick={() => { setIdentifiers([]); setIdentifierStatus('loading'); setSelected(product); setStatus('idle'); setMessage(''); }} aria-label={`Configure ${product.name}`}>CONFIGURE <b>↗</b></button></div>
        </div>
      </article>)}
    </div>
    {selected && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setSelected(null)}>
      <section ref={dialogRef} className="checkout-modal" role="dialog" aria-modal="true" aria-labelledby="checkout-title" aria-describedby="checkout-description">
        <button ref={closeRef} className="modal-close" onClick={() => setSelected(null)} aria-label="Close checkout">×</button>
        <div className="modal-image"><Image src={selected.image} alt="" fill sizes="(max-width: 760px) 100vw, 40vw" unoptimized={selected.image.startsWith('https://')}/><span>{selected.perk}</span></div>
        <form onSubmit={checkout} aria-busy={status === 'loading' || identifierStatus === 'loading'}>
          <p className="kicker"><i/> {selected.customAmount ? 'COMMUNITY SUPPORT' : 'LOADOUT CONFIGURATION'}</p><h3 id="checkout-title">{selected.name}</h3>
          <p id="checkout-description" className="modal-copy">{selected.customAmount ? 'Choose how much you would like to contribute towards the BLACKOUTZ server and community. The minimum donation is US$1.00.' : 'Provide the details Tip4Serv needs for this product so the reward reaches the correct survivor.'}</p>
          {identifierStatus === 'loading' ? <p className="identifier-loading" role="status"><i/> CHECKING TIP4SERV REQUIREMENTS…</p> : identifiers.map((identifier, index) => {
            const field = identifierField(identifier);
            const id = `checkout-${identifier.replaceAll('_', '-')}`;
            return <div className="identifier-field" key={identifier}><label htmlFor={id}>{field.label}</label><input ref={index === 0 ? firstIdentifierRef : undefined} id={id} type={field.type} value={identifierValues[identifier] || ''} onChange={(event) => { setIdentifierValues((values) => ({ ...values, [identifier]: event.target.value })); if (status === 'error') { setStatus('idle'); setMessage(''); } }} placeholder={field.placeholder} minLength={identifier === 'email' ? undefined : 2} maxLength={identifier === 'email' ? 254 : 160} required autoComplete={field.autoComplete} autoCapitalize="none" spellCheck={false}/></div>;
          })}
          {identifierStatus === 'fallback' && <p className="identifier-fallback">Using the standard BLACKOUTZ checkout fields. Tip4Serv will verify them before payment.</p>}
          {selected.customAmount && <><label htmlFor="donation-amount">DONATION AMOUNT (USD)</label><input id="donation-amount" type="number" value={donationAmount} onChange={(event) => { setDonationAmount(event.target.value); if (status === 'error') { setStatus('idle'); setMessage(''); } }} min="1" max="5000" step="0.01" required inputMode="decimal"/></>}
          <div className="modal-total"><span>{selected.customAmount ? 'DONATION TOTAL' : selected.billing === 'monthly' ? 'RECURRING MONTHLY TOTAL' : 'ONE-TIME TOTAL'}{isEstimated(selected) && ' • ESTIMATED'}</span><strong>{formatPrice(selected, selected.customAmount ? donationAmount : selected.price)}</strong></div>
          {isEstimated(selected) && <p className="currency-disclaimer">Final checkout charge: {formatAmount(Number(selected.customAmount ? donationAmount || selected.price : selected.price), selected.priceCurrency)} {selected.priceCurrency}. Your payment provider determines the exact converted amount and any fees.</p>}
          <label className="confirm"><input type="checkbox" required/><span>{selected.customAmount ? 'I understand this is a voluntary contribution to support BLACKOUTZ.' : selected.billing === 'monthly' ? 'I understand this is a recurring monthly digital subscription.' : 'I understand this is a non-redeemable digital in-game reward.'}</span></label>
          {message && <p className="checkout-error" role="alert">{message}</p>}
          <button className="modal-submit" disabled={status === 'loading' || identifierStatus === 'loading'}><span aria-live="polite">{identifierStatus === 'loading' ? 'CHECKING REQUIREMENTS…' : status === 'loading' ? 'CONTACTING TIP4SERV…' : 'CONTINUE TO SECURE CHECKOUT'}</span> <b>↗</b></button>
          <small className="secure-note">SECURE SERVER-SIDE CHECKOUT • API KEYS NEVER REACH YOUR BROWSER</small>
        </form>
      </section>
    </div>}
  </>;
}
