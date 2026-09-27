'use client';

import { useState } from 'react';
import { ChevronDown, Loader2, RotateCcw, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { StatusMessage } from './StatusMessage';
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
    <div className="overflow-hidden rounded-lg border">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/50"
      >
        <div className="min-w-0">
          <p className="font-medium text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground">{refLabel}</p>
        </div>
        <ChevronDown className={cn('size-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>
      {open && <div className="space-y-2 border-t px-4 py-3">{children}</div>}
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
      <div className="flex justify-center py-24 text-muted-foreground">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Prezzi per comune */}
      <Card>
        <CardHeader>
          <CardTitle>Prezzi per comune</CardTitle>
          <CardDescription>Prezzo al mq di partenza per ogni comune: influenza direttamente la stima base.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {ALLOWED_CITIES.map(city => (
            <PriceField
              key={city}
              label={city}
              hint={`Anteprima 100 mq: € ${calculatePreview(city).toLocaleString('it-IT')}`}
              value={config.pricePerSqmByCity[city] ?? config.pricePerSqmDefault}
              onChange={(v) => onCityPriceChange(city, v)}
              min={100} max={10000} inputMax={20000} step={50}
            />
          ))}
          <PriceField
            label="Prezzo default"
            hint="Comuni non in lista"
            value={config.pricePerSqmDefault}
            onChange={onDefaultPriceChange}
            min={100} max={10000} step={50}
            dashed
          />
        </CardContent>
      </Card>

      {/* Coefficienti Immobiliari */}
      <Card>
        <CardHeader>
          <CardTitle>Coefficienti immobiliari</CardTitle>
          <CardDescription>
            Moltiplicatori per ogni caratteristica: 1,00 = neutro, &gt; 1,00 = premium, &lt; 1,00 = sconto.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {COEFF_SECTIONS.map(section => {
            const tableValues = config.coefficienti[section.key] as Record<string, number>;
            return (
              <Accordion key={section.key} title={section.title} ref={section.ref}>
                {Object.entries(section.labels).map(([k, label]) => (
                  <div key={k} className="flex items-center gap-4">
                    <span className="flex-1 text-sm text-foreground/90">{label}</span>
                    <Input
                      type="number"
                      inputMode="decimal"
                      value={(tableValues[k] ?? 1.00).toFixed(2)}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value);
                        if (!isNaN(v)) onCoefficienteChange(section.key, k, v);
                      }}
                      className="w-24 text-right font-mono"
                      step={0.01} min={0.01} max={5.00}
                      aria-label={`${section.title}: ${label}`}
                    />
                  </div>
                ))}
              </Accordion>
            );
          })}
        </CardContent>
      </Card>

      {/* Save / Reset: barra fissa in basso, sempre raggiungibile */}
      <div className="sticky bottom-3 z-20 rounded-xl border bg-card/95 p-3 shadow-lg backdrop-blur">
        <div className="flex flex-wrap items-center gap-2">
          <StatusMessage message={message} className="w-full sm:order-2 sm:w-auto sm:flex-1" />
          <Button variant="ghost" onClick={onReset} disabled={saving} className="sm:order-1" aria-label="Ripristina default">
            <RotateCcw />
            <span className="hidden sm:inline">Ripristina default</span>
          </Button>
          <Button onClick={onSave} disabled={saving} size="lg" className="flex-1 sm:order-3 sm:ml-auto sm:flex-none">
            {saving ? <Loader2 className="animate-spin" /> : <Save />}
            {saving ? 'Salvataggio…' : 'Salva configurazione'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function PriceField({
  label, hint, value, onChange, min, max, inputMax = max, step, dashed,
}: {
  label: string;
  hint: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  /** Fondo scala dello slider */
  max: number;
  /** Massimo digitabile nel campo numerico */
  inputMax?: number;
  step: number;
  dashed?: boolean;
}) {
  return (
    <div className={cn('rounded-lg border p-4', dashed && 'border-dashed')}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-foreground">{label}</p>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden text-sm text-muted-foreground sm:inline">€/mq</span>
          <Input
            type="number"
            inputMode="numeric"
            value={value}
            onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
            className="w-28 text-right font-semibold"
            step={step} min={min} max={inputMax}
            aria-label={`${label} €/mq`}
          />
        </div>
      </div>
      <input
        type="range"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        min={min} max={max} step={step}
        className="w-full cursor-pointer accent-primary"
        aria-label={`${label} €/mq (cursore)`}
      />
      <div className="mt-1 flex justify-between text-xs text-muted-foreground">
        <span>€ {min.toLocaleString('it-IT')}</span><span>€ {max.toLocaleString('it-IT')}</span>
      </div>
    </div>
  );
}
