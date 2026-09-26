// lib/google-maps.ts
// Helper Google Maps lato client (autocomplete), condivisi tra Form1 e editor strade admin.
// La chiave pubblica è limitata per referrer: il geocoding lato server usa lib/google-geocode.ts con una chiave dedicata.

let loading: Promise<void> | null = null;

/** Carica lo script Google Maps (con Places) una sola volta; chiamate concorrenti condividono la stessa promise. */
export function loadGoogleMaps(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('Google Maps solo lato client'));
  if (window.google?.maps) return Promise.resolve();
  if (loading) return loading;

  loading = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_API_KEY}&libraries=places&language=it&region=IT`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      loading = null; // permette un nuovo tentativo
      script.remove();
      reject(new Error('Caricamento Google Maps fallito'));
    };
    document.head.appendChild(script);
  });
  return loading;
}

/** Bounding box del comune, per restringere i suggerimenti dell'autocomplete all'area corretta. */
export function getCityBounds(city: string): Promise<google.maps.LatLngBounds> {
  const geocoder = new window.google.maps.Geocoder();
  return new Promise((resolve, reject) => {
    geocoder.geocode({ address: city, region: 'it' }, (results, status) => {
      if (status !== 'OK' || !results?.[0]?.geometry?.viewport) {
        reject(new Error('Geocode failed'));
        return;
      }
      resolve(results[0].geometry.viewport);
    });
  });
}
