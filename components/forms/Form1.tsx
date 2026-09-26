'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { form1Schema } from '@/lib/schema';
import { buildCanonicalAddress } from '@/lib/address';
import { toast } from '@/hooks/use-toast';
import { Step1View, Step1FormValues } from '@/components/valuation/Step1View';


export default function Form1() {
  const router = useRouter();

  const addressRef = useRef<HTMLInputElement | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  // Il session token raggruppa le chiamate di autocomplete in un'unica sessione di fatturazione Google
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  // Evita di svuotare l'indirizzo al montaggio iniziale del componente (solo ai cambi di città successivi)
  const isFirstCityRender = useRef(true);
  // true solo dopo che l'utente ha selezionato un indirizzo dal dropdown Google — blocca submit se false
  const isAddressGeocodedRef = useRef(false);

  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<Step1FormValues>({
    resolver: zodResolver(form1Schema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      city: '',
      address: '',
      squareMeters: 100,
      tipologia: 'appartamento' as const,
      piano: 'piano1' as const,
      locali: 'locali3' as const,
      bagni: 'bagno1' as const,
    },
  });

  // useWatch (non form.watch()): con il React Compiler watch() non fa ri-renderizzare il componente
  const selectedCity = useWatch({ control: form.control, name: 'city' });

  // Ripristina i campi se l'utente torna da step-2 usando il pulsante indietro
  useEffect(() => {
    const stored = sessionStorage.getItem('form1Data');
    if (!stored) return;
    try {
      form.reset(JSON.parse(stored));
    } catch {
      // sessionStorage corrotto, ignora
    }
  }, [form]);

  // Carica lo script Google Maps una sola volta — riusa l'istanza se già presente (hot reload, navigazione)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.google) { setScriptLoaded(true); return; }
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_API_KEY}&libraries=places&language=it&region=IT`;
    script.async = true;
    script.defer = true;
    script.onload = () => setScriptLoaded(true);
    document.head.appendChild(script);
  }, []);

  // Recupera il bounding box del comune per restringere i suggerimenti all'area corretta
  function getCityBounds(city: string): Promise<google.maps.LatLngBounds> {
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

  // Ricrea l'istanza Autocomplete ogni volta che cambia la città, con bounds aggiornati
  useEffect(() => {
    if (!scriptLoaded || !selectedCity || !addressRef.current) return;

    if (isFirstCityRender.current) {
      isFirstCityRender.current = false;
    } else {
      // Cambio città esplicito: svuota l'indirizzo precedente e invalida il geocoding
      form.setValue('address', '');
      form.clearErrors('address');
      isAddressGeocodedRef.current = false;
    }

    // Flag per evitare aggiornamenti di stato su componente smontato (StrictMode / cambio rapido città)
    let active = true;

    async function init() {
      let bounds: google.maps.LatLngBounds | undefined;
      try {
        bounds = await getCityBounds(selectedCity);
      } catch {
        // Geocoding del comune fallito: procede senza restrizione geografica
      }

      if (!active || !addressRef.current) return;

      sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();

      if (autocompleteRef.current) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }

      const options: google.maps.places.AutocompleteOptions = {
        types: ['address'],
        componentRestrictions: { country: 'it' },
      };
      if (bounds) {
        options.bounds = bounds;
        options.strictBounds = true;
      }

      autocompleteRef.current = new window.google.maps.places.Autocomplete(
        addressRef.current,
        options
      );

      autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current?.getPlace();
        if (!place?.address_components) {
          form.setError('address', { type: 'manual', message: 'Indirizzo non valido' });
          return;
        }

        // Verifica che il comune dell'indirizzo selezionato corrisponda a quello scelto
        const locality = place.address_components.find(
          (c: google.maps.GeocoderAddressComponent) =>
            c.types.includes('locality') || c.types.includes('administrative_area_level_3')
        );
        if (!locality || locality.long_name.toLowerCase() !== selectedCity.toLowerCase()) {
          form.setError('address', { type: 'manual', message: "L'indirizzo non appartiene al comune selezionato" });
          return;
        }

        // Salva la via canonica di Google (+ civico): stesso formato letto dal lookup prezzi lato server
        const canonical = buildCanonicalAddress(place.address_components);
        if (!canonical) {
          form.setError('address', { type: 'manual', message: 'Seleziona un indirizzo con un nome di via' });
          return;
        }

        form.clearErrors('address');
        form.setValue('address', canonical, { shouldValidate: true });
        isAddressGeocodedRef.current = true;
        // Nuovo token per la sessione successiva (ogni selezione chiude la sessione corrente)
        sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
      });
    }

    // Se l'utente modifica il testo dopo aver già selezionato dal dropdown, invalida il geocoding.
    // Registrato qui (non in init) così il cleanup lo rimuove a ogni cambio città.
    const input = addressRef.current;
    const onInput = () => { isAddressGeocodedRef.current = false; };
    input.addEventListener('input', onInput);

    init();
    return () => {
      active = false;
      input.removeEventListener('input', onInput);
    };
  }, [selectedCity, scriptLoaded, form]);

  async function onSubmit(values: Step1FormValues) {
    // Blocca il submit se l'indirizzo non è stato selezionato dal dropdown Google
    if (!isAddressGeocodedRef.current) {
      form.setError('address', { type: 'manual', message: 'Seleziona un indirizzo dalla lista dei suggerimenti' });
      return;
    }

    if (!recaptchaToken) {
      toast({ title: 'Errore', description: 'Completa la verifica reCAPTCHA', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/form-1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, recaptchaToken }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      // Salva la versione normalizzata dal server: il sessionToken è firmato su questi dati esatti
      sessionStorage.setItem('form1Data', JSON.stringify(data.form1Data));
      sessionStorage.setItem('calculationResult', JSON.stringify(data.result));
      sessionStorage.setItem('sessionToken', data.sessionToken);

      toast({ title: 'Valutazione calcolata', description: 'Ti abbiamo inviato una email con i dettagli.' });
      setTimeout(() => router.push('/step-2'), 2500);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Errore sconosciuto';
      toast({ title: 'Errore', description: message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Step1View
      form={form}
      onAddressRef={(el) => { addressRef.current = el; }}
      isLoading={isLoading}
      onSubmit={form.handleSubmit(onSubmit)}
      onRecaptchaChange={setRecaptchaToken}
    />
  );
}
