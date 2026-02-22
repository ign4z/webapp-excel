'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from '@/hooks/use-toast';
import { Step2View, Step2FormValues } from '@/components/valuation/Step2View';

const formSchema = z.object({
  floor: z.number().optional(),
  hasElevator: z.boolean().optional(),
  hasSecondBathroom: z.boolean().optional(),
  hasCellar: z.boolean().optional(),
  exposure: z.enum(['north', 'south', 'east', 'west', 'none']).optional(),
  heatingType: z.enum(['autonomous', 'centralized', 'none']).optional(),
  buildYear: z.number().optional(),
  isRecentlyRenovated: z.boolean().optional(),
  notes: z.string().optional(),
});

export default function Form2Component() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const [form1Data, setForm1Data] = useState<any>(null);
  const [calculationResult, setCalculationResult] = useState<any>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [finalResult, setFinalResult] = useState<any>(null);
  const [excelUrl, setExcelUrl] = useState<string | null>(null);

  const form = useForm<Step2FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      floor: undefined,
      hasElevator: false,
      hasSecondBathroom: false,
      hasCellar: false,
      exposure: 'none',
      heatingType: 'none',
      buildYear: undefined,
      isRecentlyRenovated: false,
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
      setExcelUrl(data.excelUrl);

      toast({ title: '✅ Valutazione Completata!', description: 'Ti abbiamo inviato una email con il report completo.' });

      sessionStorage.removeItem('form1Data');
      sessionStorage.removeItem('form2Data');
      sessionStorage.removeItem('calculationResult');
      sessionStorage.removeItem('sessionToken');
    } catch (error: any) {
      toast({ title: 'Errore', description: error.message, variant: 'destructive' });
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
      form1Data={form1Data}
      calculationResult={calculationResult}
      isLoading={isLoading}
      finalResult={finalResult}
      excelUrl={excelUrl}
      onSubmit={form.handleSubmit(onSubmit)}
      onBack={handleBack}
      onRecaptchaChange={setRecaptchaToken}
      onNewValuation={() => router.push('/')}
    />
  );
}