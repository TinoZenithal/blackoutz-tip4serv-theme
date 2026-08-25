import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { discordCookieOptions, DISCORD_SESSION_COOKIE, readDiscordSession } from '../session-token';
import { checkoutSiteOrigin } from '../site-origin';

export async function GET(request: NextRequest) {
  const session = await readDiscordSession(request.cookies.get(DISCORD_SESSION_COOKIE)?.value);
  return NextResponse.json(
    session ? { linked: true, displayName: session.displayName } : { linked: false },
    { headers: { 'cache-control': 'no-store' } },
  );
}

export async function DELETE(request: NextRequest) {
  const source = request.headers.get('origin') || request.headers.get('referer');
  let origin: string;
  try {
    origin = checkoutSiteOrigin(request);
    if (!source || new URL(source).origin !== origin) throw new Error('Unexpected origin');
  } catch {
    return NextResponse.json({ error: 'This request did not come from BLACKOUTZ.' }, { status: 403 });
  }

  const response = NextResponse.json({ linked: false });
  response.cookies.set(DISCORD_SESSION_COOKIE, '', { ...discordCookieOptions(origin.startsWith('https:')), maxAge: 0 });
  return response;
}

