const apiBase = (process.env.TIP4SERV_API_BASE || 'https://api.tip4serv.com/v1').replace(/\/$/, '');
const storeId = process.env.TIP4SERV_STORE_ID || '21207';

const checks = [
  { name: 'one-time product', productId: Number(process.env.TIP4SERV_PRODUCT_PREBUILT_BASE || 4), type: 'addtocart' },
  { name: 'monthly subscription', productId: Number(process.env.TIP4SERV_PRODUCT_BUILDING_SHED || 0), type: 'subscribe' },
  { name: 'minimum supporter purchase', productId: Number(process.env.TIP4SERV_PRODUCT_DONATION || 11), type: 'addtocart', donationAmount: 1 },
];

async function verifyIdentifiers(productId) {
  const url = new URL(`${apiBase}/store/checkout/identifiers`);
  url.searchParams.set('store', storeId);
  url.searchParams.set('products', JSON.stringify([productId]));
  const response = await fetch(url, { headers: { accept: 'application/json' } });
  const body = await response.json().catch(() => null);
  const identifiers = Array.isArray(body) ? body : body?.identifiers;
  if (!response.ok || !Array.isArray(identifiers)) throw new Error(`Tip4Serv identifier check failed for product ${productId}.`);
  for (const identifier of ['email', 'discord_id', 'ingame_username']) {
    if (!identifiers.includes(identifier)) throw new Error(`Product ${productId} is missing Tip4Serv identifier ${identifier}.`);
  }
}

async function verifyCheckout(check) {
  const url = new URL(`${apiBase}/store/checkout`);
  url.searchParams.set('store', storeId);
  url.searchParams.set('currency', 'USD');
  const response = await fetch(url, {
    method: 'POST',
    headers: { accept: 'application/json', 'content-type': 'application/json' },
    body: JSON.stringify({
      products: [{
        product_id: check.productId,
        type: check.type,
        quantity: 1,
        ...(check.donationAmount ? { donation_amount: check.donationAmount } : {}),
      }],
      currency: 'USD',
    }),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || typeof body?.url !== 'string') throw new Error(`Tip4Serv ${check.name} checkout failed.`);
  const destination = new URL(body.url);
  if (destination.protocol !== 'https:' || !destination.hostname.endsWith('tip4serv.com') || destination.pathname !== '/precheckout') {
    throw new Error(`Tip4Serv ${check.name} returned an unexpected destination.`);
  }
  await verifyIdentifiers(check.productId);
}

for (const check of checks) await verifyCheckout(check);
console.log('Tip4Serv one-time, subscription and supporter checkout checks passed.');

