import Link from 'next/link';
import ShopClient from './shop-client';
import MobileNav from './mobile-nav';
import ServerCopy from './server-copy';
import CheckoutReturn from './checkout-return';
import { products } from './products';

const discordUrl = 'https://discord.gg/blackout-z';

const faqs = [
  ['How fast is delivery?', 'Tip4Serv confirms payment first, then delivery follows the fulfilment rules configured for that BLACKOUTZ reward. Some in-game rewards may require you to be online.'],
  ['Are these subscriptions?', 'Some products renew monthly and others are one-time purchases. Each card and checkout summary clearly identifies the billing type before payment.'],
  ['What happens after purchase?', 'Review the order here, then continue to the BLACKOUTZ-branded Tip4Serv page. Tip4Serv will link your Discord account, request your in-game username and securely complete payment.'],
  ['Can I get support?', 'Yes. Join the BLACKOUTZ Discord for purchase support, server updates, events and squad recruitment.'],
  ['Are purchases refundable?', 'BLACKOUTZ does not provide change-of-mind refunds for digital rewards, subscriptions already charged or supporter purchases. This does not exclude any remedy required by applicable consumer law. Duplicate charges, non-delivery or materially incorrect orders are reviewed individually through Discord support.'],
];

const siteUrl = 'https://blackoutz-storefront.dylan-sciortino.chatgpt.site';

const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'OnlineStore',
  name: 'BLACKOUTZ Storefront',
  url: siteUrl,
  description: 'Premium access, custom loadouts and tactical supplies for the BLACKOUTZ DayZ community.',
  currenciesAccepted: 'USD',
  hasOfferCatalog: {
    '@type': 'OfferCatalog',
    name: 'BLACKOUTZ Monthly Access',
    itemListElement: products.map((product) => ({
      '@type': 'Offer',
      priceCurrency: product.priceCurrency,
      price: product.price,
      url: `${siteUrl}/#store`,
      availability: 'https://schema.org/InStock',
      itemOffered: {
        '@type': 'Product',
        name: product.name,
        sku: product.id,
        category: product.tag,
        description: product.description,
        image: `${siteUrl}${product.image}`,
        brand: { '@type': 'Brand', name: 'BLACKOUTZ' },
      },
    })),
  },
};

