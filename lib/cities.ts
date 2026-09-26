export const ALLOWED_CITIES: string[] = [
  'Locate di Triulzi',
  'Fizzonasco',
  'Opera',
  'Pieve Emanuele',
  'Tolcinasco',
  'Siziano',
  'Carpiano',
];

/** Case-insensitive check against ALLOWED_CITIES. */
export function isAllowedCity(city: string): boolean {
  return ALLOWED_CITIES.some((c) => c.toLowerCase() === city.toLowerCase());
}

/** Converts a city name to a URL-safe slug (lowercase, spaces to hyphens). */
export function cityToSlug(city: string): string {
  return city.toLowerCase().replace(/\s+/g, '-');
}

/**
 * Codice catastale (Belfiore) dei comuni, usato per estrarre vie e civici da ANNCSU (scripts/anncsu-extract.mjs).
 * Le frazioni (Fizzonasco, Tolcinasco) non hanno un codice proprio: in ANNCSU sono vie di Pieve Emanuele senza località.
 */
export const CITY_CADASTRAL_CODES: Record<string, string> = {
  'locate-di-triulzi': 'E639',
  'opera': 'G078',
  'pieve-emanuele': 'G634',
  'siziano': 'I739',
  'carpiano': 'B820',
};
