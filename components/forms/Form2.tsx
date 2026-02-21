'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import ReCAPTCHA from 'react-google-recaptcha';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toast } from '@/hooks/use-toast';

const formSchema = z.object({
  company: z.string().min(2, 'Il nome azienda deve essere di almeno 2 caratteri'),
  address: z.string().min(5, 'Inserisci un indirizzo valido'),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function Form2Component() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const [form1Data, setForm1Data] = useState<any>(null);
  const [calculationResult, setCalculationResult] = useState<any>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [excelUrl, setExcelUrl] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      company: '',
      address: '',
      notes: '',
    },
  });

  // Carica dati dal sessionStorage
  useEffect(() => {
    const storedForm1 = sessionStorage.getItem('form1Data');
    const storedResult = sessionStorage.getItem('calculationResult');
    const storedToken = sessionStorage.getItem('sessionToken');

    if (!storedForm1 || !storedResult || !storedToken) {
      toast({
        title: 'Errore',
        description: 'Dati del primo form mancanti. Ricompila il form.',
        variant: 'destructive',
      });
      router.push('/');
      return;
    }

    setForm1Data(JSON.parse(storedForm1));
    setCalculationResult(JSON.parse(storedResult));
    setSessionToken(storedToken);
  }, [router]);

  async function onSubmit(values: FormValues) {
    if (!recaptchaToken) {
      toast({
        title: 'Errore',
        description: 'Completa la verifica reCAPTCHA',
        variant: 'destructive',
      });
      return;
    }

    if (!form1Data || !calculationResult || !sessionToken) {
      toast({
        title: 'Errore',
        description: 'Dati della sessione mancanti',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/form-2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          sessionToken,
          form1Data,
          calculationResult,
          recaptchaToken,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Errore durante l\'invio');
      }

      // Mostra URL Excel
      setExcelUrl(data.data.excelUrl);

      toast({
        title: '✅ Ordine Completato!',
        description: 'Ti abbiamo inviato una email con il riepilogo Excel.',
      });

      // Pulisci sessionStorage
      sessionStorage.removeItem('form1Data');
      sessionStorage.removeItem('calculationResult');
      sessionStorage.removeItem('sessionToken');

    } catch (error: any) {
      toast({
        title: 'Errore',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }

  if (!form1Data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Caricamento...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-teal-100 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Completa il tuo Ordine
          </h1>
          <p className="text-lg text-gray-600">
            Ultimo passo: inserisci i dati aziendali
          </p>
        </div>

        {/* Riepilogo Preventivo */}
        <Card className="shadow-lg mb-6 bg-white border-green-200">
          <CardHeader className="bg-green-50">
            <CardTitle className="text-green-900">📊 Riepilogo Preventivo</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Nome:</p>
                <p className="font-semibold">{form1Data.name}</p>
              </div>
              <div>
                <p className="text-gray-600">Email:</p>
                <p className="font-semibold">{form1Data.email}</p>
              </div>
              <div>
                <p className="text-gray-600">Quantità:</p>
                <p className="font-semibold">{form1Data.quantity}</p>
              </div>
              <div>
                <p className="text-gray-600">Totale:</p>
                <p className="font-bold text-green-600 text-xl">
                  €{calculationResult.finalPrice.toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Form Dati Aziendali */}
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle>Dati Aziendali</CardTitle>
            <CardDescription>
              Inserisci i dati della tua azienda per completare l'ordine
            </CardDescription>
          </CardHeader>

          <CardContent>
            {excelUrl ? (
              // Successo - Mostra link download
              <div className="text-center py-8">
                <div className="mb-6">
                  <div className="inline-block p-4 bg-green-100 rounded-full mb-4">
                    <svg className="w-16 h-16 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    Ordine Completato! 🎉
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Il tuo riepilogo è pronto. Abbiamo inviato una copia alla tua email.
                  </p>
                </div>

                <a
                  href={excelUrl}
                  download
                  className="inline-flex items-center px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                  </svg>
                  Scarica Riepilogo Excel
                </a>

                <div className="mt-8">
                  <Button
                    variant="outline"
                    onClick={() => router.push('/')}
                  >
                    ← Torna alla Home
                  </Button>
                </div>
              </div>
            ) : (
              // Form
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  
                  {/* Azienda */}
                  <FormField
                    control={form.control}
                    name="company"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome Azienda</FormLabel>
                        <FormControl>
                          <Input placeholder="Acme S.r.l." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Indirizzo */}
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Indirizzo</FormLabel>
                        <FormControl>
                          <Input placeholder="Via Roma 123, Milano" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Note */}
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Note (opzionale)</FormLabel>
                        <FormControl>
                          <Input placeholder="Eventuali note aggiuntive..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* reCAPTCHA */}
                  <div className="flex justify-center">
                    <ReCAPTCHA
                      sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || ''}
                      onChange={(token) => setRecaptchaToken(token)}
                    />
                  </div>

                  {/* Submit */}
                  <div className="flex gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => router.push('/')}
                      disabled={isLoading}
                    >
                      ← Indietro
                    </Button>
                    <Button type="submit" className="flex-1" disabled={isLoading}>
                      {isLoading ? 'Elaborazione in corso...' : 'Completa Ordine →'}
                    </Button>
                  </div>
                </form>
              </Form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
