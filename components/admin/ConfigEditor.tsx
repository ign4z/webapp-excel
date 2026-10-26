'use client';

import { useState, useEffect } from 'react';
import { ConfigEditorView } from './ConfigEditorView';
import rawDefaults from '@/lib/config.defaults.json';
import type { ValuationConfig } from '@/lib/config';
import { adminFetch } from '@/components/admin/adminFetch';
import { configSchema } from '@/lib/schema';

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
      const response = await adminFetch(token, '/api/admin/config');
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
    const parsed = configSchema.safeParse(config);
    if (!parsed.success) {
      setMessage('❌ Valori non validi: ' + parsed.error.issues.map(e => e.message).join(', '));
      return;
    }
    try {
      setSaving(true);
      setMessage('');

      const response = await adminFetch(token, '/api/admin/config', {
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
    } catch {
      setMessage('❌ Errore del server');
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
