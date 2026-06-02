'use client';

import { ALLOWED_CITIES } from '@/lib/cities';
import type { ValuationConfig } from '@/lib/config';

interface ConfigEditorViewProps {
  config: ValuationConfig;
  saving: boolean;
  message: string;
  onCityPriceChange: (city: string, value: number) => void;
  onDefaultPriceChange: (value: number) => void;
  onCoefficienteChange: (table: string, key: string, value: number) => void;
  onSave: () => void;
  onReset: () => void;
  calculatePreview: (city: string) => number;
}

export function ConfigEditorView({
  config,
  saving,
  message,
  onCityPriceChange,
  onDefaultPriceChange,
  onSave,
  onReset,
  calculatePreview,
}: ConfigEditorViewProps) {
  return (
    <div className="space-y-6">
      {/* Prezzi per comune */}
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-800">Prezzi per Comune</h2>
          <p className="text-slate-500 text-sm mt-1">
            Imposta il prezzo al mq per ogni comune. Il valore influenza direttamente la stima base.
          </p>
        </div>
        <div className="p-8 space-y-4">
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
                    onChange={(e) => onCityPriceChange(city, parseFloat(e.target.value) || 0)}
                    className="w-28 px-3 py-2 border border-slate-300 rounded-lg text-right font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    step={50} min={100} max={20000}
                  />
                </div>
              </div>
              <input
                type="range"
                value={config.pricePerSqmByCity[city] ?? config.pricePerSqmDefault}
                onChange={(e) => onCityPriceChange(city, parseFloat(e.target.value))}
                min={100} max={10000} step={50}
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
              onChange={onDefaultPriceChange}
              min={100} max={10000} step={50}
            />
          </div>
        </div>
      </div>

      {/* Save / Reset */}
      <div className="bg-white rounded-2xl shadow-xl p-6 space-y-3">
        <button
          onClick={onSave}
          disabled={saving}
          className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white font-bold py-4 px-6 rounded-xl hover:from-green-600 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] active:scale-[0.98]"
        >
          {saving ? '💾 Salvataggio...' : '💾 Salva Configurazione'}
        </button>
        <button
          onClick={onReset}
          className="w-full bg-slate-100 text-slate-600 font-semibold py-2 px-6 rounded-xl hover:bg-slate-200 transition text-sm"
        >
          ↩ Ripristina default
        </button>

        {message && (
          <div className={`p-4 rounded-lg text-center font-semibold ${
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
          step={step} min={min} max={max}
        />
      </div>
      <input
        type="range"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        min={min} max={max} step={step}
        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
      />
      <div className="flex justify-between text-xs text-slate-500 mt-1">
        <span>{min}</span><span>{max}</span>
      </div>
    </div>
  );
}
