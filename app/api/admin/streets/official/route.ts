import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { ALLOWED_CITIES, cityToSlug } from '@/lib/cities';
import { getCityDefaultPrice } from '@/lib/streets';
import { getOfficialStreets } from '@/lib/streets/anncsu';
import { geocodeStreetNames, GoogleConfigError } from '@/lib/google-geocode';
import type { OfficialStreetEntry } from '@/lib/street-import';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/admin/streets/official');

// ~120 vie per comune, 8 richieste Google in parallelo: pochi secondi, margine per i retry
export const maxDuration = 60;

/**
 * Vie ufficiali ANNCSU del comune con il nome Google già risolto e i civici,
 * più il prezzo di default del comune per le vie nuove.
 */
export async function GET(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) {
    log.warn('Unauthorized official streets attempt');
    return denied;
  }

  const city = request.nextUrl.searchParams.get('city') ?? '';
  const cityName = ALLOWED_CITIES.find((c) => cityToSlug(c) === city);
  if (!/^[a-z0-9-]+$/.test(city) || !cityName) {
    return NextResponse.json({ error: 'Città non supportata' }, { status: 400 });
  }

  const data = getOfficialStreets(city);
  if (!data) {
    return NextResponse.json({ error: `Dati ANNCSU non disponibili per ${cityName}` }, { status: 404 });
  }

  try {
    const names = Object.keys(data.streets);
    const matches = await geocodeStreetNames(names, cityName);
    const streets: OfficialStreetEntry[] = names.map((anncsu, i) => ({ anncsu, google: matches[i], civici: data.streets[anncsu] }));
    log.info('Official streets resolved', {
      city,
      streets: names.length,
      found: matches.filter((m) => m.status === 'found').length,
    });
    return NextResponse.json({ date: data.date, defaultPrice: getCityDefaultPrice(city), streets });
  } catch (error) {
    if (error instanceof GoogleConfigError) {
      log.error('Google geocoding not configured', error.message);
      return NextResponse.json({ error: `Geocoding Google non disponibile: ${error.message}` }, { status: 503 });
    }
    log.error('Official streets error', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Errore caricamento vie ufficiali' }, { status: 500 });
  }
}
