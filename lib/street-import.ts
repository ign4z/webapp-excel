// lib/street-import.ts
// Import delle vie ufficiali (ANNCSU, nomi allineati a Google) ed espansione dei civici nell'editor strade.
// Funzioni pure: lavorano sulle righe in bozza; il salvataggio resta quello di /api/admin/streets.

import type { GoogleStreetMatch } from '@/lib/address';
import { applyStreetRenames, type StreetRow, type CivicRow, type StreetRename } from '@/lib/street-rename';

/** Una via ufficiale del comune con il nome Google trovato e i civici ANNCSU */
export interface OfficialStreetEntry {
  /** Nome ANNCSU, maiuscolo (es. "VIA MARTIRI DELLA LIBERTA'") */
  anncsu: string;
  google: GoogleStreetMatch;
  civici: string[];
}

export interface UnconfirmedStreet {
  anncsu: string;
  /** Nome con cui la via entra in lista (quello ANNCSU in minuscolo) */
  name: string;
  /** Proposta Google scartata perché approssimata o già usata da un'altra via */
  suggestion?: string;
}

export interface OfficialImportResult {
  streetRows: StreetRow[];
  civicRows: CivicRow[];
  added: string[];
  kept: string[];
  renamed: StreetRename[];
  /** Vie in lista che non esistono tra quelle ufficiali (rimosse insieme ai loro civici) */
  removed: string[];
  unconfirmed: UnconfirmedStreet[];
}

const norm = (s: string) => s.trim().toLowerCase();

// Parole che non distinguono una via dall'altra nel confronto tra nome ANNCSU e nome Google
const STOPWORDS = new Set(['di', 'del', 'dello', 'della', 'dei', 'degli', 'delle', 'd', 'l', 'e', 'privata']);

/** Parole significative, senza accenti né apostrofi: "Via Martiri della Libertà" → ["via", "martiri", "liberta"] */
function words(name: string): string[] {
  return norm(name)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .split(/[^a-z0-9]+/)
    .filter((w) => w && !STOPWORDS.has(w));
}

/**
 * Un match approssimato di Google è attendibile se ha lo stesso tipo (via, piazza…) e tutte le sue parole
 * compaiono nel nome ANNCSU: "via carlo romanoni" → "via romanoni" sì, "via luigi salazar" → "via luigi calori" no.
 */
export function isCompatiblePartial(anncsu: string, google: string): boolean {
  const a = words(anncsu);
  const g = words(google);
  if (a.length === 0 || g.length < 2 || a[0] !== g[0]) return false;
  const set = new Set(a);
  return g.every((w) => set.has(w));
}

/**
 * Nome finale di ogni via ufficiale: quello Google se il match è esatto (o approssimato ma compatibile)
 * e non già usato da un'altra via, altrimenti il nome ANNCSU in minuscolo (segnalato come non confermato).
 */
function resolveNames(official: OfficialStreetEntry[]): { entry: OfficialStreetEntry; name: string; unconfirmed?: UnconfirmedStreet }[] {
  // Affidabilità del nome Google: 3 = identico ad ANNCSU, 2 = match esatto, 1 = approssimato compatibile, 0 = scartato
  const score = (e: OfficialStreetEntry): number => {
    if (e.google.status !== 'found') return 0;
    const g = norm(e.google.route);
    if (g === norm(e.anncsu)) return 3;
    if (!e.google.partial) return 2;
    return isCompatiblePartial(e.anncsu, g) ? 1 : 0;
  };
  const googleName = (e: OfficialStreetEntry) => (score(e) > 0 && e.google.status === 'found' ? norm(e.google.route) : null);
  // Se più vie ANNCSU puntano allo stesso nome Google, lo tiene quella con il match più affidabile (a parità, la prima)
  const owner = new Map<string, OfficialStreetEntry>();
  for (const e of official) {
    const g = googleName(e);
    if (g && (!owner.has(g) || score(e) > score(owner.get(g)!))) owner.set(g, e);
  }
  return official.map((entry) => {
    const google = googleName(entry);
    if (google && owner.get(google) === entry) return { entry, name: google };
    const name = norm(entry.anncsu);
    const suggestion = entry.google.status === 'found' ? norm(entry.google.route) : undefined;
    return { entry, name, unconfirmed: { anncsu: entry.anncsu, name, suggestion } };
  });
}

/**
 * Sostituisce la lista vie con quella ufficiale: tiene il prezzo delle vie già presenti (cercate per nome Google
 * o ANNCSU), usa `defaultPrice` per le nuove, rinomina i civici delle vie rinominate e rimuove le vie inesistenti.
 */
