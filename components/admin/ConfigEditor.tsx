'use client';

import { useState, useEffect } from 'react';
import { z } from 'zod';
import { ConfigEditorView } from './ConfigEditorView';
import rawDefaults from '@/lib/config.defaults.json';
import type { ValuationConfig } from '@/lib/config';

const configSchema = z.object({
  pricePerSqmByCity: z.record(z.string(), z.number().min(100).max(20000)),
  pricePerSqmDefault: z.number().min(100).max(20000),
  coefficienti: z.record(z.string(), z.record(z.string(), z.number().min(0.01).max(5))).optional(),
});

type ConfigType = ValuationConfig;

const defaultConfig: ConfigType = rawDefaults as ConfigType;

interface ConfigEditorProps {
  token: string;
}

export default function ConfigEditor({ token }: ConfigEditorProps) {
  const [config, setConfig] = useState<ConfigType>(defaultConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchConfig();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchConfig = async () => {
    try {
      const response = await fetch(`/api/admin/config?token=${token}`);
      if (response.ok) {
        const data = await response.json();
        setConfig({ ...defaultConfig, ...data.data });
      }
    } catch (error) {
      console.error('Error fetching config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      configSchema.parse(config);
      setSaving(true);
      setMessage('');

      const response = await fetch(`/api/admin/config?token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      if (response.ok) {
        setMessage('✅ Configurazione salvata con successo!');
        setTimeout(() => setMessage(''), 3000);
      } else {
        const data = await response.json();
        setMessage(`❌ ${data.error ?? 'Errore nel salvataggio'}`);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        setMessage('❌ Valori non validi: ' + error.issues.map(e => e.message).join(', '));
      } else {
        setMessage('❌ Errore del server');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setConfig(defaultConfig);
    setMessage('');
  };

  const handleCityPriceChange = (city: string, value: number) => {
    setConfig(prev => ({
      ...prev,
      pricePerSqmByCity: { ...prev.pricePerSqmByCity, [city]: value },
    }));
  };

  const handleDefaultPriceChange = (value: number) => {
    setConfig(prev => ({ ...prev, pricePerSqmDefault: value }));
  };

  const handleCoefficienteChange = (table: string, key: string, value: number) => {
    setConfig(prev => ({
      ...prev,
      coefficienti: {
        ...prev.coefficienti,
        [table]: {
          ...(prev.coefficienti[table as keyof typeof prev.coefficienti] as Record<string, number>),
          [key]: value,
        },
      },
    }));
  };

  const calculatePreview = (city: string) => {
    const sqm = 100;
    const pricePerSqm = config.pricePerSqmByCity[city] ?? config.pricePerSqmDefault;
    return Math.round(sqm * pricePerSqm);
  };

  return (
    <ConfigEditorView
      config={config}
      loading={loading}
      saving={saving}
      message={message}
      onCityPriceChange={handleCityPriceChange}
      onDefaultPriceChange={handleDefaultPriceChange}
      onCoefficienteChange={handleCoefficienteChange}
      onSave={handleSave}
      onReset={handleReset}
      calculatePreview={calculatePreview}
    />
  );
}
