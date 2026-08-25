'use client';

import { useState } from 'react';

const serverAddress = '85.190.157.135:11100';

export default function ServerCopy() {
  const [copied, setCopied] = useState(false);

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(serverAddress);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return <button className="server-copy" type="button" onClick={copyAddress} aria-label={`Copy BLACKOUTZ server address ${serverAddress}`}>
    <span><small>DAYZ SERVER ADDRESS</small><strong>{serverAddress}</strong></span>
    <b aria-live="polite">{copied ? 'COPIED ✓' : 'COPY ADDRESS'}</b>
  </button>;
}
