import { NextRequest, NextResponse } from 'next/server';
import { list, put } from '@vercel/blob';
import { ALLOWED_CITIES, cityToSlug } from '@/lib/cities';
import { invalidateStreetCache, getSeedStreetPrices } from '@/lib/streets';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/admin/streets');

const SUPPORTED_CITIES = ALLOWED_CITIES.map(cityToSlug);

function isAuthorized(request: NextRequest): boolean {
  const token = request.nextUrl.searchParams.get('token');
  return token === process.env.ADMIN_TOKEN;
}

// Regex separata dalla whitelist: blocca path traversal e slug malformati prima dell'includes()
function isCityValid(city: string): boolean {
  return /^[a-z0-9-]+$/.test(city) && SUPPORTED_CITIES.includes(city);
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    log.warn('Unauthorized GET streets attempt');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const city = request.nextUrl.searchParams.get('city') ?? '';
  if (!isCityValid(city)) {
    log.warn('GET streets: invalid city', { city });
    return NextResponse.json({ error: 'Città non supportata' }, { status: 400 });
  }

  log.debug('Admin streets GET', { city });
  try {
    const { blobs } = await list({ prefix: `streets/${city}.json`, limit: 1 });

    if (blobs.length === 0) {
      log.debug('Streets blob not found, returning seed data', { city });
      return NextResponse.json({ data: getSeedStreetPrices(city) });
    }

    const response = await fetch(blobs[0].url, { cache: 'no-store' });
    const data = await response.json();
    return NextResponse.json({ data });
  } catch (error) {
    log.error('Admin streets GET error', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Errore caricamento strade' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    log.warn('Unauthorized POST streets attempt');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const city = request.nextUrl.searchParams.get('city') ?? '';
  if (!isCityValid(city)) {
    log.warn('POST streets: invalid city', { city });
    return NextResponse.json({ error: 'Città non supportata' }, { status: 400 });
  }

  log.info('Admin streets POST', { city });
  try {
    const body = await request.json();

    if (typeof body !== 'object' || Array.isArray(body) || body === null) {
      return NextResponse.json({ error: 'Body deve essere un oggetto' }, { status: 400 });
    }

    const entries = Object.entries(body);
    if (entries.length > 1000) {
      return NextResponse.json({ error: 'Troppi elementi: max 1000 chiavi' }, { status: 400 });
    }

    // Normalizza le chiavi (lowercase + trim) e valida i prezzi prima di scrivere sul blob
    const normalized: Record<string, number> = {};
    for (const [key, value] of entries) {
      if (key.length > 150) {
        return NextResponse.json({ error: `Chiave troppo lunga: "${key.slice(0, 30)}..."` }, { status: 400 });
      }
      if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
        return NextResponse.json({ error: `Valore non valido per chiave "${key}": deve essere un numero positivo finito` }, { status: 400 });
      }
      normalized[key.toLowerCase().trim()] = value;
    }

    await put(`streets/${city}.json`, JSON.stringify(normalized, null, 2), {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN,
      allowOverwrite: true,
    });

    invalidateStreetCache(city);
    log.info('Streets saved and cache invalidated', { city, entries: Object.keys(normalized).length });

    return NextResponse.json({ success: true });
  } catch (error) {
    log.error('Admin streets POST error', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Errore salvataggio strade' }, { status: 500 });
  }
}
