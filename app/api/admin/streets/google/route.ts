import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth';
import { ALLOWED_CITIES, cityToSlug } from '@/lib/cities';
import { geocodeStreetNames, GoogleConfigError } from '@/lib/google-geocode';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/admin/streets/google');

export const maxDuration = 60;

const bodySchema = z.object({
  city: z.string().regex(/^[a-z0-9-]+$/),
  streets: z.array(z.string().trim().min(1).max(150)).min(1).max(300),
});

/** Nome ufficiale Google per ciascuna via indicata ("Verifica con Google" dell'editor strade). */
export async function POST(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) {
    log.warn('Unauthorized google verify attempt');
    return denied;
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dati non validi', details: parsed.error.issues }, { status: 400 });
  }
  const { city, streets } = parsed.data;
  const cityName = ALLOWED_CITIES.find((c) => cityToSlug(c) === city);
  if (!cityName) {
    return NextResponse.json({ error: 'Città non supportata' }, { status: 400 });
  }

  try {
    const matches = await geocodeStreetNames(streets, cityName);
    log.info('Google verify complete', { city, streets: streets.length });
    return NextResponse.json({ results: streets.map((street, i) => ({ street, ...matches[i] })) });
  } catch (error) {
    if (error instanceof GoogleConfigError) {
      log.error('Google geocoding not configured', error.message);
      return NextResponse.json({ error: `Geocoding Google non disponibile: ${error.message}` }, { status: 503 });
    }
    log.error('Google verify error', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Errore verifica Google' }, { status: 500 });
  }
}