export default function Home() {
  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <a className="skip-link" href="#store">Skip to store</a>
      <header className="site-header">
        <div className="nav shell">
          <Link className="brand" href="#top" aria-label="BLACKOUTZ home"><span className="brand-z">Z</span><span>BLACKOUT<span>Z</span><small>SURVIVE. FIGHT. DOMINATE.</small></span></Link>
          <nav className="nav-links" aria-label="Primary navigation"><a href="#store">Store</a><a href="#network">Network</a><a href="#how">How it works</a><a href="#faq">FAQ</a></nav>
          <MobileNav />
          <a className="nav-cta" href="#store"><span>↘</span> SHOP LOADOUT</a>
        </div>
      </header>

      <section id="top" className="hero">
        <div className="hero-bg" />
        <div className="hero-grid shell" aria-hidden="true" />
        <div className="hero-inner shell">
          <div className="hero-copy">
            <p className="kicker"><i /> BLACKOUTZ SUPPLY COMMAND <b>{'///'}</b></p>
            <h1>SURVIVE<br/><span>THE</span> BLACKOUT.</h1>
            <p className="hero-lede">Premium access, custom loadouts and tactical supplies for survivors who play to dominate.</p>
            <div className="hero-actions"><a className="btn btn-red" href="#store">ENTER THE STORE <b>↗</b></a><a className="btn btn-clear" href="#network">EXPLORE THE NETWORK</a></div>
            <div className="hero-proof"><span><b>01</b> SECURE CHECKOUT</span><span><b>02</b> TRACKED FULFILMENT</span><span><b>03</b> COMMUNITY SUPPORT</span></div>
          </div>
          <div className="hero-stamp"><span>BLACKOUTZ</span><b>SUPPLY DROP</b><small>AUTHORISED PERSONNEL ONLY</small></div>
        </div>
        <div className="hero-bottom"><div className="shell"><span className="signal" /> <b>BLACKOUTZ NETWORK</b><span>STOREFRONT STATUS</span><strong>SYSTEMS READY</strong><a href="#network">VIEW INTEL →</a></div></div>
      </section>

      <section className="ticker" aria-label="BLACKOUTZ benefits"><div>BLACKOUTZ <span>◆</span> BUILD YOUR BASE <span>◆</span> CUSTOMISE YOUR LOADOUT <span>◆</span> SKIP THE QUEUE <span>◆</span> SURVIVE THE BLACKOUT <span>◆</span></div></section>

      <section className="order-intel shell" aria-label="BLACKOUTZ order and server information">
        <div className="order-protocol"><span>!</span><div><small>ORDER PROTOCOL</small><strong>OPEN A DISCORD SUPPORT TICKET AFTER EVERY PURCHASE.</strong><p>BLACKOUTZ staff will process your order as quickly as possible. <a href={discordUrl} target="_blank" rel="noreferrer">OPEN DISCORD →</a></p></div></div>
        <ServerCopy />
      </section>

      <section id="store" className="store shell section">
        <CheckoutReturn />
        <div className="section-title"><div><p className="kicker"><i /> FIELD-TESTED ADVANTAGES</p><h2>CHOOSE YOUR<br/><span>ADVANTAGE.</span></h2></div><p>Every product is built to sharpen your BLACKOUTZ experience without breaking the survival loop.</p></div>
        <ShopClient products={products} />
        <div className="store-note"><span>!</span><p><b>NO CHANGE-OF-MIND REFUNDS.</b> Purchases are final once confirmed, except where applicable law requires a remedy. Digital rewards and BLACKOUTZ Credits have no real-world monetary value.</p><a href="#faq">REFUND POLICY →</a></div>
      </section>

      <section id="network" className="network section">
        <div className="shell network-grid">
          <div className="network-copy"><p className="kicker"><i /> BUILT DIFFERENT</p><h2>MORE THAN<br/>A <span>SERVER.</span></h2><p>BLACKOUTZ is built around high-stakes survival, meaningful progression and a community that keeps every session unpredictable.</p><a className="text-link" href="#store">GEAR UP FOR YOUR NEXT RUN →</a></div>
          <div className="network-cards">
            <article><span>01</span><b>HARDCORE SURVIVAL</b><p>Scarcity, danger and choices that matter.</p></article>
            <article><span>02</span><b>ACTIVE OPERATIONS</b><p>Regular events and evolving objectives.</p></article>
            <article><span>03</span><b>PLAYER-DRIVEN WORLD</b><p>Build alliances, create rivals and leave a mark.</p></article>
            <article><span>04</span><b>FAIR SUPPORT</b><p>Clear rewards and responsive community help.</p></article>
          </div>
        </div>
        <div className="network-visual"><div className="crosshair"><span>BLACKOUTZ</span></div><p>NO SAFE ZONE.<br/><b>NO EASY WAY OUT.</b></p></div>
      </section>

      <section id="how" className="how section shell">
        <div className="section-title compact"><div><p className="kicker"><i /> DEPLOYMENT PROCESS</p><h2>THREE STEPS.<br/><span>CLEAR ROUTE.</span></h2></div></div>
        <div className="steps"><article><span>01</span><div><b>SELECT YOUR ADVANTAGE</b><p>Choose the product or subscription that fits your play style.</p></div></article><article><span>02</span><div><b>VERIFY &amp; PAY WITH TIP4SERV</b><p>Link Discord, enter your in-game username and approve the secure payment.</p></div></article><article><span>03</span><div><b>OPEN A SUPPORT TICKET</b><p>Contact BLACKOUTZ in Discord so staff can track and complete fulfilment.</p></div></article></div>
      </section>

      <section className="manifesto"><div className="manifesto-bg"/><div className="shell"><p>THE DARK DOESN&apos;T<br/>CARE WHO YOU WERE.</p><h2>IT ONLY REVEALS<br/><span>WHO YOU ARE.</span></h2><a className="btn btn-red" href="#store">PREPARE YOUR LOADOUT <b>↗</b></a></div></section>

      <section id="faq" className="faq section shell">
        <div className="faq-intro"><p className="kicker"><i /> FIELD MANUAL</p><h2>KNOW BEFORE<br/>YOU <span>DEPLOY.</span></h2><p>Quick answers for survivors entering the BLACKOUTZ network.</p></div>
        <div className="faq-list">{faqs.map(([question, answer], index) => <details key={question} open={index === 0}><summary><span>0{index + 1}</span>{question}<b>+</b></summary><p>{answer}</p></details>)}</div>
      </section>

      <section className="discord"><div className="shell discord-inner"><div><p className="kicker"><i /> COMMS CHANNEL</p><h2>DON&apos;T SURVIVE<br/><span>ALONE.</span></h2><p>Join the BLACKOUTZ community for server updates, support, events and squad recruitment.</p></div><a className="btn btn-white" href={discordUrl} target="_blank" rel="noreferrer">JOIN THE BLACKOUTZ DISCORD <b>↗</b></a></div></section>

      <footer className="footer shell"><div className="brand"><span className="brand-z">Z</span><span>BLACKOUT<span>Z</span><small>SURVIVE. FIGHT. DOMINATE.</small></span></div><div><b>EXPLORE</b><a href="#store">Store</a><a href="#network">Network</a><a href={discordUrl} target="_blank" rel="noreferrer">Discord</a></div><div><b>PURCHASE INFO</b><a href="#faq">Purchase FAQ</a><Link href="/policies">Purchase, refund & privacy</Link><a href="https://tip4serv.com/terms-of-use" target="_blank" rel="noreferrer">Tip4Serv terms</a></div><p>BLACKOUTZ is an independent gaming community and is not affiliated with Bohemia Interactive. Digital rewards have no real-world monetary value.<br/><span>© 2026 BLACKOUTZ NETWORK. ALL RIGHTS RESERVED.</span></p></footer>
    </main>
  );
}

