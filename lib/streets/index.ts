import { list } from '@vercel/blob';
import { cityToSlug } from '@/lib/cities';
import { createLogger } from '@/lib/logger';

const log = createLogger('lib/streets');
import locateDiTriulzi from './locate-di-triulzi.json';
import opera from './opera.json';
import pieveEmanuele from './pieve-emanuele.json';
import fizzonasco from './fizzonasco.json';
import tolcinasco from './tolcinasco.json';
import siziano from './siziano.json';
import carpiano from './carpiano.json';

type SeedModule = { streetPrices: Record<string, number>; defaultPrice: number };

// Dati seed statici per ogni comune — usati come fallback se il blob non esiste ancora
const SEED_MAP: Record<string, SeedModule> = {
  'locate-di-triulzi': locateDiTriulzi,
  'opera': opera,
  'pieve-emanuele': pieveEmanuele,
  'fizzonasco': fizzonasco,
  'tolcinasco': tolcinasco,
  'siziano': siziano,
  'carpiano': carpiano,
};

// Cache in-memory senza TTL: caricata al primo accesso, invalidata manualmente
// dopo ogni salvataggio admin tramite invalidateStreetCache()
const streetCache: Map<string, Record<string, number>> = new Map();

// Esposta alle route admin per resettare la cache dopo un salvataggio
export function invalidateStreetCache(slug?: string): void {
  if (slug) {
    streetCache.delete(slug);
    log.info('Street cache invalidated', { slug });
  } else {
    streetCache.clear();
    log.info('Street cache cleared (all cities)');
  }
}

// Usata dalle route admin come fallback quando il blob non esiste ancora per una città
export function getSeedStreetPrices(slug: string): Record<string, number> {
  return SEED_MAP[slug]?.streetPrices ?? {};
}

// L'indirizzo da Google Maps ha il formato "Via Roma, 15, 20090 Opera MI, Italia"
// Il nome della via è sempre il primo segmento prima della prima virgola
export function extractStreetName(formattedAddress: string): string {
  return formattedAddress.split(',')[0].trim().toLowerCase();
}

// Il civico è il secondo segmento solo se è puramente numerico
// (alcuni indirizzi hanno suffissi tipo "15/A" che non vanno usati come chiave civico)
export function extractCivicNumber(formattedAddress: string): string | null {
  const parts = formattedAddress.split(',');
  if (parts.length < 2) return null;
  const segment = parts[1].trim();
  return /^\d+$/.test(segment) ? segment : null;
}

// Priorità lookup: "via roma:15" > "via roma" > defaultPrice del seed > 2000 globale
export async function getPriceForStreet(
  formattedAddress: string,
  city: string
): Promise<number> {
  const slug = cityToSlug(city);
  const seed = SEED_MAP[slug];
  const globalDefault = 2000;

  const streetName = extractStreetName(formattedAddress);
  const civicNumber = extractCivicNumber(formattedAddress);

  log.debug('Price lookup', { address: formattedAddress, city, slug });

  const cached = streetCache.get(slug);
  if (cached) {
    const price = lookupPrice(cached, streetName, civicNumber, seed, globalDefault);
    log.trace('Street cache hit', { slug, price });
    return price;
  }

  log.debug('Street cache miss, loading from blob', { slug });
  try {
    const { blobs } = await list({ prefix: `streets/${slug}.json`, limit: 1 });

    if (blobs.length > 0) {
      const response = await fetch(blobs[0].url, { cache: 'no-store' });
      if (response.ok) {
        const data: Record<string, number> = await response.json();
        streetCache.set(slug, data);
        const price = lookupPrice(data, streetName, civicNumber, seed, globalDefault);
        log.debug('Streets loaded from blob', { slug, price });
        return price;
      }
    }
    log.warn('Streets blob not found, falling back to seed', { slug });
  } catch (err) {
    log.warn('Streets blob fetch error, falling back to seed', { slug, error: err instanceof Error ? err.message : err });
  }

  const seedData = seed?.streetPrices ?? {};
  streetCache.set(slug, seedData);
  const price = lookupPrice(seedData, streetName, civicNumber, seed, globalDefault);
  log.debug('Using seed data', { slug, price });
  return price;
}

function lookupPrice(
  streetMap: Record<string, number>,
  streetName: string,
  civicNumber: string | null,
  seed: SeedModule | undefined,
  globalDefault: number
): number {
  if (civicNumber !== null) {
    const civicKey = `${streetName}:${civicNumber}`;
    if (civicKey in streetMap) return streetMap[civicKey];
  }
  if (streetName in streetMap) return streetMap[streetName];
  return seed?.defaultPrice ?? globalDefault;
}
