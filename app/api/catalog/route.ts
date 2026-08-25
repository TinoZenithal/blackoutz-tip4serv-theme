import 'server-only';
import { NextResponse } from 'next/server';
import { products } from '../../products';
import { loadTip4ServCatalog } from '../tip4serv-catalog';

export async function GET() {
  const apiKey = process.env.TIP4SERV_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      source: 'fallback',
      store: { title: 'BLACKOUTZ STORE', currency: 'USD' },
      categories: [],
      products,
    }, { headers: { 'cache-control': 'no-store' } });
  }

  try {
    const catalog = await loadTip4ServCatalog(apiKey);
    return NextResponse.json({ source: 'tip4serv', ...catalog }, {
      headers: { 'cache-control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=600' },
    });
  } catch {
    return NextResponse.json({
      source: 'fallback',
      store: { title: 'BLACKOUTZ STORE', currency: 'USD' },
      categories: [],
      products,
    }, { headers: { 'cache-control': 'no-store' } });
  }
}

