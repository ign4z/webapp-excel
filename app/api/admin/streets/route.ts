import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { readBlobJson, writeBlobJson } from '@/lib/blob-json-cache';
import { ALLOWED_CITIES, cityToSlug } from '@/lib/cities';
import { invalidateStreetCache, getSeedStreetPrices } from '@/lib/streets';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/admin/streets');

const SUPPORTED_CITIES = ALLOWED_CITIES.map(cityToSlug);

// Regex separata dalla whitelist: blocca path traversal e slug malformati prima dell'includes()
function isCityValid(city: string): boolean {
  return /^[a-z0-9-]+$/.test(city) && SUPPORTED_CITIES.includes(city);
}

export async function GET(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) {
    log.warn('Unauthorized GET streets attempt');
    return denied;
  }

  const city = request.nextUrl.searchParams.get('city') ?? '';
  if (!isCityValid(city)) {
    log.warn('GET streets: invalid city', { city });
    return NextResponse.json({ error: 'Città non supportata' }, { status: 400 });
  }

  log.debug('Admin streets GET', { city });
  try {
    const data = await readBlobJson<Record<string, number>>(`streets/${city}.json`);
    if (!data) {
      log.debug('Streets blob not found, returning seed data', { city });
      return NextResponse.json({ data: getSeedStreetPrices(city) });
    }

    return NextResponse.json({ data });
  } catch (error) {
    log.error('Admin streets GET error', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Errore caricamento strade' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) {
    log.warn('Unauthorized POST streets attempt');
    return denied;
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

    await writeBlobJson(`streets/${city}.json`, normalized);

    invalidateStreetCache(city);
    log.info('Streets saved and cache invalidated', { city, entries: Object.keys(normalized).length });

    return NextResponse.json({ success: true });
  } catch (error) {
    log.error('Admin streets POST error', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Errore salvataggio strade' }, { status: 500 });
  }
}
