'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import type { Product, StoreCurrency } from './products';

const currencies = ['USD', 'AUD', 'GBP', 'EUR', 'CAD', 'CHF'] as const satisfies readonly StoreCurrency[];
type Currency = StoreCurrency;
const TIP4SERV_STORE_ID = 21207;

const currencySymbols: Record<Currency, string> = {
  AUD: 'A$', USD: 'US$', GBP: '£', EUR: '€', CAD: 'C$', CHF: 'CHF ',
};

const euroRegions = new Set(['AT', 'BE', 'CY', 'DE', 'EE', 'ES', 'FI', 'FR', 'GR', 'HR', 'IE', 'IT', 'LT', 'LU', 'LV', 'MT', 'NL', 'PT', 'SI', 'SK']);

function detectCurrency(): Currency {
  const locales = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const locale of locales) {
    const region = locale.split('-').at(-1)?.toUpperCase();
    if (region === 'US') return 'USD';
    if (region === 'GB') return 'GBP';
    if (region === 'CA') return 'CAD';
    if (region === 'CH' || region === 'LI') return 'CHF';
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
  const [currency, setCurrency] = useState<Currency>('USD');
  const [rates, setRates] = useState<Record<string, number>>({ USD: 1 });
  const [ratesStatus, setRatesStatus] = useState<'loading' | 'ready' | 'unavailable'>('loading');
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [openingProductId, setOpeningProductId] = useState<string | null>(null);
  const [donationAmount, setDonationAmount] = useState('1.00');
  const closeRef = useRef<HTMLButtonElement>(null);
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
    if (!selected) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && openingProductId === null) setSelected(null);
      if (event.key === 'Tab' && dialogRef.current) {
        const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button, input, [href], [tabindex]:not([tabindex="-1"])')).filter((element) => !element.hasAttribute('disabled'));
        const first = focusable[0];
        const last = focusable.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener('keydown', handleKey);
    document.body.classList.add('modal-open');
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.classList.remove('modal-open');
      previousFocus?.focus();
    };
  }, [openingProductId, selected]);

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
    const fractionDigits = 2;
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

  async function openCheckout(product: Product, customAmount?: number) {
    setCheckoutError(null);
    setOpeningProductId(product.id);
    try {
      const productReference = typeof product.tip4servProductId === 'number'
        ? { product_id: product.tip4servProductId }
        : { product_slug: product.id };
      const returnUrl = `${window.location.origin}/`;
      const checkoutEndpoint = new URL('https://api.tip4serv.com/v1/store/checkout');
      checkoutEndpoint.searchParams.set('store', String(TIP4SERV_STORE_ID));
      checkoutEndpoint.searchParams.set('currency', currency);
      const response = await fetch(checkoutEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          products: [{
            ...productReference,
            type: product.billing === 'monthly' ? 'subscribe' : 'addtocart',
            quantity: 1,
            ...(product.customAmount ? { donation_amount: customAmount } : {}),
          }],
          currency,
          redirect_success_checkout: `${returnUrl}?checkout=success#store`,
          redirect_pending_checkout: `${returnUrl}?checkout=pending#store`,
          redirect_canceled_checkout: `${returnUrl}?checkout=canceled#store`,
        }),
      });

      const body = await response.json() as { url?: unknown; error?: unknown };
      if (!response.ok || typeof body.url !== 'string') {
        throw new Error(typeof body.error === 'string' ? body.error : 'Checkout unavailable');
      }

      const checkoutUrl = new URL(body.url);
      if (checkoutUrl.protocol !== 'https:' || (checkoutUrl.hostname !== 'tip4serv.com' && !checkoutUrl.hostname.endsWith('.tip4serv.com'))) {
        throw new Error('Invalid checkout destination');
      }
      window.location.assign(checkoutUrl.toString());
    } catch {
      setCheckoutError('Tip4Serv could not start this checkout. Please wait a moment and try again.');
      setOpeningProductId(null);
    }
  }

  function reviewProduct(product: Product) {
    setCheckoutError(null);
    setOpeningProductId(null);
    if (product.customAmount) setDonationAmount('1.00');
    setSelected(product);
  }

  function continueToCheckout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const amount = selected.customAmount ? Number(donationAmount) : undefined;
    if (selected.customAmount && (!Number.isFinite(amount) || (amount ?? 0) < 1 || (amount ?? 0) > 5000)) {
      setCheckoutError('Donation amount must be between US$1.00 and US$5,000.00.');
      return;
    }
    void openCheckout(selected, amount);
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
    {checkoutError && !selected && <p className="checkout-launch-error" role="alert"><b>CHECKOUT ALERT</b>{checkoutError}</p>}
    <div className="product-grid">
      {visibleProducts.map((product) => <article className="product" key={product.id}>
        <div className="product-media"><Image src={product.image} alt={product.imageAlt} fill sizes="(max-width: 900px) 100vw, 33vw" unoptimized={product.image.startsWith('https://')}/><span className="product-number">{product.number}</span><span className="product-perk">{product.perk}</span></div>
        <div className="product-info"><p className="product-tag">{product.tag}</p><h3>{product.name}</h3><p>{product.description}</p><small className="product-legal">{product.customAmount ? 'INCLUDES A BLACKOUTZ SUPPORTER ROLE • NO CASH VALUE' : 'NON-REDEEMABLE DIGITAL REWARD • NO REAL-WORLD VALUE'}</small>
          <div className="product-action"><div><small>{product.customAmount ? 'MINIMUM DONATION' : product.billing === 'monthly' ? 'MONTHLY ACCESS' : 'ONE-TIME PURCHASE'}{isEstimated(product) && ' • EST.'}</small><strong>{product.customAmount && 'FROM '}{formatPrice(product)}{product.billing === 'monthly' && <em>/mo</em>}</strong></div><button type="button" className="blackoutz-checkout-btn" onClick={() => reviewProduct(product)} aria-label={`Review ${product.name}`}>BUY NOW <b>↗</b></button></div>
        </div>
      </article>)}
    </div>
    {selected && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && openingProductId === null && setSelected(null)}>
      <section ref={dialogRef} className="checkout-modal" role="dialog" aria-modal="true" aria-labelledby="checkout-title" aria-describedby="checkout-description">
        <button ref={closeRef} type="button" className="modal-close" onClick={() => setSelected(null)} disabled={openingProductId !== null} aria-label="Close order review">×</button>
        <div className="modal-image"><Image src={selected.image} alt="" fill sizes="(max-width: 760px) 100vw, 40vw" unoptimized={selected.image.startsWith('https://')}/><span>{selected.perk}</span></div>
        <form onSubmit={continueToCheckout} aria-busy={openingProductId !== null}>
          <p className="kicker"><i/> {selected.customAmount ? 'COMMUNITY SUPPORT' : 'BLACKOUTZ ORDER REVIEW'}</p>
          <h3 id="checkout-title">{selected.name}</h3>
          <p id="checkout-description" className="modal-copy">{selected.description.length > 250 ? `${selected.description.slice(0, 247)}…` : selected.description}</p>
          <div className="checkout-route" aria-label="Checkout progress">
            <span className="is-current"><b>01</b><em>REVIEW</em></span><i/><span><b>02</b><em>VERIFY PLAYER</em></span><i/><span><b>03</b><em>PAY</em></span>
          </div>
          {selected.customAmount && <><label htmlFor="donation-amount">DONATION AMOUNT (USD)</label><input id="donation-amount" type="number" value={donationAmount} onChange={(event) => { setDonationAmount(event.target.value); setCheckoutError(null); }} min="1" max="5000" step="0.01" required inputMode="decimal"/></>}
          <div className="modal-total"><span>{selected.customAmount ? 'DONATION TOTAL' : selected.billing === 'monthly' ? 'RECURRING MONTHLY TOTAL' : 'ONE-TIME TOTAL'}{isEstimated(selected) && ' • ESTIMATED'}</span><strong>{formatPrice(selected, selected.customAmount ? donationAmount : selected.price)}{selected.billing === 'monthly' && <em>/mo</em>}</strong></div>
          {isEstimated(selected) && <p className="currency-disclaimer">Tip4Serv will confirm the final {currency} amount before payment. Its live conversion and any payment-provider fees may differ slightly from this estimate.</p>}
          <p className="checkout-handoff"><b>NEXT SCREEN</b> Tip4Serv will open the BLACKOUTZ-branded verification page to link Discord, enter your in-game username and finish payment.</p>
          <label className="confirm"><input type="checkbox" required/><span>{selected.customAmount ? 'I understand this supporter purchase includes a digital BLACKOUTZ community role and has no cash value.' : selected.billing === 'monthly' ? 'I understand this is a recurring monthly digital subscription.' : 'I understand this is a non-redeemable digital in-game reward.'}</span></label>
          {checkoutError && <p className="checkout-error" role="alert">{checkoutError}</p>}
          <button className="modal-submit" disabled={openingProductId !== null}><span aria-live="polite">{openingProductId !== null ? 'OPENING TIP4SERV…' : 'CONTINUE TO PLAYER VERIFICATION'}</span> <b>↗</b></button>
          <small className="secure-note">TIP4SERV HANDLES DISCORD LINKING, PLAYER DETAILS AND PAYMENT</small>
        </form>
      </section>
    </div>}
  </>;
}

