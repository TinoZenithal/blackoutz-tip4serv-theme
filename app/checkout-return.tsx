'use client';

import { useSyncExternalStore } from 'react';

const discordUrl = 'https://discord.gg/blackout-z';

const notices = {
  success: {
    title: 'PAYMENT CONFIRMED',
    body: 'Tip4Serv accepted your payment. Open a Discord support ticket with the email used at checkout so BLACKOUTZ staff can complete your order.',
  },
  pending: {
    title: 'PAYMENT PENDING',
    body: 'Tip4Serv is still confirming the payment. Wait for the confirmation email before opening a BLACKOUTZ support ticket.',
  },
  canceled: {
    title: 'CHECKOUT CANCELLED',
    body: 'The checkout was closed before completion. No BLACKOUTZ order has been submitted, and you can try again whenever you are ready.',
  },
} as const;

type CheckoutStatus = keyof typeof notices;

function subscribe(callback: () => void) {
  window.addEventListener('popstate', callback);
  return () => window.removeEventListener('popstate', callback);
}

function getSnapshot(): CheckoutStatus | '' {
  const status = new URLSearchParams(window.location.search).get('checkout');
  return status && status in notices ? status as CheckoutStatus : '';
}

function dismissNotice() {
  const url = new URL(window.location.href);
  url.searchParams.delete('checkout');
  window.history.replaceState({}, '', url);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export default function CheckoutReturn() {
  const status = useSyncExternalStore<CheckoutStatus | ''>(subscribe, getSnapshot, () => '');
  if (!status) return null;
  const notice = notices[status];

  return <aside className={`checkout-return checkout-return-${status}`} role="status" aria-live="polite">
    <span>{status === 'success' ? '✓' : status === 'pending' ? '…' : '×'}</span>
    <div><small>TIP4SERV CHECKOUT</small><strong>{notice.title}</strong><p>{notice.body}</p></div>
    {status === 'success' && <a href={discordUrl} target="_blank" rel="noreferrer">OPEN DISCORD →</a>}
    <button type="button" onClick={dismissNotice} aria-label="Dismiss checkout message">×</button>
  </aside>;
}
