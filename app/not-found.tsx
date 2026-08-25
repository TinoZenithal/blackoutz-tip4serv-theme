import Link from 'next/link';

export default function NotFound() {
  return <main className="lost-page">
    <div className="lost-grid" aria-hidden="true"/>
    <section>
      <p className="kicker"><i/> SIGNAL LOST</p>
      <span className="error-code">404</span>
      <h1>YOU&apos;RE OFF<br/><b>THE MAP.</b></h1>
      <p>This route is outside the BLACKOUTZ operational zone. Return to supply command and regroup.</p>
      <Link className="btn btn-red" href="/">RETURN TO BLACKOUTZ <b>↗</b></Link>
    </section>
  </main>;
}
