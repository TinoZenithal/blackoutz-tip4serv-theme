import 'server-only';

export const DISCORD_SESSION_COOKIE = 'blackoutz_discord_session';
export const DISCORD_STATE_COOKIE = 'blackoutz_discord_oauth_state';
const SESSION_SECONDS = 24 * 60 * 60;

export type DiscordSession = {
  id: string;
  displayName: string;
  expiresAt: number;
};

function secret() {
  const value = process.env.DISCORD_CLIENT_SECRET?.trim();
  if (!value) throw new Error('Discord OAuth is not configured.');
  return value;
}

function base64UrlEncode(bytes: Uint8Array) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlDecode(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function signingKey() {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(`blackoutz-discord-session:${secret()}`),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

export async function createDiscordSession(id: string, displayName: string) {
  const payload: DiscordSession = {
    id,
    displayName: displayName.slice(0, 80),
    expiresAt: Math.floor(Date.now() / 1000) + SESSION_SECONDS,
  };
  const encodedPayload = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const signature = await crypto.subtle.sign('HMAC', await signingKey(), new TextEncoder().encode(encodedPayload));
  return `${encodedPayload}.${base64UrlEncode(new Uint8Array(signature))}`;
}

export async function readDiscordSession(token: string | undefined): Promise<DiscordSession | null> {
  if (!token) return null;
  const [encodedPayload, encodedSignature, extra] = token.split('.');
  if (!encodedPayload || !encodedSignature || extra) return null;

  try {
    const valid = await crypto.subtle.verify(
      'HMAC',
      await signingKey(),
      base64UrlDecode(encodedSignature),
      new TextEncoder().encode(encodedPayload),
    );
    if (!valid) return null;

    const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(encodedPayload))) as Partial<DiscordSession>;
    if (!payload.id || !/^\d{5,24}$/.test(payload.id)) return null;
    if (!payload.displayName || typeof payload.displayName !== 'string') return null;
    if (!payload.expiresAt || payload.expiresAt <= Math.floor(Date.now() / 1000)) return null;
    return { id: payload.id, displayName: payload.displayName, expiresAt: payload.expiresAt };
  } catch {
    return null;
  }
}

export function discordCookieOptions(secure: boolean) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure,
    path: '/',
    maxAge: SESSION_SECONDS,
  };
}

