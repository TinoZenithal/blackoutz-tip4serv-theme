# BLACKOUTZ Tip4Serv API Theme

A self-hosted BLACKOUTZ storefront built with Next.js and TypeScript. It uses Tip4Serv as the live product catalogue and secure checkout provider while keeping a fully custom black-and-red DayZ-inspired interface.

## Current state

- Responsive black-and-red storefront with branded BLACKOUTZ product artwork
- Live Tip4Serv products, categories, prices, subscription settings and images
- Automatic per-product player identifier fields
- Server-side Tip4Serv checkout with donation and recurring subscription support
- Checkout return messages for successful, pending and cancelled payments
- USD base pricing with optional live display-currency estimates
- Purchase, subscription, refund and privacy information
- Strict request validation, same-origin protection, basic abuse throttling, HTTPS-only handoff and browser security headers
- BLACKOUTZ social sharing metadata and optimized artwork
- Mobile navigation, keyboard-accessible dialogs and reduced-motion support

## How the API theme works

The browser requests `/api/catalog` from this storefront. That server route reads Tip4Serv using the private API key and returns only safe catalogue data. The key is never placed in browser code. When a customer is ready to buy, another server route creates the Tip4Serv checkout and sends the customer to Tip4Serv's secure payment page.

If the Tip4Serv catalogue is briefly unavailable, the storefront keeps a branded fallback catalogue visible. Checkout still requires a valid live Tip4Serv connection.

## Tip4Serv setup

Copy `.env.example` to `.env.local` and provide `TIP4SERV_API_KEY`. Never prefix it with `NEXT_PUBLIC_` or commit real credentials. The store, enabled products, categories and Tip4Serv product IDs are discovered automatically. The optional ID overrides only support the branded fallback catalogue.

The storefront requests the exact identifiers configured for each live product, creates a Tip4Serv checkout and validates that the returned payment link is an HTTPS Tip4Serv URL.

Set `SITE_URL` to the deployed storefront address so Tip4Serv can return customers to the correct success, pending or cancelled state.

## API-theme review links

- Live demo: `https://blackoutz-storefront.dylan-sciortino.chatgpt.site`
- Public source: `https://github.com/TinoZenithal/blackoutz-tip4serv-theme`

Tip4Serv's API Themes area links to self-hosted demos and source repositories. This project is prepared in that format; listing it in the Tip4Serv dashboard still requires Tip4Serv's review and approval.

Before opening the store, use Tip4Serv TEST mode to complete a full purchase and reward-delivery rehearsal. If payment webhooks are added later, validate the timestamp and HMAC signature against the raw request body as required by Tip4Serv.

## Local development

```sh
npm install
npm run dev
```

Before release:

```sh
npm run lint
npm run typecheck
npm run build
# or run all three together
npm run check
```

With the site running, verify the public pages and guarded checkout route:

```sh
npm run smoke
```

## Final owner launch checks

- Complete one subscription and one single-payment rehearsal while the Tip4Serv store is in TEST mode.
- Confirm every Tip4Serv product has the correct DayZ/Discord fulfilment action and player identifier configured.
- Confirm the Donation product complies with Tip4Serv's current platform rules.
- Keep the hosted review site public while Tip4Serv is reviewing the theme.
- Add a signed Tip4Serv webhook only if BLACKOUTZ later needs custom order automation beyond Tip4Serv's built-in fulfilment.

