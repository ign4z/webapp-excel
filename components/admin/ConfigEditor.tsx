'use client';

import { useState, useEffect } from 'react';
import { z } from 'zod';
import { ConfigEditorView } from './ConfigEditorView';

const configSchema = z.object({
  pricePerSqmByCity: z.record(z.string(), z.number().min(100).max(20000)),
  pricePerSqmDefault: z.number().min(100).max(20000),
  depreciation: z.number().min(0).max(5),
  secondBathroom: z.number().min(-10).max(20),
  cellar: z.number().min(-10).max(20),
  renovated: z.number().min(-10).max(30),
  groundFloor: z.number().min(-20).max(10),
  topFloor: z.number().min(-20).max(10),
  exposureSouth: z.number().min(-10).max(20),
  exposureEast: z.number().min(-10).max(20),
  exposureWest: z.number().min(-10).max(20),
  exposureNorth: z.number().min(-20).max(10),
  heatingAutonomous: z.number().min(-10).max(20),
  heatingCentralized: z.number().min(-10).max(10),
});

type ConfigType = z.infer<typeof configSchema>;
type TabKey = 'cities' | 'features' | 'exposure' | 'heating';

const defaultConfig: ConfigType = {
  pricePerSqmByCity: {
    'Locate di Triulzi': 2000,
    'Fizzonasco': 1750,
    'Opera': 1900,
    'Pieve Emanuele': 1850,
    'Tolcinasco': 1650,
    'Siziano': 1700,
    'Carpiano': 1600,
  },
  pricePerSqmDefault: 2500,
  depreciation: 0.3,
  secondBathroom: 3,
  cellar: 3,
  renovated: 10,
  groundFloor: -5,
  topFloor: -3,
  exposureSouth: 5,
  exposureEast: 3,
  exposureWest: 2,
  exposureNorth: -3,
  heatingAutonomous: 5,
  heatingCentralized: -2,
};

export default function ConfigEditor() {
  const [config, setConfig] = useState<ConfigType>(defaultConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState<TabKey>('cities');

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const token = new URLSearchParams(window.location.search).get('token');
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

      const token = new URLSearchParams(window.location.search).get('token');
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

  const handleFieldChange = (key: keyof Omit<ConfigType, 'pricePerSqmByCity'>, value: number) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleCityPriceChange = (city: string, value: number) => {
    setConfig(prev => ({
      ...prev,
      pricePerSqmByCity: { ...prev.pricePerSqmByCity, [city]: value },
    }));
  };

  const calculatePreview = (city: string) => {
    const sqm = 100;
    const pricePerSqm = config.pricePerSqmByCity[city] ?? config.pricePerSqmDefault;
    let v = sqm * pricePerSqm;
    v += v * (config.secondBathroom / 100);
    v += v * (config.exposureSouth / 100);
    v += v * (config.heatingAutonomous / 100);
    v -= v * ((config.depreciation * 20) / 100);
    return Math.round(v);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-xl text-slate-600">Caricamento...</div>
      </div>
    );
  }

  return (
    <ConfigEditorView
      config={config}
      saving={saving}
      message={message}
      activeTab={activeTab}
      onConfigChange={handleFieldChange}
      onCityPriceChange={handleCityPriceChange}
      onTabChange={setActiveTab}
      onSave={handleSave}
      onReset={handleReset}
      calculatePreview={calculatePreview}
    />
  );
}
