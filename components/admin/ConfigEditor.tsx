'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { toast } from '@/hooks/use-toast';

const configSchema = z.object({
  basePrice: z.number().min(0.01, 'Il prezzo base deve essere maggiore di 0'),
  multiplier: z.number().min(0.01, 'Il moltiplicatore deve essere maggiore di 0'),
  discountThreshold: z.number().min(0, 'La soglia sconto deve essere >= 0'),
  discountPercentage: z.number().min(0).max(100, 'La percentuale sconto deve essere tra 0 e 100'),
});

type ConfigValues = z.infer<typeof configSchema>;

interface ConfigEditorProps {
  token: string;
}

export default function ConfigEditor({ token }: ConfigEditorProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  const form = useForm<ConfigValues>({
    resolver: zodResolver(configSchema),
    defaultValues: {
      basePrice: 100,
      multiplier: 1.5,
      discountThreshold: 10,
      discountPercentage: 15,
    },
  });

  // Carica config corrente
  useEffect(() => {
    async function loadConfig() {
      try {
        const response = await fetch(`/api/admin/config?token=${token}`);
        const data = await response.json();

        if (response.ok && data.success) {
          form.reset(data.data);
          toast({
            title: '✅ Configurazione Caricata',
            description: 'Parametri correnti caricati con successo',
          });
        } else {
          throw new Error(data.error);
        }
      } catch (error: any) {
        toast({
          title: 'Errore',
          description: error.message,
          variant: 'destructive',
        });
      } finally {
        setIsFetching(false);
      }
    }

    loadConfig();
  }, [token, form]);

  async function onSubmit(values: ConfigValues) {
    setIsLoading(true);

    try {
      const response = await fetch(`/api/admin/config?token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Errore salvataggio configurazione');
      }

      toast({
        title: '✅ Configurazione Salvata',
        description: 'I parametri sono stati aggiornati con successo',
      });

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

  if (isFetching) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-600">Caricamento configurazione...</p>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>⚙️ Parametri di Calcolo</CardTitle>
        <CardDescription>
          Modifica i parametri che influenzano il calcolo dei preventivi
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            {/* Prezzo Base */}
            <FormField
              control={form.control}
              name="basePrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prezzo Base (€)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01" 
                      placeholder="100" 
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormDescription>
                    Prezzo unitario base per prodotto
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Moltiplicatore */}
            <FormField
              control={form.control}
              name="multiplier"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Moltiplicatore</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01" 
                      placeholder="1.5" 
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormDescription>
                    Il prezzo base viene moltiplicato per questo valore
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Soglia Sconto */}
            <FormField
              control={form.control}
              name="discountThreshold"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Soglia Sconto (quantità)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="10" 
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormDescription>
                    Lo sconto si applica a partire da questa quantità
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Percentuale Sconto */}
            <FormField
              control={form.control}
              name="discountPercentage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Percentuale Sconto (%)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01" 
                      placeholder="15" 
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormDescription>
                    Percentuale di sconto applicata quando si supera la soglia
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Preview Calcolo */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2">📊 Esempio Calcolo</h4>
              <p className="text-sm text-gray-700">
                Con 12 unità:
              </p>
              <ul className="text-sm text-gray-600 mt-2 space-y-1">
                <li>• Prezzo base: 12 × €{form.watch('basePrice')} = €{(12 * form.watch('basePrice')).toFixed(2)}</li>
                <li>• Con moltiplicatore: €{(12 * form.watch('basePrice') * form.watch('multiplier')).toFixed(2)}</li>
                <li>• Sconto ({form.watch('discountPercentage')}%): -€{(12 * form.watch('basePrice') * form.watch('multiplier') * form.watch('discountPercentage') / 100).toFixed(2)}</li>
                <li className="font-bold text-blue-700">
                  • Totale finale: €{(12 * form.watch('basePrice') * form.watch('multiplier') * (1 - form.watch('discountPercentage') / 100)).toFixed(2)}
                </li>
              </ul>
            </div>

            {/* Submit */}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Salvataggio...' : '💾 Salva Configurazione'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
