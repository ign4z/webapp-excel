// lib/street-search.ts
// Funzioni pure per il campo indirizzo dello Step 1: ricerca tra le vie del comune, etichette leggibili,
// composizione e scomposizione dell'indirizzo "Via, civico" (formato letto da extractStreetName/extractCivicNumber).

/** Una via selezionabile nello Step 1 */
export interface StreetOption {
  /** Chiave della lista prezzi, in minuscolo (es. "piazza giovanni falcone") */
  name: string;
  /** Nome da mostrare (es. "Piazza Giovanni Falcone") */
  label: string;
  /** Civici conosciuti, suggeriti nel campo civico */
  civici: string[];
}

const LOWERCASE_WORDS = new Set(['di', 'del', 'dello', 'della', 'dei', 'degli', 'delle', 'da', 'dal', 'e', 'in']);
// Numeri romani da 1 a 39 (date e ordinali nei nomi delle vie)
const ROMAN = /^(?=[ivx])x{0,3}(ix|iv|v?i{0,3})$/;

/** "via martiri della libertà" → "Via Martiri della Libertà"; "via dell'olmo" → "Via dell'Olmo" */
export function formatStreetLabel(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((word, i) =>
      word
        .split("'")
        .map((part, j) => {
          if (!part) return part;
          const isArticle = j === 0 && word.includes("'") && part.length <= 4; // dell', d', l'
          if (i > 0 && (LOWERCASE_WORDS.has(part) || isArticle)) return part;
          if (i > 0 && ROMAN.test(part)) return part.toUpperCase(); // "via xxv aprile" → "Via XXV Aprile"
          return part[0].toUpperCase() + part.slice(1);
        })
        .join("'"),
    )
    .join(' ');
}

/** Testo confrontabile: minuscolo, senza accenti, apostrofi e punteggiatura come spazi */
export function normalizeForSearch(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Vie che corrispondono alla ricerca: ogni parola digitata deve essere l'inizio di una parola del nome
 * ("giov falc" trova "Piazza Giovanni Falcone"). In cima quelle in cui il nome proprio (senza "via", "piazza"…)
 * inizia con la ricerca, poi in ordine alfabetico.
 */
export function searchStreets(streets: StreetOption[], query: string, limit = 8): StreetOption[] {
  const tokens = normalizeForSearch(query).split(' ').filter(Boolean);
  if (tokens.length === 0) return streets.slice(0, limit);
  const q = tokens.join(' ');

  const scored: { street: StreetOption; score: number }[] = [];
  for (const street of streets) {
    const words = normalizeForSearch(street.name).split(' ');
    if (!tokens.every((t) => words.some((w) => w.startsWith(t)))) continue;
    const full = words.join(' ');
    const withoutType = words.slice(1).join(' ');
    const score = full.startsWith(q) ? 0 : withoutType.startsWith(q) ? 1 : 2;
    scored.push({ street, score });
  }
  return scored
    .sort((a, b) => a.score - b.score || a.street.label.localeCompare(b.street.label))
    .slice(0, limit)
    .map((s) => s.street);
}

/** Via della lista che corrisponde esattamente al testo digitato (ignorando maiuscole e accenti), se c'è. */
export function findExactStreet(streets: StreetOption[], text: string): StreetOption | null {
  const q = normalizeForSearch(text);
  if (!q) return null;
  return streets.find((s) => normalizeForSearch(s.name) === q) ?? null;
}

/** Civico accettato: numero con eventuale esponente ("15", "15/A", "15 bis") */
export const CIVIC_PATTERN = /^\d{1,5}(\s*\/?\s*[a-zA-Z]{1,3})?$/;

/** "Piazza Giovanni Falcone" + "15" → "Piazza Giovanni Falcone, 15" */
export function composeAddress(street: string, civic: string): string {
  const s = street.trim();
  const c = civic.trim();
  return c ? `${s}, ${c}` : s;
}

/** Inverso di composeAddress, per ripristinare i campi tornando dallo Step 2 */
export function splitAddress(address: string): { street: string; civic: string } {
  const [street = '', civic = ''] = address.split(',').map((p) => p.trim());
  return { street, civic: CIVIC_PATTERN.test(civic) ? civic : '' };
}
