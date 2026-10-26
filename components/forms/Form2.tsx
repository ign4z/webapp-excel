'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { form2Schema } from '@/lib/schema';
import { Step2View, Step2FormValues } from '@/components/valuation/Step2View';
import { Spinner, tokens, submitErrorMessage } from '@/components/valuation/shared';


export default function Form2Component() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [form1Data, setForm1Data] = useState<unknown>(null);
  const [calculationResult, setCalculationResult] = useState<unknown>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [finalResult, setFinalResult] = useState<unknown>(null);

  const form = useForm<Step2FormValues>({
    resolver: zodResolver(form2Schema),
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
      // Step 2 aperto senza aver completato lo Step 1 (o sessione chiusa): si riparte dall'inizio
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
  }, [router, form]);

  /* ─── SUBMIT ─── */
  async function onSubmit(values: Step2FormValues) {
    // Senza site key (sviluppo) il widget non c'è: decide il server, che in produzione rifiuta
    if (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !captchaToken) {
      setSubmitError('Completa la verifica anti-bot qui sopra.');
      return;
    }
    if (!form1Data || !calculationResult || !sessionToken) {
      setSubmitError('Sessione scaduta: torna indietro e ricompila il primo step.');
      return;
    }

    setSubmitError(null);
    setIsLoading(true);
    try {
      const response = await fetch('/api/form-2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, sessionToken, form1Data, captchaToken: captchaToken ?? '' }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Errore durante l'invio");

      setFinalResult(data.finalValuation);

      sessionStorage.removeItem('form1Data');
      sessionStorage.removeItem('form2Data');
      sessionStorage.removeItem('calculationResult');
      sessionStorage.removeItem('sessionToken');
    } catch (error: unknown) {
      setSubmitError(submitErrorMessage(error));
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
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spinner size="1.75rem" color={tokens.gold} />
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
      onCaptchaChange={setCaptchaToken}
      submitError={submitError}
      onNewValuation={() => router.push('/')}
    />
  );
}
