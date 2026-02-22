'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from '@/hooks/use-toast';
import { Step1View, Step1FormValues } from '@/components/valuation/Step1View';

const formSchema = z.object({
  firstName: z.string().min(2, 'Il nome deve essere di almeno 2 caratteri'),
  lastName: z.string().min(2, 'Il cognome deve essere di almeno 2 caratteri'),
  email: z.string().email('Inserisci un email valida'),
  phone: z.string().min(10, 'Inserisci un numero di telefono valido'),
  city: z.string().min(1, 'Seleziona un comune'),
  address: z.string().min(5, 'Inserisci un indirizzo valido'),
  squareMeters: z.number().min(10, 'Minimo 10 mq'),
});

export default function Form1() {
  const router = useRouter();

  const addressRef = useRef<HTMLInputElement | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const isFirstCityRender = useRef(true);

  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<Step1FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      city: '',
      address: '',
      squareMeters: 80,
    },
  });

  const selectedCity = form.watch('city');

  /* ─── RIPOPOLA DAL SESSION STORAGE (ritorno da step-2) ─── */
  useEffect(() => {
    const stored = sessionStorage.getItem('form1Data');
    if (!stored) return;
    try {
      form.reset(JSON.parse(stored));
    } catch {
      // sessionStorage corrotto, ignora
    }
  }, []);

  /* ─── LOAD GOOGLE SCRIPT ─── */
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

  /* ─── GET CITY BOUNDS ─── */
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

  /* ─── SETUP AUTOCOMPLETE ─── */
  useEffect(() => {
    if (!scriptLoaded || !selectedCity || !addressRef.current) return;

    if (isFirstCityRender.current) {
      isFirstCityRender.current = false;
    } else {
      form.setValue('address', '');
      form.clearErrors('address');
    }

    let active = true;

    async function init() {
      try {
        const bounds = await getCityBounds(selectedCity);
        if (!active || !addressRef.current) return;

        sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();

        if (autocompleteRef.current) {
          window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
        }

        autocompleteRef.current = new window.google.maps.places.Autocomplete(
          addressRef.current,
          { types: ['address'], componentRestrictions: { country: 'it' }, bounds, strictBounds: true }
        );
        autocompleteRef.current.setOptions({ sessionToken: sessionTokenRef.current });

        autocompleteRef.current.addListener('place_changed', () => {
          const place = autocompleteRef.current?.getPlace();
          if (!place?.address_components) {
            form.setError('address', { type: 'manual', message: 'Indirizzo non valido' });
            return;
          }

          const locality = place.address_components.find(
            (c) => c.types.includes('locality') || c.types.includes('administrative_area_level_3')
          );

          if (!locality || locality.long_name.toLowerCase() !== selectedCity.toLowerCase()) {
            form.setError('address', { type: 'manual', message: "L'indirizzo non appartiene al comune selezionato" });
            return;
          }

          form.clearErrors('address');
          form.setValue('address', place.formatted_address || '', { shouldValidate: true });
          sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
        });
      } catch {
        // bounds non disponibili, autocomplete senza restrizione geografica
      }
    }

    init();
    return () => { active = false; };
  }, [selectedCity, scriptLoaded]);

  /* ─── SUBMIT ─── */
  async function onSubmit(values: Step1FormValues) {
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

      sessionStorage.setItem('form1Data', JSON.stringify(values));
      sessionStorage.setItem('calculationResult', JSON.stringify(data.result));
      sessionStorage.setItem('sessionToken', data.sessionToken);

      toast({ title: 'Valutazione calcolata', description: 'Ti abbiamo inviato una email con i dettagli.' });
      setTimeout(() => router.push('/step-2'), 2500);
    } catch (error: any) {
      toast({ title: 'Errore', description: error.message ?? 'Errore sconosciuto', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Step1View
      form={form}
      addressRef={addressRef}
      isLoading={isLoading}
      onSubmit={form.handleSubmit(onSubmit)}
      onRecaptchaChange={setRecaptchaToken}
    />
  );
}