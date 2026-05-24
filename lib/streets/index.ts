import { list, put } from '@vercel/blob';
import { cityToSlug } from '@/lib/cities';
import * as locateDiTriulzi from './locate-di-triulzi';
import * as opera from './opera';
import * as pieveEmanuele from './pieve-emanuele';
import * as fizzonasco from './fizzonasco';
import * as tolcinasco from './tolcinasco';
import * as siziano from './siziano';
import * as carpiano from './carpiano';

type SeedModule = { streetPrices: Record<string, number>; defaultPrice: number };

const SEED_MAP: Record<string, SeedModule> = {
  'locate-di-triulzi': locateDiTriulzi,
  'opera': opera,
  'pieve-emanuele': pieveEmanuele,
  'fizzonasco': fizzonasco,
  'tolcinasco': tolcinasco,
  'siziano': siziano,
  'carpiano': carpiano,
};

/* ─── Cache in-memory per evitare chiamate ripetute al blob ─── */
const streetCache: Map<string, { data: Record<string, number>; expiry: number }> = new Map();
const CACHE_TTL = 1000 * 60 * 5; // 5 minuti

/** Extracts the street name from a Google Maps formatted address (first segment, lowercase). */
export function extractStreetName(formattedAddress: string): string {
  const parts = formattedAddress.split(',');
  return parts[0].trim().toLowerCase();
}

/** Extracts the civic number from a Google Maps formatted address (second segment if purely numeric). */
export function extractCivicNumber(formattedAddress: string): string | null {
  const parts = formattedAddress.split(',');
  if (parts.length < 2) return null;
  const segment = parts[1].trim();
  return /^\d+$/.test(segment) ? segment : null;
}

/**
 * Returns price/mq for a given street address and city.
 * Lookup priority: civic key ('via roma:15') > street key ('via roma') > seed defaultPrice > 2000 global default.
 * Uses a 5-minute in-memory cache per city; falls back to seed data if blob is unavailable.
 */
export async function getPriceForStreet(
  formattedAddress: string,
  city: string
): Promise<number> {
  const slug = cityToSlug(city);
  const seed = SEED_MAP[slug];
  const globalDefault = 2000;

  const streetName = extractStreetName(formattedAddress);
  const civicNumber = extractCivicNumber(formattedAddress);

  /* ─── Check cache ─── */
  const cached = streetCache.get(slug);
  if (cached && Date.now() < cached.expiry) {
    return lookupPrice(cached.data, streetName, civicNumber, seed, globalDefault);
  }

  /* ─── Load from blob ─── */
  try {
    const blobPath = `streets/${slug}.json`;
    const { blobs } = await list({ prefix: blobPath, limit: 1 });

    if (blobs.length > 0) {
      const response = await fetch(blobs[0].url, { cache: 'no-store' });
      if (response.ok) {
        const data: Record<string, number> = await response.json();
        streetCache.set(slug, { data, expiry: Date.now() + CACHE_TTL });
        return lookupPrice(data, streetName, civicNumber, seed, globalDefault);
      }
    }
  } catch {
    // fallback to seed
  }

  /* ─── Fallback to seed ─── */
  const seedData = seed?.streetPrices ?? {};
  streetCache.set(slug, { data: seedData, expiry: Date.now() + CACHE_TTL });
  return lookupPrice(seedData, streetName, civicNumber, seed, globalDefault);
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
