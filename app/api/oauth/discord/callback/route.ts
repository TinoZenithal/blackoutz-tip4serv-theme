import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { checkoutSiteOrigin } from '../site-origin';
import { createDiscordSession, discordCookieOptions, DISCORD_SESSION_COOKIE, DISCORD_STATE_COOKIE } from '../session-token';

type DiscordTokenResponse = { access_token?: unknown };
type DiscordUserResponse = { id?: unknown; username?: unknown; global_name?: unknown };

function cleanDisplayName(value: string) {
  return value.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 80);
}

function returnToStore(origin: string, status: 'linked' | 'denied' | 'error') {
  const url = new URL('/', origin);
  url.searchParams.set('discord', status);
  url.hash = 'store';
  return url;
}

export async function GET(request: NextRequest) {
  let origin: string;
  try {
    origin = checkoutSiteOrigin(request);
  } catch {
    return NextResponse.json({ error: 'The storefront address is not configured safely.' }, { status: 503 });
  }

  const code = request.nextUrl.searchParams.get('code');
  const state = request.nextUrl.searchParams.get('state');
  const expectedState = request.cookies.get(DISCORD_STATE_COOKIE)?.value;
  const oauthError = request.nextUrl.searchParams.get('error');
  if (oauthError) return NextResponse.redirect(returnToStore(origin, 'denied'));
  if (!code || !state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(returnToStore(origin, 'error'));
  }

  const clientId = process.env.DISCORD_CLIENT_ID?.trim();
  const clientSecret = process.env.DISCORD_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return NextResponse.redirect(returnToStore(origin, 'error'));

  const redirectUri = `${origin}/api/oauth/discord/callback`;
  try {
    const tokenResponse = await fetch('https://discord.com/api/v10/oauth2/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
      signal: AbortSignal.timeout(10_000),
      cache: 'no-store',
    });
    const tokenBody = await tokenResponse.json().catch(() => null) as DiscordTokenResponse | null;
    if (!tokenResponse.ok || typeof tokenBody?.access_token !== 'string') throw new Error('Discord token exchange failed.');

    const userResponse = await fetch('https://discord.com/api/v10/users/@me', {
      headers: { authorization: `Bearer ${tokenBody.access_token}`, accept: 'application/json' },
      signal: AbortSignal.timeout(10_000),
      cache: 'no-store',
    });
    const user = await userResponse.json().catch(() => null) as DiscordUserResponse | null;
    if (!userResponse.ok || typeof user?.id !== 'string' || !/^\d{5,24}$/.test(user.id)) throw new Error('Discord identity lookup failed.');
    const rawName = typeof user.global_name === 'string' ? user.global_name : typeof user.username === 'string' ? user.username : 'Discord player';
    const displayName = cleanDisplayName(rawName) || 'Discord player';
    const sessionToken = await createDiscordSession(user.id, displayName);

    const response = NextResponse.redirect(returnToStore(origin, 'linked'));
    response.cookies.set(DISCORD_SESSION_COOKIE, sessionToken, discordCookieOptions(origin.startsWith('https:')));
    response.cookies.set(DISCORD_STATE_COOKIE, '', { httpOnly: true, sameSite: 'lax', secure: origin.startsWith('https:'), path: '/', maxAge: 0 });
    return response;
  } catch {
    const response = NextResponse.redirect(returnToStore(origin, 'error'));
    response.cookies.set(DISCORD_STATE_COOKIE, '', { httpOnly: true, sameSite: 'lax', secure: origin.startsWith('https:'), path: '/', maxAge: 0 });
    return response;
  }
}

