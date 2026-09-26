import { readBlobJson, invalidateBlobJson } from '@/lib/blob-json-cache';
import { createLogger } from '@/lib/logger';
import rawDefaults from '@/lib/config.defaults.json';

const log = createLogger('lib/config');

const CONFIG_PATH = 'config/valuation-parameters.json';

// ─── Coefficient key types (14 tables) ───────────────────────────────────────

/** 8 property type categories */
export type TipologiaCoefficientKey =
  | 'appartamento'
  | 'openspaceLoft'
  | 'mansarda'
  | 'attico'
  | 'villettaSchiera'
  | 'villa'
  | 'rusticoCasale'
  | 'stabilePalazzo';

/** 7 property condition levels */
export type StatoCoefficientKey =
  | 'daRistrutturare'
  | 'daRiattare'
  | 'abitabile'
  | 'buono'
  | 'ottimo'
  | 'ristrutturato'
  | 'nuovo';

/** 10 energy class levels (G=worst, A4=best) */
export type ClasseEnergeticaKey =
  | 'G'
  | 'F'
  | 'E'
  | 'D'
  | 'C'
  | 'B'
  | 'A1'
  | 'A2'
  | 'A3'
  | 'A4';

/** 7 construction era ranges */
export type AnnoCostKey =
  | 'prima1945'
  | 'dal1945al1960'
  | 'dal1961al1980'
  | 'dal1981al2000'
  | 'dal2001al2010'
  | 'dal2011al2020'
  | 'dal2021inPoi';

/** 11 floor levels without elevator (piano6Plus covers 6+) */
export type PianoSenzaAscensoreKey =
  | 'interrato'
  | 'seminterrato'
  | 'pianoTerra'
  | 'rialzato'
  | 'piano1'
  | 'piano2'
  | 'piano3'
  | 'piano4'
  | 'piano5'
  | 'piano6Plus';

/** 12 floor levels with elevator (piano10Plus covers 10+) */
export type PianoConAscensoreKey =
  | 'pianoTerra'
  | 'piano1'
  | 'piano2'
  | 'piano3'
  | 'piano4'
  | 'piano5'
  | 'piano6'
  | 'piano7'
  | 'piano8'
  | 'piano9'
  | 'piano10Plus';

/** Union of all possible floor keys (deduped) */
export type PianoKey = PianoSenzaAscensoreKey | PianoConAscensoreKey;

/** 7 room count buckets */
export type LocaliKey =
  | 'locale1'
  | 'locali2'
  | 'locali3'
  | 'locali4'
  | 'locali5'
  | 'locali6'
  | 'locali7Plus';

/** 5 bathroom count buckets */
export type BagniKey =
  | 'bagno1'
  | 'bagni2'
  | 'bagni3'
  | 'bagni4'
  | 'bagni5Plus';

/** Elevator presence */
export type AscensoreKey = 'no' | 'si';

/** 5 terrace/balcony options */
export type TerrazzoKey =
  | 'nessuno'
  | 'balcone'
  | 'balconiMultipli'
  | 'terrazzoAbitabile'
  | 'terrazzoPanoramico';

/** 5 garden size options */
export type GiardinoKey = 'nessuno' | 'piccolo' | 'medio' | 'grande' | 'importante';

/** 5 garage/parking options */
export type GarageKey =
  | 'nessuno'
  | 'postoScoperto'
  | 'postoCoperto'
  | 'boxSingolo'
  | 'boxDoppio';

/** Cellar presence */
export type CantinaKey = 'no' | 'si';

/** 7 heating system options */
export type RiscaldamentoKey =
  | 'assente'
  | 'centralizzatoVecchio'
  | 'centralizzatoContabilizzato'
  | 'autonomo'
  | 'autonomoCondensazione'
  | 'pompaDiCalore'
  | 'impiantoRadiante';

// ─── Coefficient tables interface ────────────────────────────────────────────

/** Multiplicative coefficient tables for all 14 property characteristics. Value 1.00 = neutral. */
export interface ValuationCoefficientTables {
  tipologia: Record<TipologiaCoefficientKey, number>;
  stato: Record<StatoCoefficientKey, number>;
  classeEnergetica: Record<ClasseEnergeticaKey, number>;
  annoCostruzione: Record<AnnoCostKey, number>;
  pianoSenzaAscensore: Record<PianoSenzaAscensoreKey, number>;
  pianoConAscensore: Record<PianoConAscensoreKey, number>;
  locali: Record<LocaliKey, number>;
  bagni: Record<BagniKey, number>;
  ascensore: Record<AscensoreKey, number>;
  terrazzo: Record<TerrazzoKey, number>;
  giardino: Record<GiardinoKey, number>;
  garage: Record<GarageKey, number>;
  cantina: Record<CantinaKey, number>;
  riscaldamento: Record<RiscaldamentoKey, number>;
}

// ─── ValuationConfig ──────────────────────────────────────────────────────────

export type ValuationConfig = {
  pricePerSqmByCity: Record<string, number>;
  pricePerSqmDefault: number;
  coefficienti: ValuationCoefficientTables;
};

export const defaultConfig: ValuationConfig = rawDefaults as ValuationConfig;

export function invalidateConfigCache(): void {
  invalidateBlobJson(CONFIG_PATH);
  log.info('Config cache invalidated');
}

/** Deep-merge per tabella dei coefficienti: una tabella parziale non cancella le chiavi di default. */
export function mergeWithDefaults(remote: Partial<ValuationConfig>): ValuationConfig {
  const merged: ValuationConfig = { ...defaultConfig, ...remote, coefficienti: { ...defaultConfig.coefficienti } };
  if (remote.coefficienti && typeof remote.coefficienti === 'object') {
    for (const tableKey of Object.keys(defaultConfig.coefficienti) as (keyof ValuationCoefficientTables)[]) {
      (merged.coefficienti as unknown as Record<string, unknown>)[tableKey] = {
        ...defaultConfig.coefficienti[tableKey],
        ...(remote.coefficienti[tableKey] ?? {}),
      };
    }
  }
  return merged;
}

/**
 * Loads valuation config from Vercel Blob; falls back to defaultConfig if blob is missing or fetch fails.
 * Il JSON viene riscaricato solo quando il blob cambia (vedi lib/blob-json-cache.ts).
 */
export async function getValuationConfig(): Promise<ValuationConfig> {
  try {
    const remote = await readBlobJson<Partial<ValuationConfig>>(CONFIG_PATH);
    if (!remote) {
      log.warn('Config blob not found, using defaults');
      return defaultConfig;
    }
    return mergeWithDefaults(remote);
  } catch (error) {
    log.warn('Error loading config, using defaults', error instanceof Error ? error.message : error);
    return defaultConfig;
  }
}

/** Returns the price/mq for a city, falling back to pricePerSqmDefault if the city is not in the map. */
export function getPricePerSqm(config: ValuationConfig, city: string): number {
  return config.pricePerSqmByCity[city] ?? config.pricePerSqmDefault;
}

/**
 * Returns the coefficient tables from config, falling back to defaultConfig.coefficienti if undefined.
 * Use this instead of accessing config.coefficienti directly to ensure defaults are always present.
 */
export function getCoefficienti(config: ValuationConfig): ValuationCoefficientTables {
  return config.coefficienti ?? defaultConfig.coefficienti;
}
