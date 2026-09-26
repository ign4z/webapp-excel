'use client';

import { useEffect, useRef, useState } from 'react';
import { loadGoogleMaps, getCityBounds } from '@/lib/google-maps';
import { getRouteName, isInCity } from '@/lib/address';

interface StreetAutocompleteProps {
  /** Nome del comune come lo mostra Google (es. "Pieve Emanuele") */
  city: string;
  /** Chiamata con il nome ufficiale Google della via, in minuscolo (formato delle chiavi prezzi); '' se l'utente riscrive il testo */
  onSelect: (street: string) => void;
}

/**
 * Input con autocomplete Google Places limitato al comune: la via salvata è esattamente quella
 * che Google restituirà all'utente in Step 1, così il lookup prezzo combacia.
 */
export default function StreetAutocomplete({ city, onSelect }: StreetAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState('');
  // Ref aggiornato in un effect: il listener Google legge sempre l'ultima callback senza ricreare l'autocomplete
  const onSelectRef = useRef(onSelect);
  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);

  useEffect(() => {
    let active = true;
    let autocomplete: google.maps.places.Autocomplete | null = null;

    async function init() {
      try {
        await loadGoogleMaps();
      } catch {
        if (active) setError('Google Maps non disponibile: inserisci la via a mano nella tabella');
        return;
      }
      let bounds: google.maps.LatLngBounds | undefined;
      try {
        bounds = await getCityBounds(city);
      } catch {
        // Senza bounds l'autocomplete funziona comunque; il controllo sul comune resta in place_changed
      }
      if (!active || !inputRef.current) return;

      autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
        types: ['address'],
        componentRestrictions: { country: 'it' },
        fields: ['address_components'],
        ...(bounds ? { bounds, strictBounds: true } : {}),
      });
      autocomplete.addListener('place_changed', () => {
        const components = autocomplete?.getPlace().address_components;
        const route = components ? getRouteName(components) : null;
        if (!components || !route) {
          setError('Seleziona un indirizzo con un nome di via');
          return;
        }
        if (!isInCity(components, city)) {
          setError(`La via selezionata non è nel comune di ${city}`);
          return;
        }
        setError('');
        if (inputRef.current) inputRef.current.value = route;
        onSelectRef.current(route.toLowerCase());
      });
    }

    init();
    return () => {
      active = false;
      if (autocomplete) window.google.maps.event.clearInstanceListeners(autocomplete);
    };
  }, [city]);

  return (
    <div>
      <input
        ref={inputRef}
        type="text"
        placeholder={`Cerca una via di ${city}…`}
        onChange={() => { setError(''); onSelectRef.current(''); }}
        className="w-full px-2 py-1.5 bg-zinc-700 border border-zinc-600 text-zinc-200 rounded focus:ring-1 focus:ring-blue-600 focus:outline-none text-sm"
      />
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}
