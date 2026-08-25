'use client';

import { useEffect, useRef, useState } from 'react';

const links = [['Store', '#store'], ['Network', '#network'], ['How it works', '#how'], ['FAQ', '#faq']];

export default function MobileNav() {
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!open) return;
    const toggle = toggleRef.current;
    menuRef.current?.querySelector<HTMLElement>('a')?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
      if (event.key === 'Tab' && menuRef.current) {
        const focusable = Array.from(menuRef.current.querySelectorAll<HTMLElement>('a, button'));
        const first = focusable[0]; const last = focusable.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener('keydown', handleKey);
    document.body.classList.add('menu-open');
    return () => { document.removeEventListener('keydown', handleKey); document.body.classList.remove('menu-open'); toggle?.focus(); };
  }, [open]);

  return <div className="mobile-nav">
    <button ref={toggleRef} className="mobile-toggle" aria-expanded={open} aria-controls="mobile-menu" aria-label={open ? 'Close navigation' : 'Open navigation'} onClick={() => setOpen(!open)}><i/><i/></button>
    {open && <nav ref={menuRef} id="mobile-menu" className="mobile-menu" aria-label="Mobile navigation">
      <p>BLACKOUTZ NAVIGATION</p>
      {links.map(([label, href], index) => <a href={href} key={href} onClick={() => setOpen(false)}><span>0{index + 1}</span>{label}<b>↘</b></a>)}
      <small>SURVIVE. FIGHT. DOMINATE.</small>
    </nav>}
  </div>;
}
