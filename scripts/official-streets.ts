// scripts/official-streets.ts
// Operazioni una tantum sulle liste vie, con la stessa logica dell'editor admin (lib/street-import.ts).
//
//   npx tsx --env-file=.env.local scripts/official-streets.ts import opera locate-di-triulzi          (anteprima)
//   npx tsx --env-file=.env.local scripts/official-streets.ts import opera locate-di-triulzi --write  (scrive)
//   npx tsx --env-file=.env.local scripts/official-streets.ts clear siziano tolcinasco --write        (svuota)
//
// import: sostituisce la lista con le vie ufficiali ANNCSU (nomi Google, prezzi esistenti mantenuti).
// clear:  cancella le vie del comune (resta il prezzo di default).
// Con --write salva sul blob del comune (store di BLOB_READ_WRITE_TOKEN), aggiorna il seed in lib/streets/
// e, prima di scrivere, fa un backup del blob attuale in --backup-dir (default: ./backups).
// .env.local punta allo store di sviluppo: per scrivere in produzione usare un env file con il token di
// produzione e senza BLOB_PRODUCTION_STORE_ID (es. `vercel env pull .env.production.local --environment=production`).

import fs from 'node:fs';
import path from 'node:path';
import { del } from '@vercel/blob';
import { readBlobJson, writeBlobJson } from '@/lib/blob-json-cache';
import { assertBlobWritable } from '@/lib/blob-env';
import { ALLOWED_CITIES, cityToSlug } from '@/lib/cities';
import { getSeedStreetPrices, getCityDefaultPrice } from '@/lib/streets';
import { getOfficialStreets } from '@/lib/streets/anncsu';
import { geocodeStreetNames } from '@/lib/google-geocode';
import { buildOfficialImport, type OfficialStreetEntry } from '@/lib/street-import';
import type { StreetRow, CivicRow } from '@/lib/street-rename';

type StreetMap = Record<string, number>;

const args = process.argv.slice(2);
const command = args[0];
const write = args.includes('--write');
const backupDir = args.find((a) => a.startsWith('--backup-dir='))?.split('=')[1] ?? 'backups';
const slugs = args.slice(1).filter((a) => !a.startsWith('--'));

function toRows(map: StreetMap): { streetRows: StreetRow[]; civicRows: CivicRow[] } {
  const streetRows: StreetRow[] = [];
  const civicRows: CivicRow[] = [];
  for (const [key, value] of Object.entries(map)) {
    const [street, civic] = key.split(':');
    if (civic === undefined) streetRows.push({ key, value });
    else civicRows.push({ street, civic, price: value });
  }
  return { streetRows, civicRows };
}

function toMap(streetRows: StreetRow[], civicRows: CivicRow[]): StreetMap {
  const map: StreetMap = {};
  for (const r of streetRows) map[r.key] = r.value;
  for (const r of civicRows) map[`${r.street}:${r.civic}`] = r.price;
  return map;
}

async function currentMap(slug: string): Promise<{ map: StreetMap; fromBlob: boolean }> {
  const blob = await readBlobJson<StreetMap>(`streets/${slug}.json`);
  return blob ? { map: blob, fromBlob: true } : { map: getSeedStreetPrices(slug), fromBlob: false };
}

function backup(slug: string, map: StreetMap) {
  fs.mkdirSync(backupDir, { recursive: true });
  const file = path.join(backupDir, `streets-${slug}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(file, JSON.stringify(map, null, 2));
  console.log(`  backup: ${file}`);
}

function writeSeed(slug: string, streetPrices: StreetMap) {
  const file = path.join('lib', 'streets', `${slug}.json`);
  const seed = JSON.parse(fs.readFileSync(file, 'utf-8')) as { streetPrices: StreetMap; defaultPrice: number };
  const sorted = Object.fromEntries(Object.entries(streetPrices).sort(([a], [b]) => a.localeCompare(b)));
  fs.writeFileSync(file, JSON.stringify({ ...seed, streetPrices: sorted }, null, 2) + '\n');
  console.log(`  seed aggiornato: ${file}`);
}

async function importOfficial(slug: string) {
  const cityName = ALLOWED_CITIES.find((c) => cityToSlug(c) === slug);
  const data = getOfficialStreets(slug);
  if (!cityName || !data) throw new Error(`Dati ANNCSU non disponibili per "${slug}"`);

  const { map, fromBlob } = await currentMap(slug);
  const { streetRows, civicRows } = toRows(map);
  const names = Object.keys(data.streets);
  const matches = await geocodeStreetNames(names, cityName);
  const official: OfficialStreetEntry[] = names.map((anncsu, i) => ({ anncsu, google: matches[i], civici: data.streets[anncsu] }));
  const out = buildOfficialImport(streetRows, civicRows, official, getCityDefaultPrice(slug));

  console.log(`\n${cityName} — ANNCSU ${data.date}, lista attuale da ${fromBlob ? 'blob' : 'seed'}: ${streetRows.length} vie, ${civicRows.length} civici`);
  console.log(`  risultato: ${out.streetRows.length} vie, ${out.civicRows.length} civici`);
  console.log(`  nuove (${out.added.length}, ${getCityDefaultPrice(slug)} €/mq): ${out.added.join(' · ')}`);
  console.log(`  rinominate (${out.renamed.length}): ${out.renamed.map((r) => `${r.from} → ${r.to}`).join(' · ')}`);
  console.log(`  invariate (${out.kept.length}): ${out.kept.join(' · ')}`);
  console.log(`  rimosse (${out.removed.length}): ${out.removed.join(' · ')}`);
  console.log(`  senza conferma Google (${out.unconfirmed.length}): ${out.unconfirmed.map((u) => u.name + (u.suggestion ? ` [Google: ${u.suggestion}]` : '')).join(' · ')}`);

  if (!write) return;
  const next = toMap(out.streetRows, out.civicRows);
  if (fromBlob) backup(slug, map);
  await writeBlobJson(`streets/${slug}.json`, next);
  console.log(`  ✅ scritto streets/${slug}.json`);
  writeSeed(slug, next);
}

async function clear(slug: string) {
  const blob = await readBlobJson<StreetMap>(`streets/${slug}.json`);
  console.log(`\n${slug}: blob ${blob ? `con ${Object.keys(blob).length} chiavi` : 'assente'}, seed con ${Object.keys(getSeedStreetPrices(slug)).length} chiavi`);
  if (!write) return;
  if (blob) {
    backup(slug, blob);
    assertBlobWritable(`delete streets/${slug}.json`);
    await del(`streets/${slug}.json`);
    console.log(`  ✅ cancellato streets/${slug}.json`);
  }
  writeSeed(slug, {});
}

async function main() {
  if (!['import', 'clear'].includes(command) || slugs.length === 0) {
    console.error('Uso: official-streets.ts <import|clear> <slug...> [--write] [--backup-dir=dir]');
    process.exit(1);
  }
  for (const slug of slugs) {
    await (command === 'import' ? importOfficial(slug) : clear(slug));
  }
  if (!write) console.log('\nAnteprima: nessuna modifica. Rilancia con --write per applicare.');
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
