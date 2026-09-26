// lib/street-rename.ts
// Rinomina delle vie nell'editor strade admin (es. per allinearle al nome ufficiale di Google Maps).
// Funzione pura: lavora sulle righe in bozza del controller, il salvataggio resta quello di /api/admin/streets.

export interface StreetRow {
  key: string;
  value: number;
}

export interface CivicRow {
  street: string;
  civic: string;
  price: number;
}

export interface StreetRename {
  from: string;
  to: string;
}

export interface RenameOutcome {
  streetRows: StreetRow[];
  civicRows: CivicRow[];
  applied: StreetRename[];
  /** Rinomine scartate perché il nuovo nome è già presente in lista (o è già la destinazione di un'altra rinomina) */
  conflicts: StreetRename[];
}

const norm = (s: string) => s.trim().toLowerCase();

/**
 * Applica le rinomine a vie e civici: "piazza vittoria" → "piazza della vittoria" rinomina anche
 * "piazza vittoria:2" → "piazza della vittoria:2". Non sovrascrive mai una via già esistente.
 */
export function applyStreetRenames(
  streetRows: StreetRow[],
  civicRows: CivicRow[],
  renames: StreetRename[],
): RenameOutcome {
  const existing = new Set([...streetRows.map((r) => norm(r.key)), ...civicRows.map((r) => norm(r.street))]);
  const map = new Map<string, string>();
  const applied: StreetRename[] = [];
  const conflicts: StreetRename[] = [];

  for (const rename of renames) {
    const from = norm(rename.from);
    const to = norm(rename.to);
    if (!from || !to || from === to || map.has(from)) continue;
    const targetTaken = existing.has(to) || [...map.values()].includes(to);
    if (targetTaken) {
      conflicts.push({ from, to });
      continue;
    }
    map.set(from, to);
    applied.push({ from, to });
  }

  return {
    streetRows: streetRows.map((r) => {
      const to = map.get(norm(r.key));
      return to ? { ...r, key: to } : r;
    }),
    civicRows: civicRows.map((r) => {
      const to = map.get(norm(r.street));
      return to ? { ...r, street: to } : r;
    }),
    applied,
    conflicts,
  };
}
