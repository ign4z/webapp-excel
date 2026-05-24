import { NextRequest, NextResponse } from 'next/server';
import { list, put } from '@vercel/blob';
import { ALLOWED_CITIES, cityToSlug } from '@/lib/cities';

const SUPPORTED_CITIES = ALLOWED_CITIES.map(cityToSlug);

function isAuthorized(request: NextRequest): boolean {
  const token = request.nextUrl.searchParams.get('token');
  return token === process.env.ADMIN_TOKEN;
}

function isCityValid(city: string): boolean {
  return /^[a-z0-9-]+$/.test(city) && SUPPORTED_CITIES.includes(city);
}

/* ─── GET /api/admin/streets?token=SECRET&city=locate-di-triulzi ─── */
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const city = request.nextUrl.searchParams.get('city') ?? '';
  if (!isCityValid(city)) {
    return NextResponse.json({ error: 'Città non supportata' }, { status: 400 });
  }

  try {
    const blobPath = `streets/${city}.json`;
    const { blobs } = await list({ prefix: blobPath, limit: 1 });

    if (blobs.length === 0) {
      const seed = await import(`@/lib/streets/${city}`);
      return NextResponse.json({ data: seed.streetPrices });
    }

    const response = await fetch(blobs[0].url, { cache: 'no-store' });
    const data = await response.json();
    return NextResponse.json({ data });
  } catch (error) {
    console.error('GET streets error:', error);
    return NextResponse.json({ error: 'Errore caricamento strade' }, { status: 500 });
  }
}

/* ─── POST /api/admin/streets?token=SECRET&city=locate-di-triulzi ─── */
export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const city = request.nextUrl.searchParams.get('city') ?? '';
  if (!isCityValid(city)) {
    return NextResponse.json({ error: 'Città non supportata' }, { status: 400 });
  }

  try {
    const body = await request.json();

    if (typeof body !== 'object' || Array.isArray(body) || body === null) {
      return NextResponse.json({ error: 'Body non valido' }, { status: 400 });
    }

    const normalized: Record<string, number> = {};
    for (const [key, value] of Object.entries(body)) {
      if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) continue;
      normalized[key.toLowerCase().trim()] = value;
    }

    await put(`streets/${city}.json`, JSON.stringify(normalized, null, 2), {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN,
      allowOverwrite: true,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('POST streets error:', error);
    return NextResponse.json({ error: 'Errore salvataggio strade' }, { status: 500 });
  }
}
