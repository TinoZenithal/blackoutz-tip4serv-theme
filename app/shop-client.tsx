'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import type { Product, StoreCurrency } from './products';

const currencies = ['USD', 'AUD', 'GBP', 'EUR', 'CAD', 'CHF'] as const satisfies readonly StoreCurrency[];
type Currency = StoreCurrency;
type CheckoutStep = 'review' | 'verify' | 'payment';
type DiscordStatus = { state: 'loading' | 'unlinked' | 'linked'; displayName?: string };
type CheckoutDraft = { productId: string; donationAmount: string; currency: Currency; email: string; ingameUsername: string };
const CHECKOUT_DRAFT_KEY = 'blackoutz-checkout-draft-v14';

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
  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>('review');
  const [filter, setFilter] = useState<'all' | Product['group']>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [currency, setCurrency] = useState<Currency>('USD');
  const [rates, setRates] = useState<Record<string, number>>({ USD: 1 });
  const [ratesStatus, setRatesStatus] = useState<'loading' | 'ready' | 'unavailable'>('loading');
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [openingProductId, setOpeningProductId] = useState<string | null>(null);
  const [donationAmount, setDonationAmount] = useState('1.00');
  const [email, setEmail] = useState('');
  const [ingameUsername, setIngameUsername] = useState('');
  const [discord, setDiscord] = useState<DiscordStatus>({ state: 'loading' });
  const [reviewConfirmed, setReviewConfirmed] = useState(false);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const restoredCheckout = useRef(false);

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
    async function loadDiscordSession() {
      try {
        const response = await fetch('/api/oauth/discord/session', { cache: 'no-store' });
        const body = await response.json() as { linked?: unknown; displayName?: unknown };
        if (!active) return;
        if (response.ok && body.linked === true && typeof body.displayName === 'string') setDiscord({ state: 'linked', displayName: body.displayName });
        else setDiscord({ state: 'unlinked' });
      } catch {
        if (active) setDiscord({ state: 'unlinked' });
      }
    }
    void loadDiscordSession();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (restoredCheckout.current || catalogSource === 'loading') return;
    const params = new URLSearchParams(window.location.search);
    const discordResult = params.get('discord');
    if (!discordResult) return;
    restoredCheckout.current = true;

    try {
      const rawDraft = sessionStorage.getItem(CHECKOUT_DRAFT_KEY);
      const draft = rawDraft ? JSON.parse(rawDraft) as CheckoutDraft : null;
      const product = draft ? catalogProducts.find((candidate) => candidate.id === draft.productId) : undefined;
      if (draft && product) {
        queueMicrotask(() => {
          setSelected(product);
          setDonationAmount(draft.donationAmount || '1.00');
          setEmail(draft.email || '');
          setIngameUsername(draft.ingameUsername || '');
          if (currencies.includes(draft.currency)) setCurrency(draft.currency);
          setCheckoutStep('verify');
          if (discordResult === 'denied') setCheckoutError('Discord linking was cancelled. Link Discord when you are ready to continue.');
          if (discordResult === 'error') setCheckoutError('Discord could not be linked. Check the Discord application settings and try again.');
        });
      }
    } catch {
      sessionStorage.removeItem(CHECKOUT_DRAFT_KEY);
    }

    params.delete('discord');
    const search = params.toString();
    window.history.replaceState(null, '', `${window.location.pathname}${search ? `?${search}` : ''}${window.location.hash || '#store'}`);
  }, [catalogProducts, catalogSource]);

  useEffect(() => {
    if (!selected) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && openingProductId === null) {
        setSelected(null);
        setCheckoutStep('review');
        setCheckoutError(null);
        setReviewConfirmed(false);
        setPaymentConfirmed(false);
        sessionStorage.removeItem(CHECKOUT_DRAFT_KEY);
      }
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
    return `${currencySymbols[amountCurrency]}${new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)}`;
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

  function closeCheckout() {
    if (openingProductId !== null) return;
    setSelected(null);
    setCheckoutStep('review');
    setCheckoutError(null);
    setReviewConfirmed(false);
    setPaymentConfirmed(false);
    sessionStorage.removeItem(CHECKOUT_DRAFT_KEY);
  }

  function reviewProduct(product: Product) {
    setCheckoutError(null);
    setOpeningProductId(null);
    setCheckoutStep('review');
    setReviewConfirmed(false);
    setPaymentConfirmed(false);
    if (product.customAmount) setDonationAmount('1.00');
    setSelected(product);
  }

  function continueToVerification(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const amount = selected.customAmount ? Number(donationAmount) : undefined;
    if (selected.customAmount && (!Number.isFinite(amount) || (amount ?? 0) < 1 || (amount ?? 0) > 5000)) {
      setCheckoutError('Donation amount must be between US$1.00 and US$5,000.00.');
      return;
    }
    setCheckoutError(null);
    setCheckoutStep('verify');
  }

  function linkDiscord() {
    if (!selected) return;
    const draft: CheckoutDraft = { productId: selected.id, donationAmount, currency, email, ingameUsername };
    sessionStorage.setItem(CHECKOUT_DRAFT_KEY, JSON.stringify(draft));
    window.location.assign('/api/oauth/discord/start');
  }

  async function unlinkDiscord() {
    try {
      await fetch('/api/oauth/discord/session', { method: 'DELETE' });
    } finally {
      setDiscord({ state: 'unlinked' });
      setCheckoutError(null);
    }
  }

  function continueToPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setCheckoutError('Enter a valid email address for your receipt.');
      return;
    }
    if (ingameUsername.trim().length < 2) {
      setCheckoutError('Enter your in-game username.');
      return;
    }
    if (discord.state !== 'linked') {
      setCheckoutError('Link your Discord account before continuing.');
      return;
    }
    setCheckoutError(null);
    setPaymentConfirmed(false);
    setCheckoutStep('payment');
  }

  async function openCheckout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || discord.state !== 'linked') return;
    setCheckoutError(null);
    setOpeningProductId(selected.id);
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          productId: selected.id,
          email: email.trim(),
          ingameUsername: ingameUsername.trim(),
          amount: selected.customAmount ? Number(donationAmount) : undefined,
          currency,
        }),
      });
      const body = await response.json() as { checkoutUrl?: unknown; error?: unknown };
      if (!response.ok || typeof body.checkoutUrl !== 'string') {
        if (response.status === 401) {
          setDiscord({ state: 'unlinked' });
          setCheckoutStep('verify');
        }
        throw new Error(typeof body.error === 'string' ? body.error : 'Secure payment unavailable.');
      }
      const checkoutUrl = new URL(body.checkoutUrl);
      if (checkoutUrl.protocol !== 'https:' || (checkoutUrl.hostname !== 'tip4serv.com' && !checkoutUrl.hostname.endsWith('.tip4serv.com'))) throw new Error('Invalid checkout destination.');
      sessionStorage.removeItem(CHECKOUT_DRAFT_KEY);
      window.location.assign(checkoutUrl.toString());
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : 'Tip4Serv could not prepare the secure payment. Please try again.');
      setOpeningProductId(null);
    }
  }

  const stepNumber = checkoutStep === 'review' ? 1 : checkoutStep === 'verify' ? 2 : 3;
  const checkoutTotal = selected ? formatPrice(selected, selected.customAmount ? donationAmount : selected.price) : '';

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
    {selected && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && closeCheckout()}>
      <section ref={dialogRef} className={`checkout-modal checkout-step-${checkoutStep}`} role="dialog" aria-modal="true" aria-labelledby="checkout-title" aria-describedby="checkout-description">
        <button ref={closeRef} type="button" className="modal-close" onClick={closeCheckout} disabled={openingProductId !== null} aria-label="Close checkout">×</button>
        <div className="modal-image"><Image src={selected.image} alt="" fill sizes="(max-width: 760px) 100vw, 40vw" unoptimized={selected.image.startsWith('https://')}/><span>{selected.perk}</span></div>
        <div className="checkout-modal-content">
          <div className="checkout-route" aria-label="Checkout progress">
            {(['REVIEW', 'VERIFY PLAYER', 'PAY'] as const).map((label, index) => <span key={label} className={stepNumber === index + 1 ? 'is-current' : stepNumber > index + 1 ? 'is-complete' : ''} aria-current={stepNumber === index + 1 ? 'step' : undefined}><b>{String(index + 1).padStart(2, '0')}</b><em>{label}</em>{index < 2 && <i/>}</span>)}
          </div>

          {checkoutStep === 'review' && <form onSubmit={continueToVerification}>
            <p className="kicker"><i/> {selected.customAmount ? 'COMMUNITY SUPPORT' : 'BLACKOUTZ ORDER REVIEW'}</p>
            <h3 id="checkout-title">{selected.name}</h3>
            <p id="checkout-description" className="modal-copy">{selected.description.length > 250 ? `${selected.description.slice(0, 247)}…` : selected.description}</p>
            {selected.customAmount && <><label htmlFor="donation-amount">DONATION AMOUNT (USD)</label><input id="donation-amount" type="number" value={donationAmount} onChange={(event) => { setDonationAmount(event.target.value); setCheckoutError(null); }} min="1" max="5000" step="0.01" required inputMode="decimal"/></>}
            <div className="modal-total"><span>{selected.customAmount ? 'DONATION TOTAL' : selected.billing === 'monthly' ? 'RECURRING MONTHLY TOTAL' : 'ONE-TIME TOTAL'}{isEstimated(selected) && ' • ESTIMATED'}</span><strong>{checkoutTotal}{selected.billing === 'monthly' && <em>/mo</em>}</strong></div>
            {isEstimated(selected) && <p className="currency-disclaimer">Tip4Serv will confirm the final {currency} amount before payment. Its live conversion and any payment-provider fees may differ slightly from this estimate.</p>}
            <label className="confirm"><input type="checkbox" checked={reviewConfirmed} onChange={(event) => setReviewConfirmed(event.target.checked)} required/><span>{selected.customAmount ? 'I understand this supporter purchase includes a digital BLACKOUTZ community role and has no cash value.' : selected.billing === 'monthly' ? 'I understand this is a recurring monthly digital subscription.' : 'I understand this is a non-redeemable digital in-game reward.'}</span></label>
            {checkoutError && <p className="checkout-error" role="alert">{checkoutError}</p>}
            <button className="modal-submit"><span>CONTINUE TO PLAYER VERIFICATION</span> <b>↗</b></button>
            <small className="secure-note">STEP 01 OF 03 • REVIEW YOUR BLACKOUTZ ORDER</small>
          </form>}

          {checkoutStep === 'verify' && <form onSubmit={continueToPayment}>
            <button className="checkout-back" type="button" onClick={() => { setCheckoutStep('review'); setCheckoutError(null); }}>← BACK TO ORDER REVIEW</button>
            <p className="kicker"><i/> PLAYER VERIFICATION</p>
            <h3 id="checkout-title">VERIFY YOUR OPERATOR.</h3>
            <p id="checkout-description" className="modal-copy">These details let Tip4Serv match the purchase to the right BLACKOUTZ player and run your configured Discord fulfilment.</p>
            <div className="verify-fields">
              <label htmlFor="checkout-email">RECEIPT EMAIL</label>
              <input id="checkout-email" type="email" value={email} onChange={(event) => { setEmail(event.target.value); setCheckoutError(null); }} placeholder="you@example.com" autoComplete="email" required/>
              <label htmlFor="checkout-username">IN-GAME USERNAME</label>
              <input id="checkout-username" type="text" value={ingameUsername} onChange={(event) => { setIngameUsername(event.target.value); setCheckoutError(null); }} placeholder="Enter your BLACKOUTZ player name" autoComplete="off" minLength={2} maxLength={80} required/>
            </div>
            <div className={`discord-link-card ${discord.state === 'linked' ? 'is-linked' : ''}`}>
              <span className="discord-mark" aria-hidden="true">◆</span>
              <div><small>DISCORD CONNECTION</small><strong>{discord.state === 'loading' ? 'CHECKING CONNECTION…' : discord.state === 'linked' ? `LINKED AS ${discord.displayName}` : 'LINK DISCORD TO CONTINUE'}</strong><p>Your numeric Discord ID stays hidden and is sent only to Tip4Serv when checkout begins.</p></div>
              {discord.state === 'linked' ? <button type="button" onClick={() => void unlinkDiscord()}>CHANGE</button> : <button type="button" onClick={linkDiscord} disabled={discord.state === 'loading'}>LINK DISCORD ↗</button>}
            </div>
            {checkoutError && <p className="checkout-error" role="alert">{checkoutError}</p>}
            <button className="modal-submit" disabled={discord.state === 'loading'}><span>CONTINUE TO PAYMENT REVIEW</span> <b>↗</b></button>
            <small className="secure-note">STEP 02 OF 03 • SECURE DISCORD OAUTH • NO RAW ID ENTRY</small>
          </form>}

          {checkoutStep === 'payment' && <form onSubmit={openCheckout} aria-busy={openingProductId !== null}>
            <button className="checkout-back" type="button" onClick={() => { setCheckoutStep('verify'); setCheckoutError(null); }} disabled={openingProductId !== null}>← BACK TO PLAYER DETAILS</button>
            <p className="kicker"><i/> SECURE PAYMENT REVIEW</p>
            <h3 id="checkout-title">FINAL CHECK.</h3>
            <p id="checkout-description" className="modal-copy">Confirm the operator, order and billing details below. Tip4Serv or its payment provider will collect the protected payment details on the next secure screen.</p>
            <div className="payment-review">
              <div><span>PRODUCT</span><strong>{selected.name}</strong></div>
              <div><span>PLAYER</span><strong>{ingameUsername}</strong></div>
              <div><span>DISCORD</span><strong>{discord.displayName} • LINKED</strong></div>
              <div><span>RECEIPT</span><strong>{email}</strong></div>
              <div><span>BILLING</span><strong>{selected.billing === 'monthly' ? 'RECURRING MONTHLY' : 'ONE-TIME'}</strong></div>
              <div><span>CURRENCY</span><strong>{currency}{isEstimated(selected) ? ' • ESTIMATE' : ''}</strong></div>
            </div>
            <div className="payment-gateway"><span aria-hidden="true">⌁</span><div><small>PROTECTED PAYMENT GATEWAY</small><strong>CARD / AVAILABLE TIP4SERV METHODS</strong><p>Payment credentials never pass through or remain on the BLACKOUTZ site.</p></div><b>256-BIT</b></div>
            <div className="modal-total"><span>{selected.billing === 'monthly' ? 'RECURRING TOTAL' : selected.customAmount ? 'DONATION TOTAL' : 'ORDER TOTAL'}{isEstimated(selected) && ' • ESTIMATED'}</span><strong>{checkoutTotal}{selected.billing === 'monthly' && <em>/mo</em>}</strong></div>
            <label className="confirm"><input type="checkbox" checked={paymentConfirmed} onChange={(event) => setPaymentConfirmed(event.target.checked)} required/><span>I confirm these player and order details are correct and I am ready to continue to Tip4Serv&apos;s protected payment controls.</span></label>
            {checkoutError && <p className="checkout-error" role="alert">{checkoutError}</p>}
            <button className="modal-submit" disabled={openingProductId !== null}><span aria-live="polite">{openingProductId !== null ? 'PREPARING SECURE PAYMENT…' : 'CONTINUE TO SECURE PAYMENT'}</span> <b>↗</b></button>
            <small className="secure-note">STEP 03 OF 03 • TIP4SERV PROCESSES THE FINAL PAYMENT</small>
          </form>}
        </div>
      </section>
    </div>}
  </>;
}

