import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { products } from '../../../products';
import { fallbackIdentifiers, requiredCheckoutIdentifiers, resolveStorefrontProduct } from '../tip4serv';

export async function GET(request: NextRequest) {
  const productId = request.nextUrl.searchParams.get('productId')?.trim() || '';
  const apiKey = process.env.TIP4SERV_API_KEY;
  if (!apiKey) {
    const product = products.find((candidate) => candidate.id === productId);
    if (!product) return NextResponse.json({ error: 'Please select a valid product.' }, { status: 400 });
    return NextResponse.json({ identifiers: fallbackIdentifiers(product), source: 'fallback' });
  }

  try {
    const { product, storeId, tip4servProductId } = await resolveStorefrontProduct(apiKey, productId);
    const result = await requiredCheckoutIdentifiers(storeId, tip4servProductId, product);
    return NextResponse.json(result);
  } catch {
    const product = products.find((candidate) => candidate.id === productId);
    if (!product) return NextResponse.json({ error: 'Please select a valid product.' }, { status: 400 });
    return NextResponse.json({ identifiers: fallbackIdentifiers(product), source: 'fallback' });
  }
}
