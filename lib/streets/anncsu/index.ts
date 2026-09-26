// Vie e civici ufficiali ANNCSU per comune, generati da scripts/anncsu-extract.mjs (npm run anncsu:update).
import locateDiTriulzi from './locate-di-triulzi.json';
import opera from './opera.json';
import pieveEmanuele from './pieve-emanuele.json';
import siziano from './siziano.json';
import carpiano from './carpiano.json';

export interface OfficialStreets {
  source: string;
  /** Data dell'estratto ANNCSU (YYYY-MM-DD) */
  date: string;
  /** Nome via ANNCSU (maiuscolo, es. "VIA GIOVANNI FALCONE") → civici numerici ordinati */
  streets: Record<string, string[]>;
}

const OFFICIAL_MAP: Record<string, OfficialStreets> = {
  'locate-di-triulzi': locateDiTriulzi,
  'opera': opera,
  'pieve-emanuele': pieveEmanuele,
  'siziano': siziano,
  'carpiano': carpiano,
};

/** Dati ANNCSU del comune, o null se non disponibili (es. frazioni senza codice catastale proprio). */
export function getOfficialStreets(slug: string): OfficialStreets | null {
  return OFFICIAL_MAP[slug] ?? null;
}
