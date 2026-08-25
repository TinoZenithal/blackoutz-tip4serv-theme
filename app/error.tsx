'use client';

export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main className="lost-page">
    <div className="lost-grid" aria-hidden="true"/>
    <section>
      <p className="kicker"><i/> SYSTEM INTERRUPTION</p>
      <span className="error-code">500</span>
      <h1>COMMS<br/><b>OFFLINE.</b></h1>
      <p>The storefront hit an unexpected interruption. Your payment has not been submitted.</p>
      <button className="btn btn-red" onClick={reset}>RETRY CONNECTION <b>↗</b></button>
    </section>
  </main>;
}
