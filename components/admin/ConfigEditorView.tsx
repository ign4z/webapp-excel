'use client';

import { useState } from 'react';
import { ALLOWED_CITIES } from '@/lib/cities';
import type { ValuationConfig, ValuationCoefficientTables } from '@/lib/config';

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

// ─── Label maps per ogni tabella coefficiente ────────────────────────────────

type CoeffSection = {
  key: keyof ValuationCoefficientTables;
  title: string;
  ref: string;
  labels: Record<string, string>;
};

const COEFF_SECTIONS: CoeffSection[] = [
  {
    key: 'tipologia',
    title: 'Tipologia Immobile',
    ref: 'Riferimento: Appartamento = 1,00',
    labels: {
      appartamento: 'Appartamento', openspaceLoft: 'Open Space / Loft', mansarda: 'Mansarda',
      attico: 'Attico', villettaSchiera: 'Villetta a schiera', villa: 'Villa',
      rusticoCasale: 'Rustico / Casale', stabilePalazzo: 'Stabile / Palazzo',
    },
  },
  {
    key: 'stato',
    title: 'Stato Immobile',
    ref: 'Riferimento: Buono = 1,00',
    labels: {
      daRistrutturare: 'Da ristrutturare', daRiattare: 'Da riattare', abitabile: 'Abitabile',
      buono: 'Buono', ottimo: 'Ottimo', ristrutturato: 'Ristrutturato', nuovo: 'Nuovo',
    },
  },
  {
    key: 'classeEnergetica',
    title: 'Classe Energetica',
    ref: 'Riferimento: D = 1,00',
    labels: { G: 'G', F: 'F', E: 'E', D: 'D', C: 'C', B: 'B', A1: 'A1', A2: 'A2', A3: 'A3', A4: 'A4' },
  },
  {
    key: 'annoCostruzione',
    title: 'Anno di Costruzione',
    ref: 'Riferimento: 1981–2000 = 1,00',
    labels: {
      prima1945: 'Prima del 1945', dal1945al1960: '1945–1960', dal1961al1980: '1961–1980',
      dal1981al2000: '1981–2000', dal2001al2010: '2001–2010', dal2011al2020: '2011–2020',
      dal2021inPoi: '2021+',
    },
  },
  {
    key: 'pianoSenzaAscensore',
    title: 'Piano (Senza Ascensore)',
    ref: 'Riferimento: 1° Piano = 1,00',
    labels: {
      interrato: 'Interrato', seminterrato: 'Seminterrato', pianoTerra: 'Piano Terra',
      rialzato: 'Rialzato', piano1: '1° Piano', piano2: '2° Piano', piano3: '3° Piano',
      piano4: '4° Piano', piano5: '5° Piano', piano6Plus: '6° Piano e oltre',
    },
  },
  {
    key: 'pianoConAscensore',
    title: 'Piano (Con Ascensore)',
    ref: 'Riferimento: 1° Piano = 1,00',
    labels: {
      pianoTerra: 'Piano Terra', piano1: '1° Piano', piano2: '2° Piano', piano3: '3° Piano',
      piano4: '4° Piano', piano5: '5° Piano', piano6: '6° Piano', piano7: '7° Piano',
      piano8: '8° Piano', piano9: '9° Piano', piano10Plus: '10° Piano e oltre',
    },
  },
  {
    key: 'locali',
    title: 'Numero Locali',
    ref: 'Riferimento: 3 locali = 1,00',
    labels: {
      locale1: '1 locale', locali2: '2 locali', locali3: '3 locali', locali4: '4 locali',
      locali5: '5 locali', locali6: '6 locali', locali7Plus: '7+ locali',
    },
  },
  {
    key: 'bagni',
    title: 'Numero Bagni',
    ref: 'Riferimento: 1 bagno = 1,00',
    labels: {
      bagno1: '1 bagno', bagni2: '2 bagni', bagni3: '3 bagni', bagni4: '4 bagni', bagni5Plus: '5+ bagni',
    },
  },
  {
    key: 'ascensore',
    title: 'Ascensore',
    ref: 'Riferimento: No = 1,00',
    labels: { no: 'No', si: 'Sì' },
  },
  {
    key: 'terrazzo',
    title: 'Terrazzo / Balcone',
    ref: 'Riferimento: Nessuno = 1,00',
    labels: {
      nessuno: 'Nessuno', balcone: 'Balcone', balconiMultipli: 'Balconi multipli',
      terrazzoAbitabile: 'Terrazzo abitabile', terrazzoPanoramico: 'Terrazzo panoramico',
    },
  },
  {
    key: 'giardino',
    title: 'Giardino',
    ref: 'Riferimento: Nessuno = 1,00',
    labels: {
      nessuno: 'Nessuno', piccolo: 'Piccolo (<50 mq)', medio: 'Medio (50–150 mq)',
      grande: 'Grande (>150 mq)', importante: 'Giardino importante',
    },
  },
  {
    key: 'garage',
    title: 'Garage / Box',
    ref: 'Riferimento: Nessuno = 1,00',
    labels: {
      nessuno: 'Nessuno', postoScoperto: 'Posto auto scoperto', postoCoperto: 'Posto auto coperto',
      boxSingolo: 'Box singolo', boxDoppio: 'Box doppio',
    },
  },
  {
    key: 'cantina',
    title: 'Cantina',
    ref: 'Riferimento: No = 1,00',
    labels: { no: 'No', si: 'Sì' },
  },
  {
    key: 'riscaldamento',
    title: 'Riscaldamento',
    ref: 'Riferimento: Centralizzato contabilizzato = 1,00',
    labels: {
      assente: 'Assente', centralizzatoVecchio: 'Centralizzato (vecchio)',
      centralizzatoContabilizzato: 'Centralizzato contabilizzato', autonomo: 'Autonomo',
      autonomoCondensazione: 'Autonomo a condensazione', pompaDiCalore: 'Pompa di calore',
      impiantoRadiante: 'Impianto radiante/evoluto',
    },
  },
];

// ─── Accordion component ─────────────────────────────────────────────────────

function Accordion({ title, ref: refLabel, children }: { title: string; ref: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
      >
        <div>
          <span className="font-semibold text-slate-800">{title}</span>
          <span className="ml-3 text-xs text-slate-400 font-normal">{refLabel}</span>
        </div>
        <span className="text-slate-400 text-lg">{open ? '▲' : '▼'}</span>
      </button>
      {open && <div className="p-5 bg-white space-y-3">{children}</div>}
    </div>
  );
}

// ─── Main view ───────────────────────────────────────────────────────────────

export function ConfigEditorView({
  config,
  saving,
  message,
  onCityPriceChange,
  onDefaultPriceChange,
  onCoefficienteChange,
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

      {/* Coefficienti Immobiliari */}
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-800">Coefficienti Immobiliari</h2>
          <p className="text-slate-500 text-sm mt-1">
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
                    <span className="flex-1 text-sm text-slate-700">{label}</span>
                    <input
                      type="number"
                      value={(tableValues[k] ?? 1.00).toFixed(2)}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value);
                        if (!isNaN(v)) onCoefficienteChange(section.key, k, v);
                      }}
                      className="w-24 px-2 py-1.5 border border-slate-300 rounded-lg text-right text-sm font-mono text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
