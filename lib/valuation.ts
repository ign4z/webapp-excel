// lib/valuation.ts
// Formula moltiplicativa della valutazione definitiva (Step 2). Funzioni pure, senza I/O.

import type { ValuationCoefficientTables, PianoConAscensoreKey, PianoSenzaAscensoreKey } from '@/lib/config';
import type { Form1Values, Form2Values } from '@/lib/schema';
import {
  TIPOLOGIA_LABELS,
  STATO_LABELS,
  CLASSE_ENERGETICA_LABELS,
  ANNO_COST_LABELS,
  PIANO_LABELS,
  LOCALI_LABELS,
  BAGNI_LABELS,
  ASCENSORE_LABELS,
  TERRAZZO_LABELS,
  GIARDINO_LABELS,
  GARAGE_LABELS,
  CANTINA_LABELS,
  RISCALDAMENTO_LABELS,
} from '@/lib/labels';

export type ValuationInput = Pick<Form1Values, 'squareMeters' | 'tipologia' | 'piano' | 'locali' | 'bagni'> & Form2Values;

export interface CoefficientDetail {
  /** Nome del fattore, es. "Stato" */
  factor: string;
  /** Valore selezionato leggibile, es. "Buono" */
  value: string;
  coefficiente: number;
}

export interface ValuationResult {
  baseValue: number;
  finalValue: number;
  coeffTotale: number;
  /** Differenza in € tra valore finale e valore base */
  totalAdjustment: number;
  details: Array<{ label: string; coefficiente: number }>;
  coefficients: CoefficientDetail[];
}

const SOLO_SENZA_ASCENSORE = ['interrato', 'seminterrato', 'rialzato'];
const SOLO_CON_ASCENSORE = ['piano6', 'piano7', 'piano8', 'piano9'];

/** Coefficiente piano: tabella diversa con/senza ascensore; senza ascensore i piani 6-9 confluiscono in piano6Plus. */
export function calcolaPianoCoeff(piano: string, ascensore: 'no' | 'si', c: ValuationCoefficientTables): number {
  if (ascensore === 'si' && !SOLO_SENZA_ASCENSORE.includes(piano)) {
    return c.pianoConAscensore[piano as PianoConAscensoreKey] ?? 1.00;
  }
  const key = SOLO_CON_ASCENSORE.includes(piano) ? 'piano6Plus' : piano;
  return c.pianoSenzaAscensore[key as PianoSenzaAscensoreKey] ?? 1.00;
}

export function computeValuation(input: ValuationInput, pricePerSqm: number, c: ValuationCoefficientTables): ValuationResult {
  const baseValue = Math.round(pricePerSqm * input.squareMeters);

  const coefficients: CoefficientDetail[] = [
    { factor: 'Tipologia',         value: TIPOLOGIA_LABELS[input.tipologia],                coefficiente: c.tipologia[input.tipologia] ?? 1.00 },
    { factor: 'Stato',             value: STATO_LABELS[input.stato],                        coefficiente: c.stato[input.stato] ?? 1.00 },
    { factor: 'Classe energetica', value: CLASSE_ENERGETICA_LABELS[input.classeEnergetica], coefficiente: c.classeEnergetica[input.classeEnergetica] ?? 1.00 },
    { factor: 'Anno costruzione',  value: ANNO_COST_LABELS[input.annoCostruzione],          coefficiente: c.annoCostruzione[input.annoCostruzione] ?? 1.00 },
    { factor: 'Piano',             value: PIANO_LABELS[input.piano],                        coefficiente: calcolaPianoCoeff(input.piano, input.ascensore, c) },
    { factor: 'Locali',            value: LOCALI_LABELS[input.locali],                      coefficiente: c.locali[input.locali] ?? 1.00 },
    { factor: 'Bagni',             value: BAGNI_LABELS[input.bagni],                        coefficiente: c.bagni[input.bagni] ?? 1.00 },
    { factor: 'Ascensore',         value: ASCENSORE_LABELS[input.ascensore],                coefficiente: c.ascensore[input.ascensore] ?? 1.00 },
    { factor: 'Terrazzo/Balcone',  value: TERRAZZO_LABELS[input.terrazzo],                  coefficiente: c.terrazzo[input.terrazzo] ?? 1.00 },
    { factor: 'Giardino',          value: GIARDINO_LABELS[input.giardino],                  coefficiente: c.giardino[input.giardino] ?? 1.00 },
    { factor: 'Garage',            value: GARAGE_LABELS[input.garage],                      coefficiente: c.garage[input.garage] ?? 1.00 },
    { factor: 'Cantina',           value: CANTINA_LABELS[input.cantina],                    coefficiente: c.cantina[input.cantina] ?? 1.00 },
    { factor: 'Riscaldamento',     value: RISCALDAMENTO_LABELS[input.riscaldamento],        coefficiente: c.riscaldamento[input.riscaldamento] ?? 1.00 },
  ];

  const coeffTotale = coefficients.reduce((acc, d) => acc * d.coefficiente, 1);
  const finalValue = Math.round(baseValue * coeffTotale);

  return {
    baseValue,
    finalValue,
    coeffTotale,
    totalAdjustment: finalValue - baseValue,
    details: [
      ...coefficients.map((d) => ({ label: `${d.factor}: ${d.value}`, coefficiente: d.coefficiente })),
      { label: 'Coefficiente totale', coefficiente: coeffTotale },
    ],
    coefficients,
  };
}
