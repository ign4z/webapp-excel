// Funzioni pure sull'indirizzo, usabili sia dal client (Form1) sia nei test

type AddressComponent = { long_name: string; types: string[] };

/**
 * Costruisce l'indirizzo canonico "Via Roma, 15" dai componenti di Google Places.
 * Il formato è quello atteso da extractStreetName/extractCivicNumber (lib/streets),
 * quindi il prezzo per civico continua a funzionare. Restituisce null se manca la via (route).
 */
export function buildCanonicalAddress(components: AddressComponent[]): string | null {
  const route = components.find((c) => c.types.includes('route'))?.long_name.trim();
  if (!route) return null;
  const streetNumber = components.find((c) => c.types.includes('street_number'))?.long_name.trim();
  return streetNumber ? `${route}, ${streetNumber}` : route;
}
