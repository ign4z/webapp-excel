'use client';

import { useState } from 'react';
import { ALLOWED_CITIES } from '@/lib/cities';
import type { ValuationConfig, ValuationCoefficientTables } from '@/lib/config';
import {
  TIPOLOGIA_LABELS, STATO_LABELS, CLASSE_ENERGETICA_LABELS, ANNO_COST_LABELS,
  PIANO_LABELS, LOCALI_LABELS, BAGNI_LABELS, ASCENSORE_LABELS, TERRAZZO_LABELS,
  GIARDINO_LABELS, GARAGE_LABELS, CANTINA_LABELS, RISCALDAMENTO_LABELS,
} from '@/lib/labels';

interface ConfigEditorViewProps {
  config: ValuationConfig;
  loading: boolean;
  saving: boolean;
  message: string;
  onCityPriceChange: (city: string, value: number) => void;
  onDefaultPriceChange: (value: number) => void;
  onCoefficienteChange: (table: string, key: string, value: number) => void;
  onSave: () => void;
  onReset: () => void;
  calculatePreview: (city: string) => number;
}

// ─── Label maps per ogni tabella coefficiente ────────────────────────────────

type CoeffSection = {
  key: keyof ValuationCoefficientTables;
  title: string;
  ref: string;
  labels: Record<string, string>;
};

const COEFF_SECTIONS: CoeffSection[] = [
  { key: 'tipologia', title: 'Tipologia Immobile', ref: 'Riferimento: Appartamento = 1,00', labels: TIPOLOGIA_LABELS },
  { key: 'stato', title: 'Stato Immobile', ref: 'Riferimento: Buono = 1,00', labels: STATO_LABELS },
  { key: 'classeEnergetica', title: 'Classe Energetica', ref: 'Riferimento: D = 1,00', labels: CLASSE_ENERGETICA_LABELS },
  { key: 'annoCostruzione', title: 'Anno di Costruzione', ref: 'Riferimento: 1981–2000 = 1,00', labels: ANNO_COST_LABELS },
  {
    key: 'pianoSenzaAscensore', title: 'Piano (Senza Ascensore)', ref: 'Riferimento: 1° Piano = 1,00',
    labels: { interrato: PIANO_LABELS.interrato, seminterrato: PIANO_LABELS.seminterrato, pianoTerra: PIANO_LABELS.pianoTerra, rialzato: PIANO_LABELS.rialzato, piano1: PIANO_LABELS.piano1, piano2: PIANO_LABELS.piano2, piano3: PIANO_LABELS.piano3, piano4: PIANO_LABELS.piano4, piano5: PIANO_LABELS.piano5, piano6Plus: PIANO_LABELS.piano6Plus },
  },
  {
    key: 'pianoConAscensore', title: 'Piano (Con Ascensore)', ref: 'Riferimento: 1° Piano = 1,00',
    labels: { pianoTerra: PIANO_LABELS.pianoTerra, piano1: PIANO_LABELS.piano1, piano2: PIANO_LABELS.piano2, piano3: PIANO_LABELS.piano3, piano4: PIANO_LABELS.piano4, piano5: PIANO_LABELS.piano5, piano6: PIANO_LABELS.piano6, piano7: PIANO_LABELS.piano7, piano8: PIANO_LABELS.piano8, piano9: PIANO_LABELS.piano9, piano10Plus: PIANO_LABELS.piano10Plus },
  },
  { key: 'locali', title: 'Numero Locali', ref: 'Riferimento: 3 locali = 1,00', labels: LOCALI_LABELS },
  { key: 'bagni', title: 'Numero Bagni', ref: 'Riferimento: 1 bagno = 1,00', labels: BAGNI_LABELS },
  { key: 'ascensore', title: 'Ascensore', ref: 'Riferimento: No = 1,00', labels: ASCENSORE_LABELS },
  { key: 'terrazzo', title: 'Terrazzo / Balcone', ref: 'Riferimento: Nessuno = 1,00', labels: TERRAZZO_LABELS },
  { key: 'giardino', title: 'Giardino', ref: 'Riferimento: Nessuno = 1,00', labels: GIARDINO_LABELS },
  { key: 'garage', title: 'Garage / Box', ref: 'Riferimento: Nessuno = 1,00', labels: GARAGE_LABELS },
  { key: 'cantina', title: 'Cantina', ref: 'Riferimento: No = 1,00', labels: CANTINA_LABELS },
  { key: 'riscaldamento', title: 'Riscaldamento', ref: 'Riferimento: Centralizzato contabilizzato = 1,00', labels: RISCALDAMENTO_LABELS },
];

// ─── Accordion component ─────────────────────────────────────────────────────

function Accordion({ title, ref: refLabel, children }: { title: string; ref: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-zinc-700 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 bg-zinc-800 hover:bg-zinc-700 transition-colors text-left"
      >
        <div>
          <span className="font-semibold text-zinc-200">{title}</span>
          <span className="ml-3 text-xs text-zinc-500 font-normal">{refLabel}</span>
        </div>
        <span className="text-zinc-500 text-lg">{open ? '▲' : '▼'}</span>
      </button>
      {open && <div className="p-5 bg-zinc-800 space-y-3">{children}</div>}
    </div>
  );
}

// ─── Main view ───────────────────────────────────────────────────────────────

