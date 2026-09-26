import { NextRequest, NextResponse } from 'next/server';
import { ALLOWED_CITIES, cityToSlug } from '@/lib/cities';
import { getStreetOptions } from '@/lib/streets/options';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/streets');

/**
 * Vie selezionabili nello Step 1 per il comune indicato (`?city=Opera`). Pubblica: restituisce solo
 * nomi e civici, mai i prezzi (calcolati esclusivamente in form-1/form-2).
 */
export async function GET(request: NextRequest) {
  const city = request.nextUrl.searchParams.get('city') ?? '';
  const cityName = ALLOWED_CITIES.find((c) => c.toLowerCase() === city.toLowerCase());
  if (!cityName) {
    return NextResponse.json({ error: 'Comune non supportato' }, { status: 400 });
  }

  try {
    const streets = await getStreetOptions(cityToSlug(cityName));
    return NextResponse.json(
      { city: cityName, streets },
      // La lista cambia solo quando l'admin salva: qualche minuto di cache CDN va bene
      { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } },
    );
  } catch (error) {
    log.error('Streets list error', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Errore caricamento vie' }, { status: 500 });
  }
}
