// scripts/anncsu-extract.mjs
// Estrae vie e civici ufficiali dei comuni serviti dall'ANNCSU (Archivio Nazionale Numeri Civici e Strade Urbane,
// Agenzia delle Entrate / Istat) e li salva in lib/streets/anncsu/<slug>.json.
//
// Uso:  npm run anncsu:update                         (scarica stradario e indirizzario della Lombardia, ~40 MB)
//       npm run anncsu:update -- STRAD.zip INDIR.zip  (usa zip già scaricati)
// I dati ANNCSU sono aggiornati mensilmente: rilanciare lo script per allinearsi.

import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Unzip, UnzipInflate } from 'fflate';
import { CITY_CADASTRAL_CODES } from '../lib/cities.ts';

const BASE_URL = 'https://anncsu.open.agenziaentrate.gov.it/age-inspire/opendata/anncsu/getds.php';
const OUT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'lib', 'streets', 'anncsu');

// Colonne dei CSV ANNCSU (separatore ';', prima riga intestazione)
const COL_CODE = 0;
const COL_ODONIMO = 4;
const COL_CIVICO = 10; // solo indirizzario

/** Nome via normalizzato: spazi singoli, maiuscolo come in ANNCSU. */
export function normalizeOdonimo(raw) {
  return raw.replace(/\s+/g, ' ').trim().toUpperCase();
}

/** Parte numerica del civico ("012" → "12"); null per accessi senza civico (metrici, SNC). */
export function civicNumber(raw) {
  const match = raw.trim().match(/^\d+/);
  const n = match ? Number(match[0]) : 0;
  return n > 0 ? String(n) : null;
}

/**
 * Accumula vie (dallo stradario) e civici (dall'indirizzario) per i codici catastali richiesti.
 * I civici sono deduplicati sulla sola parte numerica, coerente con extractCivicNumber (lib/streets).
 */
export function createCollector(codes) {
  const wanted = new Set(codes);
  /** @type {Map<string, Map<string, Set<string>>>} codice → via → civici */
  const byCode = new Map(codes.map((c) => [c, new Map()]));

  const streetsOf = (cols) => {
    if (!wanted.has(cols[COL_CODE])) return null;
    const odonimo = normalizeOdonimo(cols[COL_ODONIMO] ?? '');
    if (!odonimo) return null;
    const streets = byCode.get(cols[COL_CODE]);
    if (!streets.has(odonimo)) streets.set(odonimo, new Set());
    return streets.get(odonimo);
  };

  return {
    addStradLine(line) {
      streetsOf(line.split(';'));
    },
    addIndirLine(line) {
      const cols = line.split(';');
      const civici = streetsOf(cols);
      const civic = civici && civicNumber(cols[COL_CIVICO] ?? '');
      if (civic) civici.add(civic);
    },
    /** { codice: { ODONIMO: ["1", "2", ...] } } con vie e civici ordinati */
    result() {
      const out = {};
      for (const [code, streets] of byCode) {
        out[code] = Object.fromEntries(
          [...streets.keys()].sort((a, b) => a.localeCompare(b)).map((s) => [
            s,
            [...streets.get(s)].sort((a, b) => Number(a) - Number(b)),
          ]),
        );
      }
      return out;
    },
  };
}

/** Legge riga per riga il (primo) CSV contenuto in uno zip, in streaming. Restituisce il nome del file. */
function forEachLineInZip(readable, onLine) {
  return new Promise((resolve, reject) => {
    let fileName = '';
    let rest = '';
    let header = true;
    const decoder = new TextDecoder('latin1');
    const unzip = new Unzip((file) => {
      if (fileName) return; // solo il primo file
      fileName = file.name;
      file.ondata = (err, chunk, final) => {
        if (err) return reject(err);
        const lines = (rest + decoder.decode(chunk, { stream: !final })).split(/\r?\n/);
        rest = lines.pop() ?? '';
        for (const line of lines) {
          if (header) { header = false; continue; }
          if (line) onLine(line);
        }
        if (final) {
          if (rest) onLine(rest);
          resolve(fileName);
        }
      };
      file.start();
    });
    unzip.register(UnzipInflate);
    readable.on('data', (chunk) => unzip.push(new Uint8Array(chunk)));
    readable.on('end', () => unzip.push(new Uint8Array(0), true));
    readable.on('error', reject);
  });
}

async function openZip(dataset, localPath) {
  if (localPath) return fs.createReadStream(localPath);
  console.log(`Scarico ${dataset}…`);
  const res = await fetch(`${BASE_URL}?${dataset}`, { headers: { 'User-Agent': 'webapp-excel anncsu-extract' } });
  if (!res.ok || !res.body) throw new Error(`Download ${dataset} fallito: HTTP ${res.status}`);
  return Readable.fromWeb(res.body);
}

async function main() {
  const [stradZip, indirZip] = process.argv.slice(2);
  const codeToSlug = Object.fromEntries(Object.entries(CITY_CADASTRAL_CODES).map(([slug, code]) => [code, slug]));
  const collector = createCollector(Object.keys(codeToSlug));

  const stradName = await forEachLineInZip(await openZip('STRAD_LOMB', stradZip), collector.addStradLine);
  await forEachLineInZip(await openZip('INDIR_LOMB', indirZip), collector.addIndirLine);

  // Data di estrazione dal nome file, es. STRAD_LOMB_20260915.csv → 2026-09-15
  const ymd = stradName.match(/(\d{4})(\d{2})(\d{2})/);
  const date = ymd ? `${ymd[1]}-${ymd[2]}-${ymd[3]}` : new Date().toISOString().slice(0, 10);

  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const [code, streets] of Object.entries(collector.result())) {
    const slug = codeToSlug[code];
    const civici = Object.values(streets).reduce((n, list) => n + list.length, 0);
    // Una via per riga: file leggibili e diff git compatti a ogni aggiornamento mensile
    const body = Object.entries(streets)
      .map(([street, list]) => `    ${JSON.stringify(street)}: ${JSON.stringify(list)}`)
      .join(',\n');
    fs.writeFileSync(
      path.join(OUT_DIR, `${slug}.json`),
      `{\n  "source": "ANNCSU",\n  "date": "${date}",\n  "streets": {\n${body}\n  }\n}\n`,
    );
    console.log(`${slug} (${code}): ${Object.keys(streets).length} vie, ${civici} civici`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
