'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useWatch, type FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { form1Schema } from '@/lib/schema';
import { composeAddress, splitAddress, findExactStreet, CIVIC_PATTERN, type StreetOption } from '@/lib/street-search';
import { toast } from '@/hooks/use-toast';
import { Step1View, Step1FormValues, type AddressFieldProps } from '@/components/valuation/Step1View';


export default function Form1() {
  const router = useRouter();

  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Indirizzo: via scelta dall'elenco del comune + civico separato; il campo `address` del form
  // ("Via, civico") è derivato da questi e resta il formato letto dal lookup prezzi lato server
  const [streets, setStreets] = useState<StreetOption[]>([]);
  const [streetsStatus, setStreetsStatus] = useState<AddressFieldProps['status']>('idle');
  const [streetText, setStreetText] = useState('');
  const [selectedStreet, setSelectedStreet] = useState<StreetOption | null>(null);
  const [civic, setCivic] = useState('');
  const [civicError, setCivicError] = useState<string>();
  // Comune delle vie caricate: al cambio comune si svuota l'indirizzo (non al primo caricamento/ripristino)
  const loadedCityRef = useRef<string | null>(null);
  // Via ripristinata da sessionStorage, da riagganciare all'elenco appena caricato
  const restoredStreetRef = useRef<string | null>(null);

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

  // Step 2 già scaricato quando arriva la risposta di form-1
  useEffect(() => {
    router.prefetch('/step-2');
  }, [router]);

  // Ripristina i campi se l'utente torna da step-2 usando il pulsante indietro
  useEffect(() => {
    const stored = sessionStorage.getItem('form1Data');
    if (!stored) return;
    try {
      const values = JSON.parse(stored) as Step1FormValues;
      form.reset(values);
      const restored = splitAddress(values.address ?? '');
      loadedCityRef.current = values.city;
      restoredStreetRef.current = restored.street;
      setStreetText(restored.street);
      setCivic(restored.civic);
    } catch {
      // sessionStorage corrotto, ignora
    }
  }, [form]);

  // Vie del comune selezionato (solo nomi e civici: i prezzi restano sul server)
  useEffect(() => {
    if (!selectedCity) return;
    const controller = new AbortController();
    const cityChanged = loadedCityRef.current !== null && loadedCityRef.current !== selectedCity;
    loadedCityRef.current = selectedCity;

    (async () => {
      setStreetsStatus('loading');
      if (cityChanged) {
        setStreetText('');
        setSelectedStreet(null);
        setCivic('');
        setCivicError(undefined);
        form.setValue('address', '');
        form.clearErrors('address');
      }
      try {
        const res = await fetch(`/api/streets?city=${encodeURIComponent(selectedCity)}`, { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const { streets: list } = (await res.json()) as { streets: StreetOption[] };
        setStreets(list);
        setStreetsStatus('ready');
        // Dopo un ripristino: riaggancia la via già scritta alla voce dell'elenco
        if (restoredStreetRef.current) {
          const match = findExactStreet(list, restoredStreetRef.current);
          restoredStreetRef.current = null;
          if (match) {
            setStreetText(match.label);
            setSelectedStreet(match);
          }
        }
      } catch {
        if (controller.signal.aborted) return;
        // Senza elenco si può comunque scrivere la via a mano (prezzo di default se non è in lista)
        setStreets([]);
        setStreetsStatus('error');
      }
    })();
    return () => controller.abort();
  }, [selectedCity, form]);

  /** Via da usare nell'indirizzo: quella scelta dall'elenco, o il testo libero se il comune non ha elenco */
  function streetForAddress(text: string, selected: StreetOption | null): string {
    return streets.length > 0 ? selected?.label ?? '' : text.trim();
  }

  function updateAddress(street: string, civicValue: string) {
    form.setValue('address', street ? composeAddress(street, civicValue) : '');
    if (street) form.clearErrors('address');
  }

  function handleStreetTextChange(text: string) {
    // Scrivere il nome esatto equivale a sceglierlo dall'elenco
    const exact = findExactStreet(streets, text);
    setStreetText(text);
    setSelectedStreet(exact);
    updateAddress(streetForAddress(text, exact), civic);
  }

  function handleSelectStreet(street: StreetOption) {
    setStreetText(street.label);
    setSelectedStreet(street);
    updateAddress(street.label, civic);
  }

  function handleCivicChange(value: string) {
    setCivic(value);
    setCivicError(undefined);
    updateAddress(streetForAddress(streetText, selectedStreet), value);
  }

  /** Messaggi chiari su via e civico (lo schema zod da solo direbbe solo "indirizzo non valido") */
  function checkAddress(): boolean {
    let ok = true;
    if (!streetForAddress(streetText, selectedStreet)) {
      form.setError('address', {
        type: 'manual',
        message: !selectedCity ? 'Seleziona prima il comune'
          : streets.length > 0 && streetText.trim() ? `Scegli una via di ${selectedCity} dall'elenco`
            : 'Inserisci la via',
      });
      ok = false;
    }
    if (civic.trim() && !CIVIC_PATTERN.test(civic.trim())) {
      setCivicError('Numero civico non valido (es. 15 o 15/A)');
      ok = false;
    }
    return ok;
  }

  async function onSubmit(values: Step1FormValues) {
    if (!checkAddress()) return;

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
      // isLoading resta attivo fino al cambio pagina: niente secondo invio nel frattempo
      router.push('/step-2');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Errore sconosciuto';
      toast({ title: 'Errore', description: message, variant: 'destructive' });
      setIsLoading(false);
    }
  }

  function onInvalid(errors: FieldErrors<Step1FormValues>) {
    if (errors.address) checkAddress();
  }

  return (
    <Step1View
      form={form}
      address={{
        streets,
        status: streetsStatus,
        streetText,
        selectedStreet,
        civic,
        civicError,
        onStreetTextChange: handleStreetTextChange,
        onSelectStreet: handleSelectStreet,
        onCivicChange: handleCivicChange,
      }}
      isLoading={isLoading}
      onSubmit={form.handleSubmit(onSubmit, onInvalid)}
      onRecaptchaChange={setRecaptchaToken}
    />
  );
}
