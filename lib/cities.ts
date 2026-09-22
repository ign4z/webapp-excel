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
