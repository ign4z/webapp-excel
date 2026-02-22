// lib/calculations.ts
// Logica di calcolo per valutazione immobiliare

import { head, put } from '@vercel/blob';
import { promises as fs } from 'fs';
import path from 'path';
import { ConfigParams, FinalValuation } from '@/types';

const CONFIG_BLOB_PATH = 'config/parameters.json';
const LOCAL_CONFIG_PATH = path.join(process.cwd(), 'config-local.json');
const USE_LOCAL_FALLBACK = !process.env.BLOB_READ_WRITE_TOKEN;

/**
 * Calcola la valutazione base (Form 1)
 */
export function calculateBaseValue(
  squareMeters: number,
  config: ConfigParams
): {
  baseValue: number;
  pricePerSqm: number;
  estimatedValue: number;
  message: string;
} {
  const pricePerSqm = config.pricePerSqm;
  const baseValue = squareMeters * pricePerSqm;

  return {
    baseValue,
    pricePerSqm,
    estimatedValue: baseValue,
    message: `Valutazione base: €${baseValue.toLocaleString('it-IT')} (€${pricePerSqm}/mq × ${squareMeters}mq)`,
  };
}

/**
 * Calcola la valutazione finale con aggiustamenti (Form 2)
 */
export function calculateFinalValuation(
  baseValue: number,
  form2Data: Form2Data,
  config: ConfigParams
): FinalValuation {
  const adjustments = {
    floor: 0,
    secondBathroom: 0,
    cellar: 0,
    exposure: 0,
    heating: 0,
    age: 0,
    renovation: 0,
  };

  const details: string[] = [];
  const currentYear = new Date().getFullYear();

  /* =============================
     1️⃣ PIANO + ASCENSORE
  ============================== */
  if (
    form2Data.floor !== undefined &&
    form2Data.floor > 0 &&
    form2Data.hasElevator === false
  ) {
    const penaltyPercent =
      form2Data.floor * config.floorPenaltyNoElevator;

    adjustments.floor =
      -baseValue * (penaltyPercent / 100);

    details.push(
      `Piano ${form2Data.floor} senza ascensore: -${penaltyPercent}%`
    );
  }

  /* =============================
     2️⃣ SECONDO BAGNO
  ============================== */
  if (form2Data.hasSecondBathroom) {
    adjustments.secondBathroom =
      baseValue * (config.secondBathroomBonus / 100);

    details.push(
      `Secondo bagno: +${config.secondBathroomBonus}%`
    );
  }

  /* =============================
     3️⃣ CANTINA
  ============================== */
  if (form2Data.hasCellar) {
    adjustments.cellar =
      baseValue * (config.cellarBonus / 100);

    details.push(
      `Cantina: +${config.cellarBonus}%`
    );
  }

  /* =============================
     4️⃣ ESPOSIZIONE
  ============================== */
  if (form2Data.exposure) {
    if (
      form2Data.exposure === "south" ||
      form2Data.exposure === "east" ||
      form2Data.exposure === "west"
    ) {
      adjustments.exposure =
        baseValue * (config.exposureSouthBonus / 100);

      details.push(
        `Buona esposizione (${form2Data.exposure}): +${config.exposureSouthBonus}%`
      );
    }

    if (form2Data.exposure === "north") {
      adjustments.exposure =
        -baseValue * (config.exposureNorthPenalty / 100);

      details.push(
        `Esposizione nord: -${config.exposureNorthPenalty}%`
      );
    }
  }

  /* =============================
     5️⃣ RISCALDAMENTO
  ============================== */
  if (form2Data.heatingType === "autonomous") {
    adjustments.heating =
      baseValue * (config.heatingAutonomousBonus / 100);

    details.push(
      `Riscaldamento autonomo: +${config.heatingAutonomousBonus}%`
    );
  }

  if (form2Data.heatingType === "centralized") {
    adjustments.heating =
      -baseValue * (config.heatingCentralizedPenalty / 100);

    details.push(
      `Riscaldamento centralizzato: -${config.heatingCentralizedPenalty}%`
    );
  }

  /* =============================
     6️⃣ ETÀ EDIFICIO
  ============================== */
  if (form2Data.buildYear) {
    const age = Math.max(
      0,
      currentYear - form2Data.buildYear
    );

    const depreciationPercent =
      age * config.ageDepreciationPerYear;

    if (depreciationPercent > 0) {
      adjustments.age =
        -baseValue * (depreciationPercent / 100);

      details.push(
        `Età edificio (${age} anni): -${depreciationPercent.toFixed(
          1
        )}%`
      );
    }
  }

  /* =============================
     7️⃣ RISTRUTTURAZIONE
  ============================== */
  if (form2Data.isRecentlyRenovated) {
    adjustments.renovation =
      baseValue * (config.renovationBonus / 100);

    details.push(
      `Ristrutturazione recente: +${config.renovationBonus}%`
    );
  }

  /* =============================
     CALCOLO TOTALE
  ============================== */
  const totalAdjustment =
    adjustments.floor +
    adjustments.secondBathroom +
    adjustments.cellar +
    adjustments.exposure +
    adjustments.heating +
    adjustments.age +
    adjustments.renovation;

  const finalValue = baseValue + totalAdjustment;

  return {
    baseValue,
    adjustments,
    totalAdjustment,
    finalValue,
    details,
  };
}