export function ConfigEditorView({
  config,
  loading,
  saving,
  message,
  onCityPriceChange,
  onDefaultPriceChange,
  onCoefficienteChange,
  onSave,
  onReset,
  calculatePreview,
}: ConfigEditorViewProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-xl text-zinc-400">Caricamento...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Prezzi per comune */}
      <div className="bg-zinc-800 rounded-2xl border border-zinc-700 overflow-hidden">
        <div className="p-6 border-b border-zinc-700">
          <h2 className="text-lg font-bold text-zinc-200">Prezzi per Comune</h2>
          <p className="text-zinc-400 text-sm mt-1">
            Imposta il prezzo al mq per ogni comune. Il valore influenza direttamente la stima base.
          </p>
        </div>
        <div className="p-8 space-y-4">
          {ALLOWED_CITIES.map(city => (
            <div key={city} className="bg-zinc-800 rounded-xl p-5 border border-zinc-700">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="font-semibold text-zinc-200">{city}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Preview 100 mq: €{calculatePreview(city).toLocaleString('it-IT')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-zinc-400 text-sm">€/mq</span>
                  <input
                    type="number"
                    value={config.pricePerSqmByCity[city] ?? config.pricePerSqmDefault}
                    onChange={(e) => onCityPriceChange(city, parseFloat(e.target.value) || 0)}
                    className="w-28 px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-right font-bold text-zinc-200 focus:ring-2 focus:ring-red-700 focus:outline-none"
                    step={50} min={100} max={20000}
                  />
                </div>
              </div>
              <input
                type="range"
                value={config.pricePerSqmByCity[city] ?? config.pricePerSqmDefault}
                onChange={(e) => onCityPriceChange(city, parseFloat(e.target.value))}
                min={100} max={10000} step={50}
                className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-red-700"
              />
              <div className="flex justify-between text-xs text-zinc-500 mt-1">
                <span>€100</span><span>€10.000</span>
              </div>
            </div>
          ))}

          <div className="bg-zinc-800 rounded-xl p-5 border border-dashed border-zinc-600">
            <p className="text-sm font-semibold text-zinc-300 mb-3">Prezzo default (comuni non in lista)</p>
            <ConfigField
              label="€/mq default"
              value={config.pricePerSqmDefault}
              onChange={onDefaultPriceChange}
              min={100} max={10000} step={50}
            />
          </div>
        </div>
      </div>

      {/* Coefficienti Immobiliari */}
      <div className="bg-zinc-800 rounded-2xl border border-zinc-700 overflow-hidden">
        <div className="p-6 border-b border-zinc-700">
          <h2 className="text-lg font-bold text-zinc-200">Coefficienti Immobiliari</h2>
          <p className="text-zinc-400 text-sm mt-1">
            Modifica i moltiplicatori per ogni caratteristica. 1,00 = neutro, &gt;1,00 = premium, &lt;1,00 = sconto.
          </p>
        </div>
        <div className="p-6 space-y-3">
          {COEFF_SECTIONS.map(section => {
            const tableValues = config.coefficienti[section.key] as Record<string, number>;
            return (
              <Accordion key={section.key} title={section.title} ref={section.ref}>
                {Object.entries(section.labels).map(([k, label]) => (
                  <div key={k} className="flex items-center gap-4">
                    <span className="flex-1 text-sm text-zinc-300">{label}</span>
                    <input
                      type="number"
                      value={(tableValues[k] ?? 1.00).toFixed(2)}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value);
                        if (!isNaN(v)) onCoefficienteChange(section.key, k, v);
                      }}
                      className="w-24 px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-right text-sm font-mono text-zinc-200 focus:ring-2 focus:ring-red-700 focus:outline-none"
                      step={0.01} min={0.01} max={5.00}
                    />
                  </div>
                ))}
              </Accordion>
            );
          })}
        </div>
      </div>

      {/* Save / Reset */}
      <div className="bg-zinc-800 rounded-2xl border border-zinc-700 p-6 space-y-3">
        <button
          onClick={onSave}
          disabled={saving}
          className="w-full bg-gradient-to-r from-green-700 to-green-600 text-white font-bold py-4 px-6 rounded-xl hover:from-green-600 hover:to-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] active:scale-[0.98]"
        >
          {saving ? '💾 Salvataggio...' : '💾 Salva Configurazione'}
        </button>
        <button
          onClick={onReset}
          className="w-full bg-zinc-700 text-zinc-300 font-semibold py-2 px-6 rounded-xl hover:bg-zinc-600 transition text-sm"
        >
          ↩ Ripristina default
        </button>

        {message && (
          <div className={`p-4 rounded-lg text-center font-semibold ${
            message.includes('✅') ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'
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
    <div className="bg-zinc-800 rounded-xl p-5 border border-zinc-700">
      <div className="flex items-center justify-between mb-3">
        <label className="font-semibold text-zinc-200 text-lg">{label}</label>
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="w-28 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-right font-bold text-zinc-200 focus:ring-2 focus:ring-red-700 focus:outline-none"
          step={step} min={min} max={max}
        />
      </div>
      <input
        type="range"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        min={min} max={max} step={step}
        className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-red-700"
      />
      <div className="flex justify-between text-xs text-zinc-500 mt-1">
        <span>{min}</span><span>{max}</span>
      </div>
    </div>
  );
}
