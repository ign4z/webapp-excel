// scripts/copy-blob-to-dev.mjs
// Copia config e prezzi strade dallo store Blob di PRODUZIONE allo store di SVILUPPO (quello di .env.local).
// Solo lettura sulla produzione. Non copia i report .xlsx (dati personali dei clienti).
//
// Uso (il token di produzione si passa solo per questo comando, non va salvato in .env.local):
//   PROD_BLOB_READ_WRITE_TOKEN=<store produzione> node scripts/copy-blob-to-dev.mjs            # anteprima
//   PROD_BLOB_READ_WRITE_TOKEN=<store produzione> node scripts/copy-blob-to-dev.mjs --apply    # copia

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
require('@next/env').loadEnvConfig(process.cwd());
const { list, put, get } = require('@vercel/blob');

const apply = process.argv.includes('--apply');
const PROD = process.env.PROD_BLOB_READ_WRITE_TOKEN;
const DEV = process.env.BLOB_READ_WRITE_TOKEN;
const storeId = (token) => token?.match(/^vercel_blob_rw_([A-Za-z0-9]+)_/)?.[1]?.toLowerCase() ?? null;

if (!PROD || !DEV) {
  console.error('Servono PROD_BLOB_READ_WRITE_TOKEN (store produzione) e BLOB_READ_WRITE_TOKEN in .env.local (store sviluppo).');
  process.exit(1);
}
if (PROD === DEV || storeId(PROD) === storeId(DEV)) {
  console.error('BLOB_READ_WRITE_TOKEN di .env.local punta allo store di produzione: mettici il token dello store di sviluppo.');
  process.exit(1);
}

const isToCopy = (p) => p === 'config/valuation-parameters.json' || /^streets\/[a-z0-9-]+\.json$/.test(p);

const { blobs } = await list({ token: PROD, limit: 1000 });
const toCopy = blobs.filter((b) => isToCopy(b.pathname));

console.log(`Da copiare in sviluppo (${toCopy.length}):`);
for (const b of toCopy) console.log('  +', b.pathname);

if (!apply) {
  console.log('\nAnteprima: nessuna scrittura. Rilancia con --apply per copiare (sovrascrive i file dello store di sviluppo).');
  process.exit(0);
}

let failed = 0;
for (const b of toCopy) {
  const res = await get(b.pathname, { access: 'private', token: PROD, useCache: false });
  if (res?.statusCode !== 200) {
    console.error(`  ✗ ${b.pathname}: lettura fallita`);
    failed++;
    continue;
  }
  const text = await new Response(res.stream).text();
  JSON.parse(text); // deve essere JSON valido

  await put(b.pathname, text, { access: 'private', token: DEV, allowOverwrite: true, contentType: 'application/json' });
  console.log(`  ✓ ${b.pathname}`);
}

console.log(failed ? `\n${failed} errori.` : '\nCopia completata.');
process.exit(failed ? 1 : 0);
