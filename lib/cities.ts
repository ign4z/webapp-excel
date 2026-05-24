export const ALLOWED_CITIES: string[] = [
  'Locate di Triulzi',
  'Fizzonasco',
  'Opera',
  'Pieve Emanuele',
  'Tolcinasco',
  'Siziano',
  'Carpiano',
];

/** Converts a city name to a URL-safe slug (lowercase, spaces to hyphens). */
export function cityToSlug(city: string): string {
  return city.toLowerCase().replace(/\s+/g, '-');
}
