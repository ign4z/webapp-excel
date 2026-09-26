// Funzioni pure sui componenti indirizzo di Google (admin: autocomplete vie e geocoding lato server)

export type AddressComponent = { long_name: string; types: string[] };

/** Esito della ricerca su Google del nome ufficiale di una via */
export type GoogleStreetMatch =
  | { status: 'found'; route: string; partial: boolean }
  | { status: 'not_found' }
  | { status: 'error' };

/**
 * Nome della via (componente `route`) dai componenti di Google Places/Geocoder, o null se assente.
 * Unico punto in cui si legge la via da Google: lo usano l'editor strade admin e lib/google-geocode.ts.
 */
export function getRouteName(components: AddressComponent[]): string | null {
  return components.find((c) => c.types.includes('route'))?.long_name.trim() || null;
}

/**
 * true se i componenti appartengono al comune indicato (confronto su locality o administrative_area_level_3,
 * senza distinzione di maiuscole). Serve a scartare indirizzi di comuni vicini restituiti da Google.
 */
export function isInCity(components: AddressComponent[], city: string): boolean {
  const locality = components.find(
    (c) => c.types.includes('locality') || c.types.includes('administrative_area_level_3')
  );
  return !!locality && locality.long_name.toLowerCase() === city.toLowerCase();
}
