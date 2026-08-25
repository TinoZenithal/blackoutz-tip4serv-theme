# BLACKOUTZ Tip4Serv API Theme

A self-hosted BLACKOUTZ storefront built with Next.js and TypeScript. It uses Tip4Serv as the live product catalogue and secure checkout provider while keeping a fully custom black-and-red DayZ-inspired interface.

## Current state

- Responsive black-and-red storefront with branded BLACKOUTZ product artwork
- Live Tip4Serv products, categories, prices, subscription settings and images
- Branded order review followed by Tip4Serv's player-verification and payment page
- One-time, donation and recurring subscription checkout support
- Checkout return messages for successful, pending and cancelled payments
- USD base pricing with optional Tip4Serv-supported display currencies
- Purchase, subscription, refund and privacy information
- HTTPS-only Tip4Serv handoff and strict browser security headers
- BLACKOUTZ social sharing metadata and optimized artwork
- Mobile navigation, keyboard-accessible dialogs and reduced-motion support

## How the API theme works

The browser requests `/api/catalog` from this storefront. That server route reads Tip4Serv using the private API key and returns only safe catalogue data. The key is never placed in browser code.

When a customer is ready to buy, the browser calls Tip4Serv's public checkout endpoint. This endpoint does not require an API key. The storefront deliberately omits the optional `user` object, so Tip4Serv handles Discord linking, the in-game username and payment on its own BLACKOUTZ-branded pre-checkout page. The request explicitly sends `addtocart` for one-time products, `subscribe` for monthly products and the selected supported currency.

If the Tip4Serv catalogue is briefly unavailable, the storefront keeps a branded fallback catalogue visible. Checkout still requires a valid live Tip4Serv connection.

## Tip4Serv setup

Copy `.env.example` to `.env.local` and provide `TIP4SERV_API_KEY`. Never prefix it with `NEXT_PUBLIC_` or commit real credentials. The key is used only by the server-side catalogue reader. The store, enabled products, categories and Tip4Serv product IDs are discovered automatically. Optional ID overrides support diagnostics and the branded fallback catalogue.

The live checkout currently requires `email`, `discord_id` and `ingame_username` because of the store's Tip4Serv fulfilment configuration. Customers do not type a raw Discord ID on this site: Tip4Serv asks them to link Discord on the next page and supplies the ID to its configured role automation.

Set `SITE_URL` to the deployed storefront address so Tip4Serv can return customers to the correct success, pending or cancelled state.

## API-theme review links

- Live demo: `https://blackoutz-storefront.dylan-sciortino.chatgpt.site`
- Public source: `https://github.com/TinoZenithal/blackoutz-tip4serv-theme`

Tip4Serv's API Themes area links to self-hosted demos and source repositories. This Next.js project is the self-hosted API theme. Tip4Serv's `/precheckout` page remains the secure verification/payment handoff and can separately use the store's Tip4Serv theme customizer. Listing this storefront inside the Tip4Serv API Themes area still requires Tip4Serv's review and approval.

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

With the site running, verify the public pages, catalogue, artwork and security headers:

```sh
npm run smoke
```

Verify that Tip4Serv still generates one-time, subscription and US$1 supporter checkouts and requests the expected player identifiers:

```sh
npm run verify:tip4serv
```

## Final owner launch checks

- Complete one subscription and one single-payment rehearsal while the Tip4Serv store is in TEST mode.
- Confirm every Tip4Serv product has the correct DayZ/Discord fulfilment action and player identifier configured.
- Confirm the Donation product complies with Tip4Serv's current platform rules.
- Keep the hosted review site public while Tip4Serv is reviewing the theme.
- Add a signed Tip4Serv webhook only if BLACKOUTZ later needs custom order automation beyond Tip4Serv's built-in fulfilment.

