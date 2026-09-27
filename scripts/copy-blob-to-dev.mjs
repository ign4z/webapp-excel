// scripts/copy-blob-to-dev.mjs
// Copia config e prezzi strade dallo store Blob di PRODUZIONE allo store di SVILUPPO (quello di .env.local:
// OIDC con VERCEL_OIDC_TOKEN + BLOB_STORE_ID, oppure BLOB_READ_WRITE_TOKEN).
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
const tokenStore = (token) => token?.match(/^vercel_blob_rw_([A-Za-z0-9]+)_/)?.[1]?.toLowerCase() ?? null;
// Stessa precedenza di @vercel/blob: OIDC (VERCEL_OIDC_TOKEN + BLOB_STORE_ID) prima di BLOB_READ_WRITE_TOKEN
const devStore = process.env.VERCEL_OIDC_TOKEN && process.env.BLOB_STORE_ID
  ? process.env.BLOB_STORE_ID.replace(/^store_/i, '').toLowerCase()
  : tokenStore(process.env.BLOB_READ_WRITE_TOKEN);

if (!PROD || !devStore) {
  console.error('Servono PROD_BLOB_READ_WRITE_TOKEN (store produzione) e le credenziali dello store di sviluppo in .env.local.');
  process.exit(1);
}
if (tokenStore(PROD) === devStore) {
  console.error('Le credenziali di .env.local puntano allo store di produzione: rifai `vercel env pull .env.local`.');
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

  // Senza token: credenziali di .env.local (store di sviluppo)
  await put(b.pathname, text, { access: 'private', allowOverwrite: true, contentType: 'application/json' });
  console.log(`  ✓ ${b.pathname}`);
}

console.log(failed ? `\n${failed} errori.` : '\nCopia completata.');
process.exit(failed ? 1 : 0);
