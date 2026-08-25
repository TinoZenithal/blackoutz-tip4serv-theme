import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { DISCORD_STATE_COOKIE } from '../session-token';
import { checkoutSiteOrigin } from '../site-origin';

export async function GET(request: NextRequest) {
  const clientId = process.env.DISCORD_CLIENT_ID?.trim();
  if (!clientId) return NextResponse.json({ error: 'Discord linking is not configured yet.' }, { status: 503 });

  let origin: string;
  try {
    origin = checkoutSiteOrigin(request);
  } catch {
    return NextResponse.json({ error: 'The storefront address is not configured safely.' }, { status: 503 });
  }

  const stateBytes = crypto.getRandomValues(new Uint8Array(32));
  const state = Array.from(stateBytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  const redirectUri = `${origin}/api/oauth/discord/callback`;
  const authorizationUrl = new URL('https://discord.com/oauth2/authorize');
  authorizationUrl.searchParams.set('client_id', clientId);
  authorizationUrl.searchParams.set('response_type', 'code');
  authorizationUrl.searchParams.set('redirect_uri', redirectUri);
  authorizationUrl.searchParams.set('scope', 'identify');
  authorizationUrl.searchParams.set('state', state);
  authorizationUrl.searchParams.set('prompt', 'consent');

  const response = NextResponse.redirect(authorizationUrl);
  response.cookies.set(DISCORD_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: origin.startsWith('https:'),
    path: '/',
    maxAge: 10 * 60,
  });
  return response;
}

