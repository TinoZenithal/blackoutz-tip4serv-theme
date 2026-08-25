import type { Metadata } from 'next';
import Link from 'next/link';

const discordUrl = 'https://discord.gg/blackout-z';

export const metadata: Metadata = {
  title: 'Purchase & Privacy Information',
  description: 'BLACKOUTZ purchase, subscription, fulfilment, refund and privacy information.',
  alternates: { canonical: '/policies' },
  openGraph: { title: 'BLACKOUTZ Purchase & Privacy Information', description: 'Important information for BLACKOUTZ customers.' },
  twitter: { title: 'BLACKOUTZ Purchase & Privacy Information', description: 'Important information for BLACKOUTZ customers.' },
};

export default function PoliciesPage() {
  return <main className="policy-page">
    <header className="policy-header"><Link className="brand" href="/"><span className="brand-z">Z</span><span>BLACKOUT<span>Z</span><small>SURVIVE. FIGHT. DOMINATE.</small></span></Link><Link href="/#store">RETURN TO STORE →</Link></header>
    <article>
      <p className="kicker"><i/> PURCHASE INTEL</p>
      <h1>BUY WITH<br/><span>CONFIDENCE.</span></h1>
      <p className="policy-lede">Important information about BLACKOUTZ digital rewards, checkout, subscriptions, fulfilment, support and privacy. Updated 23 August 2026.</p>

      <section><span>01</span><div><h2>PRICES AND CHECKOUT</h2><p>BLACKOUTZ prices are set in US dollars. Other currencies shown on the storefront are estimates only. Tip4Serv displays the final payment currency, amount and any recurring billing terms before you approve payment. Payments are securely completed on Tip4Serv; BLACKOUTZ does not receive or store your card or PayPal details.</p></div></section>
      <section><span>02</span><div><h2>DIGITAL REWARDS AND DELIVERY</h2><p>Products are digital benefits for the BLACKOUTZ gaming community and have no cash or real-world redemption value. After purchase, open a ticket in the <a href={discordUrl} target="_blank" rel="noreferrer">BLACKOUTZ Discord</a> using the email entered at checkout. Delivery timing depends on payment confirmation, staff availability and the reward&apos;s configured fulfilment rules.</p></div></section>
      <section><span>03</span><div><h2>MONTHLY SUBSCRIPTIONS</h2><p>Products marked “monthly” renew through Tip4Serv until cancelled. The recurring amount is shown again before payment. Follow the instructions in your Tip4Serv receipt or contact BLACKOUTZ support before the next renewal date if you need help cancelling.</p></div></section>
      <section><span>04</span><div><h2>REFUNDS AND ORDER PROBLEMS</h2><p>If an order is duplicated, not delivered or materially different from its description, contact BLACKOUTZ through Discord with your Tip4Serv transaction details. Requests are reviewed individually under applicable consumer law and the payment provider&apos;s rules. Nothing on this page limits rights that cannot legally be excluded.</p></div></section>
      <section><span>05</span><div><h2>DONATIONS</h2><p>The Donation product is voluntary community support with a US$1 minimum. It does not promise a specific in-game advantage. Donation processing and eligibility remain subject to Tip4Serv&apos;s current platform rules.</p></div></section>
      <section><span>06</span><div><h2>PRIVACY</h2><p>This storefront uses the information entered in the checkout form only to start the requested Tip4Serv checkout and does not save it in a BLACKOUTZ customer database. Your display-currency choice is stored on your device. Basic security logs may be processed by the hosting provider. Tip4Serv and its payment providers process checkout information under their own policies.</p><p><a href="https://tip4serv.com/privacy-policy" target="_blank" rel="noreferrer">TIP4SERV PRIVACY POLICY →</a> <a href="https://tip4serv.com/terms-of-use" target="_blank" rel="noreferrer">TIP4SERV TERMS OF USE →</a></p></div></section>

      <aside><b>NEED HELP WITH AN ORDER?</b><p>Open a BLACKOUTZ Discord ticket and include the email used at checkout and your Tip4Serv transaction reference. Never post payment details publicly.</p><a className="btn btn-red" href={discordUrl} target="_blank" rel="noreferrer">OPEN BLACKOUTZ DISCORD <b>↗</b></a></aside>
    </article>
  </main>;
}
