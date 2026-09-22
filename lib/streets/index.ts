import { readBlobJson, invalidateBlobJson } from '@/lib/blob-json-cache';
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

const blobPath = (slug: string) => `streets/${slug}.json`;

// La cache vive in lib/blob-json-cache.ts e si invalida da sola quando il blob cambia (uploadedAt).
// Questa funzione serve solo a rileggere subito sull'istanza che ha appena salvato.
export function invalidateStreetCache(slug?: string): void {
  invalidateBlobJson(slug ? blobPath(slug) : undefined);
  log.info('Street cache invalidated', { slug: slug ?? 'all' });
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

// Il civico è il secondo segmento se inizia con un numero: "15/A", "15 bis" → "15"
// (le chiavi civico nel blob sono solo numeriche, es. "via roma:15")
export function extractCivicNumber(formattedAddress: string): string | null {
  const parts = formattedAddress.split(',');
  if (parts.length < 2) return null;
  const match = parts[1].trim().match(/^(\d+)/);
  return match ? match[1] : null;
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

  let streetMap: Record<string, number> | null = null;
  try {
    streetMap = await readBlobJson<Record<string, number>>(blobPath(slug));
    if (!streetMap) log.warn('Streets blob not found, falling back to seed', { slug });
  } catch (err) {
    log.warn('Streets blob fetch error, falling back to seed', { slug, error: err instanceof Error ? err.message : err });
  }

  const price = lookupPrice(streetMap ?? seed?.streetPrices ?? {}, streetName, civicNumber, seed, globalDefault);
  log.debug('Price resolved', { slug, price, source: streetMap ? 'blob' : 'seed' });
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