/**
 * Recupera parametri di configurazione
 */
export async function getConfigParams(): Promise<ConfigParams> {
  try {
    if (USE_LOCAL_FALLBACK) {
      console.log('⚠️ Blob token mancante, uso file system locale');
      try {
        const content = await fs.readFile(LOCAL_CONFIG_PATH, 'utf-8');
        const config: ConfigParams = JSON.parse(content);
        console.log('✅ Config caricata da file locale');
        return config;
      } catch (error) {
        console.warn('⚠️ File config locale non trovato, uso valori default');
        return getDefaultConfig();
      }
    }

    const blobInfo = await head(CONFIG_BLOB_PATH);
    
    if (!blobInfo) {
      console.warn('⚠️ Config non trovata su Blob, uso valori default');
      return getDefaultConfig();
    }

    const response = await fetch(blobInfo.url);
    const config: ConfigParams = await response.json();

    console.log('✅ Config caricata da Blob Storage');
    return config;

  } catch (error) {
    console.error('❌ Errore lettura config:', error);
    return getDefaultConfig();
  }
}

/**
 * Salva parametri di configurazione
 */
export async function saveConfigParams(config: ConfigParams): Promise<boolean> {
  try {
    const jsonContent = JSON.stringify(config, null, 2);

    if (USE_LOCAL_FALLBACK) {
      console.log('⚠️ Blob token mancante, salvo su file system locale');
      await fs.writeFile(LOCAL_CONFIG_PATH, jsonContent, 'utf-8');
      console.log('✅ Config salvata localmente:', LOCAL_CONFIG_PATH);
      return true;
    }

    const blob = await put(CONFIG_BLOB_PATH, jsonContent, {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
    });

    console.log('✅ Config salvata su Blob Storage:', blob.url);
    return true;

  } catch (error) {
    console.error('❌ Errore salvataggio config:', error);
    return false;
  }
}

/**
 * Valori di default
 */
function getDefaultConfig(): ConfigParams {
  return {
    pricePerSqm: 2500, // €2500/mq (prezzo medio Italia)
    floorPenaltyNoElevator: 2, // -2% per piano senza ascensore
    secondBathroomBonus: 3,
    cellarBonus: 3,
    exposureSouthBonus: 5,
    exposureNorthPenalty: 3,
    heatingAutonomousBonus: 2,
    heatingCentralizedPenalty: 1,
    ageDepreciationPerYear: 0.3,
    renovationBonus: 10,
  };
}

/**
 * Inizializza la configurazione
 */
export async function initializeConfig(): Promise<void> {
  try {
    if (USE_LOCAL_FALLBACK) {
      try {
        await fs.access(LOCAL_CONFIG_PATH);
        console.log('ℹ️ Config locale già presente');
        return;
      } catch {
        const defaultConfig = getDefaultConfig();
        await saveConfigParams(defaultConfig);
        console.log('✅ Config inizializzata localmente con valori default');
        return;
      }
    }

    const existing = await head(CONFIG_BLOB_PATH);
    
    if (existing) {
      console.log('ℹ️ Config già presente su Blob Storage');
      return;
    }

    const defaultConfig = getDefaultConfig();
    await saveConfigParams(defaultConfig);
    console.log('✅ Config inizializzata con valori default');

  } catch (error) {
    console.error('❌ Errore inizializzazione config:', error);
  }
}

/**
 * Genera un session token casuale
 */
export function generateSessionToken(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}
