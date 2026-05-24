import { list } from '@vercel/blob';

const CONFIG_PATH = 'config/valuation-parameters.json';

export type ValuationConfig = {
  // Prezzi base per comune (€/mq)
  pricePerSqmByCity: Record<string, number>;
  // Fallback se il comune non è in lista
  pricePerSqmDefault: number;
  // Aggiustamenti percentuali
  depreciation: number;       // % per anno di vecchiaia
  secondBathroom: number;     // %
  cellar: number;             // %
  renovated: number;          // %
  groundFloor: number;        // %
  topFloor: number;           // %
  exposureSouth: number;      // %
  exposureEast: number;       // %
  exposureWest: number;       // %
  exposureNorth: number;      // %
  heatingAutonomous: number;  // %
  heatingCentralized: number; // %
};

export const defaultConfig: ValuationConfig = {
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

/* ─── Cache in-memory per evitare chiamate ripetute al blob ─── */
let cachedConfig: ValuationConfig | null = null;
let cacheExpiry = 0;
const CACHE_TTL = 1000 * 60 * 5; // 5 minuti

export async function getValuationConfig(): Promise<ValuationConfig> {
  // Serve cache valida
  if (cachedConfig && Date.now() < cacheExpiry) {
    return cachedConfig!;
  }

  try {
    // Usa il Blob SDK: list() usa automaticamente BLOB_READ_WRITE_TOKEN
    const { blobs } = await list({ prefix: CONFIG_PATH, limit: 1 });

    if (blobs.length === 0) {
      console.warn('Config blob not found, using defaults');
      return defaultConfig;
    }

    // blobs[0].url è l'URL pubblico del file
    const response = await fetch(blobs[0].url, { cache: 'no-store' });

    if (!response.ok) {
      console.warn(`Blob fetch failed: ${response.status}, using defaults`);
      return defaultConfig;
    }

    const remote = await response.json();

    // Merge con i default per sicurezza (campi mancanti → default)
    cachedConfig = { ...defaultConfig, ...remote };
    cacheExpiry = Date.now() + CACHE_TTL;

    return cachedConfig!;
  } catch (error) {
    console.warn('Using default config:', error);
    return defaultConfig;
  }
}

/* ─── Helper per ottenere il prezzo/mq per una città specifica ─── */
export function getPricePerSqm(config: ValuationConfig, city: string): number {
  return config.pricePerSqmByCity[city] ?? config.pricePerSqmDefault;
}
