const baseUrl = (process.env.SMOKE_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');

async function expectResponse(path, expectedStatus, requiredText) {
  const response = await fetch(`${baseUrl}${path}`);
  const body = await response.text();
  if (response.status !== expectedStatus) throw new Error(`${path} returned ${response.status}; expected ${expectedStatus}`);
  if (requiredText && !body.includes(requiredText)) throw new Error(`${path} is missing ${JSON.stringify(requiredText)}`);
  return { response, body };
}

const homepage = await expectResponse('/', 200, 'SURVIVE');
for (const product of ['BUILDING SHED', 'WEAPON WORKBENCH', 'PRIORITY QUEUE', '300M ZONE', 'BACK HATCH', 'CUSTOM PREBUILT BASE', 'FULLY CUSTOM BASE', '$75,000 CURRENCY PACK', '$180,000 CURRENCY PACK', '$300,000 CURRENCY PACK', 'DONATION']) {
  if (!homepage.body.includes(product)) throw new Error(`Homepage is missing ${product}`);
}
if (!homepage.body.includes('85.190.157.135:11100')) throw new Error('Homepage is missing the BLACKOUTZ server address');
if (!homepage.body.includes('https://discord.gg/blackout-z')) throw new Error('Homepage is missing the BLACKOUTZ Discord invite');
if (!homepage.body.includes('US$7.99')) throw new Error('Homepage is missing the USD subscription price');
if (!homepage.body.includes('US$1.00')) throw new Error('Homepage is missing the US$1.00 donation minimum');
if (homepage.response.headers.get('x-frame-options') !== 'DENY') throw new Error('Homepage is missing anti-framing protection');
if (!homepage.response.headers.get('content-security-policy')?.includes("frame-ancestors 'none'")) throw new Error('Homepage is missing its content security policy');
if (homepage.response.headers.get('cross-origin-resource-policy') !== 'same-origin') throw new Error('Homepage is missing its resource isolation policy');

await Promise.all([
  expectResponse('/api/catalog', 200, '"products"'),
  expectResponse('/api/exchange-rates', 200, '"base":"USD"'),
  expectResponse('/api/checkout/identifiers?productId=not-a-product', 400, 'valid product'),
  expectResponse('/policies', 200, 'BUY WITH'),
  expectResponse('/robots.txt', 200, 'Sitemap:'),
  expectResponse('/sitemap.xml', 200, 'blackoutz-storefront'),
  expectResponse('/manifest.webmanifest', 200, 'BLACKOUTZ'),
  expectResponse('/favicon-blackoutz-v2.png', 200),
  expectResponse('/products/donation.webp', 200),
]);

const invalidProduct = new FormData();
invalidProduct.set('productId', 'not-a-product');
invalidProduct.set('playerId', 'smoke-test-survivor');
const invalidResponse = await fetch(`${baseUrl}/api/checkout`, { method: 'POST', headers: { origin: baseUrl }, body: invalidProduct });
if (invalidResponse.status !== 400) throw new Error(`Invalid checkout returned ${invalidResponse.status}; expected 400`);

const invalidDonation = new FormData();
invalidDonation.set('productId', 'donation');
invalidDonation.set('identifier:email', 'smoke@example.com');
invalidDonation.set('amount', '0.99');
const invalidDonationResponse = await fetch(`${baseUrl}/api/checkout`, { method: 'POST', headers: { origin: baseUrl }, body: invalidDonation });
if (invalidDonationResponse.status !== 400) throw new Error(`Below-minimum donation returned ${invalidDonationResponse.status}; expected 400`);

const unsupportedResponse = await fetch(`${baseUrl}/api/checkout`, { method: 'POST', headers: { 'content-type': 'application/json', origin: baseUrl }, body: '{}' });
if (unsupportedResponse.status !== 415) throw new Error(`Unsupported checkout returned ${unsupportedResponse.status}; expected 415`);

const crossOriginForm = new FormData();
crossOriginForm.set('productId', 'not-a-product');
const crossOriginResponse = await fetch(`${baseUrl}/api/checkout`, { method: 'POST', headers: { origin: 'https://example.invalid' }, body: crossOriginForm });
if (crossOriginResponse.status !== 403) throw new Error(`Cross-origin checkout returned ${crossOriginResponse.status}; expected 403`);

console.log('BLACKOUTZ storefront smoke checks passed.');
