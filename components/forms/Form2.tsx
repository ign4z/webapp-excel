'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from '@/hooks/use-toast';
import { Step2View, Step2FormValues } from '@/components/valuation/Step2View';

const formSchema = z.object({
  stato: z.enum(['daRistrutturare', 'daRiattare', 'abitabile', 'buono', 'ottimo', 'ristrutturato', 'nuovo']),
  classeEnergetica: z.enum(['G', 'F', 'E', 'D', 'C', 'B', 'A1', 'A2', 'A3', 'A4']),
  annoCostruzione: z.enum(['prima1945', 'dal1945al1960', 'dal1961al1980', 'dal1981al2000', 'dal2001al2010', 'dal2011al2020', 'dal2021inPoi']),
  ascensore: z.enum(['no', 'si']),
  terrazzo: z.enum(['nessuno', 'balcone', 'balconiMultipli', 'terrazzoAbitabile', 'terrazzoPanoramico']),
  giardino: z.enum(['nessuno', 'piccolo', 'medio', 'grande', 'importante']),
  garage: z.enum(['nessuno', 'postoScoperto', 'postoCoperto', 'boxSingolo', 'boxDoppio']),
  cantina: z.enum(['no', 'si']),
  riscaldamento: z.enum(['assente', 'centralizzatoVecchio', 'centralizzatoContabilizzato', 'autonomo', 'autonomoCondensazione', 'pompaDiCalore', 'impiantoRadiante']),
  notes: z.string().max(500).optional(),
});

export default function Form2Component() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const [form1Data, setForm1Data] = useState<unknown>(null);
  const [calculationResult, setCalculationResult] = useState<unknown>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [finalResult, setFinalResult] = useState<unknown>(null);

  const form = useForm<Step2FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      stato: 'buono',
      classeEnergetica: 'D',
      annoCostruzione: 'dal1981al2000',
      ascensore: 'no',
      terrazzo: 'nessuno',
      giardino: 'nessuno',
      garage: 'nessuno',
      cantina: 'no',
      riscaldamento: 'centralizzatoContabilizzato',
      notes: '',
    },
  });

  /* ─── CARICA DATI DA SESSION STORAGE ─── */
  useEffect(() => {
    const storedForm1 = sessionStorage.getItem('form1Data');
    const storedResult = sessionStorage.getItem('calculationResult');
    const storedToken = sessionStorage.getItem('sessionToken');

    if (!storedForm1 || !storedResult || !storedToken) {
      toast({ title: 'Errore', description: 'Dati del primo form mancanti. Ricompila il form.', variant: 'destructive' });
      router.push('/');
      return;
    }

    setForm1Data(JSON.parse(storedForm1));
    setCalculationResult(JSON.parse(storedResult));
    setSessionToken(storedToken);

    const storedForm2 = sessionStorage.getItem('form2Data');
    if (storedForm2) {
      try { form.reset(JSON.parse(storedForm2)); } catch { /* corrotto */ }
    }
  }, [router]);

  /* ─── SUBMIT ─── */
  async function onSubmit(values: Step2FormValues) {
    if (!recaptchaToken) {
      toast({ title: 'Errore', description: 'Completa la verifica reCAPTCHA', variant: 'destructive' });
      return;
    }
    if (!form1Data || !calculationResult || !sessionToken) {
      toast({ title: 'Errore', description: 'Dati della sessione mancanti', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/form-2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, sessionToken, form1Data, calculationResult, recaptchaToken }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Errore durante l'invio");

      setFinalResult(data.finalValuation);

      toast({ title: '✅ Valutazione Completata!', description: 'La tua valutazione è stata elaborata con successo.' });

      sessionStorage.removeItem('form1Data');
      sessionStorage.removeItem('form2Data');
      sessionStorage.removeItem('calculationResult');
      sessionStorage.removeItem('sessionToken');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Errore sconosciuto';
      toast({ title: 'Errore', description: message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }

  /* ─── BACK ─── */
  function handleBack() {
    sessionStorage.setItem('form2Data', JSON.stringify(form.getValues()));
    router.push('/');
  }

  if (!form1Data) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#6B7280', fontFamily: 'Outfit, sans-serif' }}>Caricamento…</p>
      </div>
    );
  }

  return (
    <Step2View
      form={form}
      form1Data={form1Data as Parameters<typeof Step2View>[0]['form1Data']}
      calculationResult={calculationResult as Parameters<typeof Step2View>[0]['calculationResult']}
      isLoading={isLoading}
      finalResult={finalResult as Parameters<typeof Step2View>[0]['finalResult']}
      onSubmit={form.handleSubmit(onSubmit)}
      onBack={handleBack}
      onRecaptchaChange={setRecaptchaToken}
      onNewValuation={() => router.push('/')}
    />
  );
}
