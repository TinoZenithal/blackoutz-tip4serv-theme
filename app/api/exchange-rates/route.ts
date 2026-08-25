import 'server-only';
import { NextResponse } from 'next/server';

const targetCurrencies = ['AUD', 'GBP', 'EUR', 'CAD', 'NZD', 'JPY', 'SGD'] as const;

type RateResponse = {
  date?: unknown;
  rate?: unknown;
};

export async function GET() {
  try {
    const results = await Promise.all(targetCurrencies.map(async (currency) => {
      const response = await fetch(`https://api.frankfurter.dev/v2/rate/USD/${currency}`, {
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(8_000),
        cache: 'no-store',
      });
      if (!response.ok) throw new Error(`Rate request failed for ${currency}`);
      const body = await response.json() as RateResponse;
      if (typeof body.rate !== 'number' || !Number.isFinite(body.rate) || body.rate <= 0) throw new Error(`Invalid rate for ${currency}`);
      return { currency, rate: body.rate, date: typeof body.date === 'string' ? body.date : null };
    }));

    const rates: Record<string, number> = { USD: 1 };
    for (const result of results) rates[result.currency] = result.rate;

    return NextResponse.json({
      base: 'USD',
      rates,
      asOf: results.find((result) => result.date)?.date ?? null,
      unavailable: false,
    }, {
      headers: { 'cache-control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400' },
    });
  } catch {
    return NextResponse.json({ base: 'USD', rates: { USD: 1 }, asOf: null, unavailable: true }, {
      headers: { 'cache-control': 'no-store' },
    });
  }
}
