'use client';

import { useState, useEffect } from 'react';
import { z } from 'zod';

const configSchema = z.object({
  pricePerSqm: z.number().min(100).max(10000),
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
  pricePerSqm: 2500,
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
  const [activeTab, setActiveTab] = useState<'base' | 'features' | 'exposure' | 'heating'>('base');

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
  try {
    const token = new URLSearchParams(window.location.search).get('token');
    const response = await fetch(`/api/admin/config?token=${token}`);

    if (response.ok) {
      const data = await response.json();

      // Merge sicuro: mai undefined
      setConfig({
        ...defaultConfig,
        ...data,
      });
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
        setMessage('❌ Errore nel salvataggio');
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

  const updateValue = (key: keyof ConfigType, value: number) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  // Preview calculation
  const calculatePreview = () => {
    const sqm = 100;
    const baseValue = sqm * config.pricePerSqm;
    let currentValue = baseValue;
    
    // Apply features
    currentValue += currentValue * (config.secondBathroom / 100);
    currentValue += currentValue * (config.cellar / 100);
    currentValue += currentValue * (config.renovated / 100);
    
    // Apply exposure (esempio: sud)
    currentValue += currentValue * (config.exposureSouth / 100);
    
    // Apply heating
    currentValue += currentValue * (config.heatingAutonomous / 100);
    
    // Depreciation (20 anni)
    const age = 20;
    currentValue -= currentValue * ((config.depreciation * age) / 100);
    
    return Math.round(currentValue);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-xl text-slate-600">Caricamento...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">
            ⚙️ Configurazione Parametri Valutazione
          </h1>
          <p className="text-slate-600">
            Modifica i parametri per il calcolo delle valutazioni immobiliari
          </p>
        </div>

        {/* Preview Card */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl shadow-xl p-6 mb-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm mb-1">Preview Calcolo (100 mq, ristrutturato, exp. sud, risc. aut., 20 anni)</p>
              <p className="text-4xl font-bold">€ {calculatePreview().toLocaleString('it-IT')}</p>
            </div>
            <div className="text-6xl">🏠</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="flex border-b border-slate-200">
            <button
              onClick={() => setActiveTab('base')}
              className={`flex-1 py-4 px-6 font-semibold transition-colors ${
                activeTab === 'base'
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              📊 Base
            </button>
            <button
              onClick={() => setActiveTab('features')}
              className={`flex-1 py-4 px-6 font-semibold transition-colors ${
                activeTab === 'features'
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              ✨ Caratteristiche
            </button>
            <button
              onClick={() => setActiveTab('exposure')}
              className={`flex-1 py-4 px-6 font-semibold transition-colors ${
                activeTab === 'exposure'
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              🧭 Esposizione
            </button>
            <button
              onClick={() => setActiveTab('heating')}
              className={`flex-1 py-4 px-6 font-semibold transition-colors ${
                activeTab === 'heating'
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              🔥 Riscaldamento
            </button>
          </div>

          <div className="p-8">
            {/* Tab: Base */}
            {activeTab === 'base' && (
              <div className="space-y-6">
                <ConfigField
                  label="💰 Prezzo al mq (€)"
                  value={config.pricePerSqm}
                  onChange={(v) => updateValue('pricePerSqm', v)}
                  min={100}
                  max={10000}
                  step={50}
                />
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

            {/* Tab: Features */}
            {activeTab === 'features' && (
              <div className="space-y-6">
                <ConfigField
                  label="🚿 Secondo bagno (%)"
                  value={config.secondBathroom}
                  onChange={(v) => updateValue('secondBathroom', v)}
                  min={-10}
                  max={20}
                  step={0.5}
                />
                <ConfigField
                  label="🏚️ Cantina (%)"
                  value={config.cellar}
                  onChange={(v) => updateValue('cellar', v)}
                  min={-10}
                  max={20}
                  step={0.5}
                />
                <ConfigField
                  label="🔨 Ristrutturato (%)"
                  value={config.renovated}
                  onChange={(v) => updateValue('renovated', v)}
                  min={-10}
                  max={30}
                  step={0.5}
                />
                <ConfigField
                  label="⬇️ Piano terra (%)"
                  value={config.groundFloor}
                  onChange={(v) => updateValue('groundFloor', v)}
                  min={-20}
                  max={10}
                  step={0.5}
                />
                <ConfigField
                  label="⬆️ Ultimo piano (%)"
                  value={config.topFloor}
                  onChange={(v) => updateValue('topFloor', v)}
                  min={-20}
                  max={10}
                  step={0.5}
                />
              </div>
            )}

            {/* Tab: Exposure */}
            {activeTab === 'exposure' && (
              <div className="space-y-6">
                <ConfigField
                  label="☀️ Esposizione Sud (%)"
                  value={config.exposureSouth}
                  onChange={(v) => updateValue('exposureSouth', v)}
                  min={-10}
                  max={20}
                  step={0.5}
                />
                <ConfigField
                  label="🌅 Esposizione Est (%)"
                  value={config.exposureEast}
                  onChange={(v) => updateValue('exposureEast', v)}
                  min={-10}
                  max={20}
                  step={0.5}
                />
                <ConfigField
                  label="🌇 Esposizione Ovest (%)"
                  value={config.exposureWest}
                  onChange={(v) => updateValue('exposureWest', v)}
                  min={-10}
                  max={20}
                  step={0.5}
                />
                <ConfigField
                  label="❄️ Esposizione Nord (%)"
                  value={config.exposureNorth}
                  onChange={(v) => updateValue('exposureNorth', v)}
                  min={-20}
                  max={10}
                  step={0.5}
                />
              </div>
            )}

            {/* Tab: Heating */}
            {activeTab === 'heating' && (
              <div className="space-y-6">
                <ConfigField
                  label="🔥 Riscaldamento Autonomo (%)"
                  value={config.heatingAutonomous}
                  onChange={(v) => updateValue('heatingAutonomous', v)}
                  min={-10}
                  max={20}
                  step={0.5}
                />
                <ConfigField
                  label="🏢 Riscaldamento Centralizzato (%)"
                  value={config.heatingCentralized}
                  onChange={(v) => updateValue('heatingCentralized', v)}
                  min={-10}
                  max={10}
                  step={0.5}
                />
              </div>
            )}
          </div>
        </div>

        {/* Save Button */}
        <div className="mt-6 bg-white rounded-2xl shadow-xl p-6">
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
    </div>
  );
}

// Component for individual fields
function ConfigField({
  label,
  value,
  onChange,
  min,
  max,
  step,
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
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}