'use client';

import { useState } from 'react';
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
  name: z.string().min(2, 'Il nome deve essere di almeno 2 caratteri'),
  email: z.string().email('Inserisci un email valida'),
  phone: z.string().min(10, 'Inserisci un numero di telefono valido'),
  quantity: z.number().min(1, 'La quantità deve essere almeno 1'),
});

type FormValues = z.infer<typeof formSchema>;

export default function Form1Component() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      quantity: 1,
    },
  });

  async function onSubmit(values: FormValues) {
    if (!recaptchaToken) {
      toast({
        title: 'Errore',
        description: 'Completa la verifica reCAPTCHA',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/form-1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          recaptchaToken,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Errore durante l\'invio');
      }

      // Mostra risultato
      setResult(data.result);

      // Salva dati in sessionStorage per Form 2
      sessionStorage.setItem('form1Data', JSON.stringify(values));
      sessionStorage.setItem('calculationResult', JSON.stringify(data.result));
      sessionStorage.setItem('sessionToken', data.sessionToken);

      toast({
        title: '✅ Preventivo Calcolato!',
        description: 'Ti abbiamo inviato una email con i dettagli.',
      });

      // Redirect a Form 2 dopo 3 secondi
      setTimeout(() => {
        router.push('/step-2');
      }, 3000);

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Richiedi un Preventivo
          </h1>
          <p className="text-lg text-gray-600">
            Compila il form e ricevi subito il tuo preventivo personalizzato
          </p>
        </div>

        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle>Dati Personali</CardTitle>
            <CardDescription>
              Inserisci i tuoi dati per ricevere un preventivo immediato
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                
                {/* Nome */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Completo</FormLabel>
                      <FormControl>
                        <Input placeholder="Mario Rossi" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Email */}
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="mario@esempio.it" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Telefono */}
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefono</FormLabel>
                      <FormControl>
                        <Input placeholder="+39 123 456 7890" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Quantità */}

<FormField
  control={form.control}
  name="quantity"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Quantità</FormLabel>
      <FormControl>
        <Input 
          type="number" 
          min="1" 
          placeholder="10" 
          {...field}
          onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
        />
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

                {/* Risultato */}
                {result && (
                  <div className="bg-green-50 border-l-4 border-green-500 p-6 rounded-lg">
                    <h3 className="text-xl font-bold text-green-900 mb-4">
                      🎉 Il tuo preventivo
                    </h3>
                    <div className="space-y-2 text-gray-700">
                      <p>
                        <span className="font-semibold">Prezzo Base:</span> €{result.basePrice.toFixed(2)}
                      </p>
                      {result.discount > 0 && (
                        <p className="text-green-600 font-semibold">
                          <span>Sconto:</span> -€{result.discount.toFixed(2)}
                        </p>
                      )}
                      <p className="text-2xl font-bold text-green-700 mt-4">
                        Totale: €{result.finalPrice.toFixed(2)}
                      </p>
                      <p className="text-sm text-gray-600 mt-2">
                        {result.message}
                      </p>
                    </div>
                    <p className="text-sm text-gray-500 mt-4">
                      Reindirizzamento al passo successivo...
                    </p>
                  </div>
                )}

                {/* Submit */}
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Invio in corso...' : 'Calcola Preventivo →'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

