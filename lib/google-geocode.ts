// lib/google-geocode.ts
// Geocoding Google lato server (API REST) per allineare i nomi via a quelli ufficiali di Google Maps.
// Richiede GOOGLE_MAPS_SERVER_KEY: la chiave pubblica NEXT_PUBLIC_GOOGLE_API_KEY è limitata per referrer
// e Google la rifiuta dal server (REQUEST_DENIED).

import { getRouteName, isInCity, type AddressComponent, type GoogleStreetMatch } from '@/lib/address';
import { createLogger } from '@/lib/logger';

const log = createLogger('lib/google-geocode');

const ENDPOINT = 'https://maps.googleapis.com/maps/api/geocode/json';
const MAX_RETRIES = 2;

/** Chiave server mancante o rifiutata da Google: errore di configurazione, non di un singolo indirizzo. */
export class GoogleConfigError extends Error {}

interface GeocodeResponse {
  status: string;
  error_message?: string;
  results: Array<{ address_components: AddressComponent[]; partial_match?: boolean }>;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ANNCSU scrive i numeri in lettere ("VIA VENTICINQUE APRILE"), Google usa i romani ("Via XXV Aprile")
const CARDINALS = ['uno', 'due', 'tre', 'quattro', 'cinque', 'sei', 'sette', 'otto', 'nove', 'dieci', 'undici', 'dodici',
  'tredici', 'quattordici', 'quindici', 'sedici', 'diciassette', 'diciotto', 'diciannove', 'venti', 'ventuno', 'ventidue',
  'ventitre', 'ventiquattro', 'venticinque', 'ventisei', 'ventisette', 'ventotto', 'ventinove', 'trenta', 'trentuno'];
const ORDINALS = ['primo', 'secondo', 'terzo', 'quarto', 'quinto', 'sesto', 'settimo', 'ottavo', 'nono', 'decimo',
  'undicesimo', 'dodicesimo', 'tredicesimo', 'quattordicesimo', 'quindicesimo', 'sedicesimo', 'diciassettesimo',
  'diciottesimo', 'diciannovesimo', 'ventesimo', 'ventunesimo', 'ventiduesimo', 'ventitreesimo'];

function toRoman(n: number): string {
  const table: [number, string][] = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  let out = '';
  for (const [value, symbol] of table) while (n >= value) { out += symbol; n -= value; }
  return out;
}

/** "VIA VENTICINQUE APRILE" → "VIA XXV APRILE"; null se il nome non contiene numeri in lettere. */
export function romanNumeralVariant(street: string): string | null {
  let changed = false;
  const out = street.split(/\s+/).map((word) => {
    const w = word.toLowerCase().replace(/'$/, '');
    const n = CARDINALS.indexOf(w) + 1 || ORDINALS.indexOf(w) + 1;
    if (!n) return word;
    changed = true;
    return toRoman(n);
  }).join(' ');
  return changed ? out : null;
}

/**
 * Cerca il nome ufficiale Google di una via del comune (es. "VIA GIOVANNI FALCONE" → "Via Giovanni Falcone").
 * Accetta solo risultati con una via (route) nel comune richiesto. Se il nome contiene numeri in lettere
 * e la prima ricerca non dà un match esatto, riprova con i numeri romani.
 */
export async function geocodeStreetName(street: string, city: string): Promise<GoogleStreetMatch> {
  const key = process.env.GOOGLE_MAPS_SERVER_KEY;
  if (!key) throw new GoogleConfigError('GOOGLE_MAPS_SERVER_KEY non configurata');

  const first = await geocodeQuery(street, city, key);
  const variant = romanNumeralVariant(street);
  if (!variant || (first.status === 'found' && !first.partial)) return first;
  const second = await geocodeQuery(variant, city, key);
  return second.status === 'found' && (first.status !== 'found' || !second.partial) ? second : first;
}

async function geocodeQuery(street: string, city: string, key: string): Promise<GoogleStreetMatch> {
  const params = new URLSearchParams({
    address: `${street}, ${city}, Italia`,
    components: 'country:IT',
    language: 'it',
    region: 'it',
    key,
  });

  for (let attempt = 0; ; attempt++) {
    let data: GeocodeResponse;
    try {
      const res = await fetch(`${ENDPOINT}?${params}`, { cache: 'no-store' });
      data = (await res.json()) as GeocodeResponse;
    } catch (err) {
      log.warn('Geocode network error', { street, city, error: err instanceof Error ? err.message : err });
      return { status: 'error' };
    }

    switch (data.status) {
      case 'OK': {
        const result = data.results.find((r) => getRouteName(r.address_components) && isInCity(r.address_components, city));
        if (!result) return { status: 'not_found' };
        return { status: 'found', route: getRouteName(result.address_components)!, partial: result.partial_match === true };
      }
      case 'ZERO_RESULTS':
        return { status: 'not_found' };
      case 'OVER_QUERY_LIMIT':
        if (attempt < MAX_RETRIES) {
          await sleep(1000 * (attempt + 1));
          continue;
        }
        return { status: 'error' };
      case 'REQUEST_DENIED':
        throw new GoogleConfigError(data.error_message ?? 'Richiesta rifiutata da Google (REQUEST_DENIED)');
      default:
        log.warn('Geocode unexpected status', { street, city, status: data.status });
        return { status: 'error' };
    }
  }
}

/** Geocoding di più vie con al massimo `concurrency` richieste in parallelo; l'ordine del risultato segue l'input. */
export async function geocodeStreetNames(streets: string[], city: string, concurrency = 8): Promise<GoogleStreetMatch[]> {
  const results: GoogleStreetMatch[] = new Array(streets.length);
  let next = 0;
  async function worker() {
    while (next < streets.length) {
      const i = next++;
      results[i] = await geocodeStreetName(streets[i], city);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, streets.length) }, worker));
  return results;
}
