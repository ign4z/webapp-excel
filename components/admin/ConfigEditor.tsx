'use client';

import { useState, useEffect } from 'react';
import { z } from 'zod';
import { ALLOWED_CITIES } from '@/lib/cities';

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
  const [activeTab, setActiveTab] = useState<'cities' | 'features' | 'exposure' | 'heating'>('cities');

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

  const updateValue = (key: keyof Omit<ConfigType, 'pricePerSqmByCity'>, value: number) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const updateCityPrice = (city: string, value: number) => {
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

  const tabs = [
    { key: 'cities', label: '🏙️ Prezzi per Comune' },
    { key: 'features', label: '✨ Caratteristiche' },
    { key: 'exposure', label: '🧭 Esposizione' },
    { key: 'heating', label: '🔥 Riscaldamento' },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="flex border-b border-slate-200 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-4 px-4 font-semibold text-sm transition-colors whitespace-nowrap ${
                activeTab === tab.key
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-8">
          {/* Tab: Comuni */}
          {activeTab === 'cities' && (
            <div className="space-y-4">
              <p className="text-slate-500 text-sm mb-6">
                Imposta il prezzo al mq per ogni comune. Il valore influenza direttamente la stima base.
              </p>

              {ALLOWED_CITIES.map(city => (
                <div key={city} className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-semibold text-slate-700">{city}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Preview 100 mq: €{calculatePreview(city).toLocaleString('it-IT')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 text-sm">€/mq</span>
                      <input
                        type="number"
                        value={config.pricePerSqmByCity[city] ?? config.pricePerSqmDefault}
                        onChange={(e) => updateCityPrice(city, parseFloat(e.target.value) || 0)}
                        className="w-28 px-3 py-2 border border-slate-300 rounded-lg text-right font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        step={50}
                        min={100}
                        max={20000}
                      />
                    </div>
                  </div>
                  <input
                    type="range"
                    value={config.pricePerSqmByCity[city] ?? config.pricePerSqmDefault}
                    onChange={(e) => updateCityPrice(city, parseFloat(e.target.value))}
                    min={100}
                    max={10000}
                    step={50}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                  <div className="flex justify-between text-xs text-slate-400 mt-1">
                    <span>€100</span><span>€10.000</span>
                  </div>
                </div>
              ))}

              <div className="bg-slate-50 rounded-xl p-5 border border-dashed border-slate-300">
                <p className="text-sm font-semibold text-slate-600 mb-3">Prezzo default (comuni non in lista)</p>
                <ConfigField
                  label="€/mq default"
                  value={config.pricePerSqmDefault}
                  onChange={(v) => updateValue('pricePerSqmDefault', v)}
                  min={100}
                  max={10000}
                  step={50}
                />
              </div>

              <ConfigField
                label="📉 Svalutazione annuale (%)"
                value={config.depreciation}
                onChange={(v) => updateValue('depreciation', v)}
                min={0}
                max={5}
                step={0.1}
              />
            </div>
          )}

          {/* Tab: Caratteristiche */}
          {activeTab === 'features' && (
            <div className="space-y-6">
              <ConfigField label="🚿 Secondo bagno (%)" value={config.secondBathroom} onChange={(v) => updateValue('secondBathroom', v)} min={-10} max={20} step={0.5} />
              <ConfigField label="🏚️ Cantina (%)" value={config.cellar} onChange={(v) => updateValue('cellar', v)} min={-10} max={20} step={0.5} />
              <ConfigField label="🔨 Ristrutturato (%)" value={config.renovated} onChange={(v) => updateValue('renovated', v)} min={-10} max={30} step={0.5} />
              <ConfigField label="⬇️ Piano terra (%)" value={config.groundFloor} onChange={(v) => updateValue('groundFloor', v)} min={-20} max={10} step={0.5} />
              <ConfigField label="⬆️ Ultimo piano (%)" value={config.topFloor} onChange={(v) => updateValue('topFloor', v)} min={-20} max={10} step={0.5} />
            </div>
          )}

          {/* Tab: Esposizione */}
          {activeTab === 'exposure' && (
            <div className="space-y-6">
              <ConfigField label="☀️ Sud (%)" value={config.exposureSouth} onChange={(v) => updateValue('exposureSouth', v)} min={-10} max={20} step={0.5} />
              <ConfigField label="🌅 Est (%)" value={config.exposureEast} onChange={(v) => updateValue('exposureEast', v)} min={-10} max={20} step={0.5} />
              <ConfigField label="🌇 Ovest (%)" value={config.exposureWest} onChange={(v) => updateValue('exposureWest', v)} min={-10} max={20} step={0.5} />
              <ConfigField label="❄️ Nord (%)" value={config.exposureNorth} onChange={(v) => updateValue('exposureNorth', v)} min={-20} max={10} step={0.5} />
            </div>
          )}

          {/* Tab: Riscaldamento */}
          {activeTab === 'heating' && (
            <div className="space-y-6">
              <ConfigField label="🔥 Autonomo (%)" value={config.heatingAutonomous} onChange={(v) => updateValue('heatingAutonomous', v)} min={-10} max={20} step={0.5} />
              <ConfigField label="🏢 Centralizzato (%)" value={config.heatingCentralized} onChange={(v) => updateValue('heatingCentralized', v)} min={-10} max={10} step={0.5} />
            </div>
          )}
        </div>
      </div>

      {/* Save */}
      <div className="bg-white rounded-2xl shadow-xl p-6">
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white font-bold py-4 px-6 rounded-xl hover:from-green-600 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] active:scale-[0.98]"
        >
          {saving ? '💾 Salvataggio...' : '💾 Salva Configurazione'}
        </button>

        {message && (
          <div className={`mt-4 p-4 rounded-lg text-center font-semibold ${
            message.includes('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
}

function ConfigField({
  label, value, onChange, min, max, step,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
}) {
  return (
    <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
      <div className="flex items-center justify-between mb-3">
        <label className="font-semibold text-slate-700 text-lg">{label}</label>
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="w-28 px-3 py-2 border border-slate-300 rounded-lg text-right font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          step={step}
          min={min}
          max={max}
        />
      </div>
      <input
        type="range"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        min={min}
        max={max}
        step={step}
        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
      />
      <div className="flex justify-between text-xs text-slate-500 mt-1">
        <span>{min}</span><span>{max}</span>
      </div>
    </div>
  );
}