'use client';

import { ALLOWED_CITIES } from '@/lib/cities';

type ConfigType = {
  pricePerSqmByCity: Record<string, number>;
  pricePerSqmDefault: number;
  depreciation: number;
  secondBathroom: number;
  cellar: number;
  renovated: number;
  groundFloor: number;
  topFloor: number;
  exposureSouth: number;
  exposureEast: number;
  exposureWest: number;
  exposureNorth: number;
  heatingAutonomous: number;
  heatingCentralized: number;
};

type TabKey = 'cities' | 'features' | 'exposure' | 'heating';

interface ConfigEditorViewProps {
  config: ConfigType;
  saving: boolean;
  message: string;
  activeTab: TabKey;
  onConfigChange: (field: keyof Omit<ConfigType, 'pricePerSqmByCity'>, value: number) => void;
  onCityPriceChange: (city: string, value: number) => void;
  onTabChange: (tab: TabKey) => void;
  onSave: () => void;
  onReset: () => void;
  calculatePreview: (city: string) => number;
}

const tabs = [
  { key: 'cities' as TabKey, label: '🏙️ Prezzi per Comune' },
  { key: 'features' as TabKey, label: '✨ Caratteristiche' },
  { key: 'exposure' as TabKey, label: '🧭 Esposizione' },
  { key: 'heating' as TabKey, label: '🔥 Riscaldamento' },
];

export function ConfigEditorView({
  config,
  saving,
  message,
  activeTab,
  onConfigChange,
  onCityPriceChange,
  onTabChange,
  onSave,
  onReset,
  calculatePreview,
}: ConfigEditorViewProps) {
  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="flex border-b border-slate-200 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
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
                  onChange={(v) => onConfigChange('pricePerSqmDefault', v)}
                  min={100} max={10000} step={50}
                />
              </div>

              <ConfigField
                label="📉 Svalutazione annuale (%)"
                value={config.depreciation}
                onChange={(v) => onConfigChange('depreciation', v)}
                min={0} max={5} step={0.1}
              />
            </div>
          )}

          {/* Tab: Caratteristiche */}
          {activeTab === 'features' && (
            <div className="space-y-6">
              <ConfigField label="🚿 Secondo bagno (%)" value={config.secondBathroom} onChange={(v) => onConfigChange('secondBathroom', v)} min={-10} max={20} step={0.5} />
              <ConfigField label="🏚️ Cantina (%)" value={config.cellar} onChange={(v) => onConfigChange('cellar', v)} min={-10} max={20} step={0.5} />
              <ConfigField label="🔨 Ristrutturato (%)" value={config.renovated} onChange={(v) => onConfigChange('renovated', v)} min={-10} max={30} step={0.5} />
              <ConfigField label="⬇️ Piano terra (%)" value={config.groundFloor} onChange={(v) => onConfigChange('groundFloor', v)} min={-20} max={10} step={0.5} />
              <ConfigField label="⬆️ Ultimo piano (%)" value={config.topFloor} onChange={(v) => onConfigChange('topFloor', v)} min={-20} max={10} step={0.5} />
            </div>
          )}

          {/* Tab: Esposizione */}
          {activeTab === 'exposure' && (
            <div className="space-y-6">
              <ConfigField label="☀️ Sud (%)" value={config.exposureSouth} onChange={(v) => onConfigChange('exposureSouth', v)} min={-10} max={20} step={0.5} />
              <ConfigField label="🌅 Est (%)" value={config.exposureEast} onChange={(v) => onConfigChange('exposureEast', v)} min={-10} max={20} step={0.5} />
              <ConfigField label="🌇 Ovest (%)" value={config.exposureWest} onChange={(v) => onConfigChange('exposureWest', v)} min={-10} max={20} step={0.5} />
              <ConfigField label="❄️ Nord (%)" value={config.exposureNorth} onChange={(v) => onConfigChange('exposureNorth', v)} min={-20} max={10} step={0.5} />
            </div>
          )}

          {/* Tab: Riscaldamento */}
          {activeTab === 'heating' && (
            <div className="space-y-6">
              <ConfigField label="🔥 Autonomo (%)" value={config.heatingAutonomous} onChange={(v) => onConfigChange('heatingAutonomous', v)} min={-10} max={20} step={0.5} />
              <ConfigField label="🏢 Centralizzato (%)" value={config.heatingCentralized} onChange={(v) => onConfigChange('heatingCentralized', v)} min={-10} max={10} step={0.5} />
            </div>
          )}
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
