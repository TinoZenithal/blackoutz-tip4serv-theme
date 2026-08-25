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
if (!homepage.body.includes('blackoutz-checkout-btn')) throw new Error('Homepage is missing the BLACKOUTZ order-review buttons');
if (homepage.body.includes('js.tip4serv.com/tip4serv.min.js')) throw new Error('Homepage still includes the retired popup checkout loader');
if (homepage.body.includes('DISCORD USER ID')) throw new Error('Homepage still renders a manual Discord ID field');
if (homepage.response.headers.get('x-frame-options') !== 'DENY') throw new Error('Homepage is missing anti-framing protection');
if (!homepage.response.headers.get('content-security-policy')?.includes("frame-ancestors 'none'")) throw new Error('Homepage is missing its content security policy');
if (homepage.response.headers.get('cross-origin-resource-policy') !== 'same-origin') throw new Error('Homepage is missing its resource isolation policy');
if (homepage.response.headers.get('cross-origin-opener-policy') !== 'same-origin-allow-popups') throw new Error('Homepage is missing its checkout navigation policy');

await Promise.all([
  expectResponse('/api/catalog', 200, '"products"'),
  expectResponse('/api/exchange-rates', 200, '"base":"USD"'),
  expectResponse('/policies', 200, 'BUY WITH'),
  expectResponse('/robots.txt', 200, 'Sitemap:'),
  expectResponse('/sitemap.xml', 200, 'blackoutz-storefront'),
  expectResponse('/manifest.webmanifest', 200, 'BLACKOUTZ'),
  expectResponse('/favicon-blackoutz-v2.png', 200),
  expectResponse('/products/donation.webp', 200),
]);

console.log('BLACKOUTZ storefront smoke checks passed.');