export function buildOfficialImport(
  streetRows: StreetRow[],
  civicRows: CivicRow[],
  official: OfficialStreetEntry[],
  defaultPrice: number,
): OfficialImportResult {
  const existingPrice = new Map(streetRows.filter((r) => norm(r.key)).map((r) => [norm(r.key), r.value]));
  const added: string[] = [];
  const kept: string[] = [];
  const renamed: StreetRename[] = [];
  const unconfirmed: UnconfirmedStreet[] = [];
  const newRows: StreetRow[] = [];

  const resolved = resolveNames(official);
  // Righe esistenti già abbinate per nome (Google o ANNCSU): non disponibili per l'abbinamento per compatibilità
  const claimed = new Set(resolved.flatMap(({ entry, name }) => [name, norm(entry.anncsu)]).filter((n) => existingPrice.has(n)));

  const seen = new Set<string>();
  for (const { entry, name: resolvedName, unconfirmed: u } of resolved) {
    let name = resolvedName;
    const anncsuName = norm(entry.anncsu);
    // Google non ha confermato la via ma in lista c'è una sola forma compatibile ("via salazar" per
    // "VIA LUIGI SALAZAR"): quasi sempre è il nome che Google dà agli utenti, quindi si tiene la riga esistente
    let matchedExisting = false;
    if (u && !existingPrice.has(name) && !existingPrice.has(anncsuName)) {
      const candidates = [...existingPrice.keys()].filter((k) => !claimed.has(k) && isCompatiblePartial(entry.anncsu, k));
      if (candidates.length === 1) {
        name = candidates[0];
        claimed.add(name);
        matchedExisting = true;
      }
    }
    if (seen.has(name)) continue; // due vie ufficiali con lo stesso nome finale: una sola riga
    seen.add(name);
    if (u && !matchedExisting) unconfirmed.push(u);
    if (existingPrice.has(name)) {
      kept.push(name);
      newRows.push({ key: name, value: existingPrice.get(name)! });
    } else if (anncsuName !== name && existingPrice.has(anncsuName)) {
      renamed.push({ from: anncsuName, to: name });
      newRows.push({ key: name, value: existingPrice.get(anncsuName)! });
    } else {
      added.push(name);
      newRows.push({ key: name, value: defaultPrice });
    }
  }

  const finalNames = new Set(newRows.map((r) => r.key));
  const renamedFrom = new Set(renamed.map((r) => r.from));
  const removed = [...new Set([...existingPrice.keys(), ...civicRows.map((r) => norm(r.street))])]
    .filter((s) => s && !finalNames.has(s) && !renamedFrom.has(s));
  const removedSet = new Set(removed);

  // I civici seguono le rinomine; quelli delle vie rimosse spariscono
  const { civicRows: renamedCivics } = applyStreetRenames([], civicRows, renamed);
  const keptCivics = renamedCivics.filter((r) => !removedSet.has(norm(r.street)));

  return {
    streetRows: newRows.sort((a, b) => a.key.localeCompare(b.key)),
    civicRows: keptCivics,
    added,
    kept,
    renamed,
    removed,
    unconfirmed,
  };
}

export interface ExpandCivicsResult {
  civicRows: CivicRow[];
  added: number;
  expandedStreets: number;
  /** Vie in lista senza corrispondenza tra quelle ufficiali (nessun civico aggiunto) */
  unmatchedStreets: string[];
}

/**
 * Aggiunge per ogni via in lista tutti i civici ufficiali mancanti, con il prezzo €/mq della via.
 * I civici già presenti (e i loro prezzi) non vengono toccati.
 */
export function expandCivics(
  streetRows: StreetRow[],
  civicRows: CivicRow[],
  official: OfficialStreetEntry[],
): ExpandCivicsResult {
  const civiciByName = new Map<string, string[]>();
  for (const entry of official) {
    civiciByName.set(norm(entry.anncsu), entry.civici);
    if (entry.google.status === 'found') civiciByName.set(norm(entry.google.route), entry.civici);
  }

  const existing = new Set(civicRows.map((r) => `${norm(r.street)}:${r.civic.trim()}`));
  const additions: CivicRow[] = [];
  const unmatchedStreets: string[] = [];
  let expandedStreets = 0;

  for (const row of streetRows) {
    const street = norm(row.key);
    if (!street) continue;
    const civici = civiciByName.get(street);
    if (!civici) {
      unmatchedStreets.push(street);
      continue;
    }
    const missing = civici.filter((c) => !existing.has(`${street}:${c}`));
    if (missing.length > 0) expandedStreets++;
    for (const civic of missing) additions.push({ street, civic, price: row.value });
  }

  return { civicRows: [...civicRows, ...additions], added: additions.length, expandedStreets, unmatchedStreets };
}
