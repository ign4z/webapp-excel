// scripts/migrate-blob-to-private.mjs
// Copia config e prezzi strade dal vecchio store Blob PUBBLICO al nuovo store PRIVATO.
// Non copia i report .xlsx né i file obsoleti della v1: spariranno eliminando il vecchio store.
//
// Uso (token presi da .env.local o dall'ambiente):
//   OLD_BLOB_READ_WRITE_TOKEN=<vecchio store>  NEW_BLOB_READ_WRITE_TOKEN=<nuovo store>
//   node scripts/migrate-blob-to-private.mjs            # anteprima, non scrive nulla
//   node scripts/migrate-blob-to-private.mjs --apply    # esegue la copia

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
require('@next/env').loadEnvConfig(process.cwd());
const { list, put, get } = require('@vercel/blob');

const apply = process.argv.includes('--apply');
const OLD = process.env.OLD_BLOB_READ_WRITE_TOKEN;
const NEW = process.env.NEW_BLOB_READ_WRITE_TOKEN;

if (!OLD || !NEW) {
  console.error('Servono OLD_BLOB_READ_WRITE_TOKEN (store pubblico) e NEW_BLOB_READ_WRITE_TOKEN (store privato).');
  process.exit(1);
}
if (OLD === NEW) {
  console.error('I due token coincidono: controlla di aver messo quello del nuovo store in NEW_BLOB_READ_WRITE_TOKEN.');
  process.exit(1);
}

const isToMigrate = (p) => p === 'config/valuation-parameters.json' || /^streets\/[a-z0-9-]+\.json$/.test(p);

const { blobs } = await list({ token: OLD, limit: 1000 });
const toCopy = blobs.filter((b) => isToMigrate(b.pathname));
const skipped = blobs.filter((b) => !isToMigrate(b.pathname));

console.log(`Da copiare (${toCopy.length}):`);
for (const b of toCopy) console.log('  +', b.pathname);
console.log(`Non copiati, spariranno con il vecchio store (${skipped.length}):`);
for (const b of skipped) console.log('  -', b.pathname);

if (!apply) {
  console.log('\nAnteprima: nessuna scrittura. Rilancia con --apply per copiare.');
  process.exit(0);
}

let failed = 0;
for (const b of toCopy) {
  const res = await fetch(b.url, { cache: 'no-store' });
  if (!res.ok) {
    console.error(`  ✗ ${b.pathname}: lettura fallita (${res.status})`);
    failed++;
    continue;
  }
  const text = await res.text();
  JSON.parse(text); // deve essere JSON valido

  await put(b.pathname, text, { access: 'private', token: NEW, allowOverwrite: true, contentType: 'application/json' });

  const check = await get(b.pathname, { access: 'private', token: NEW, useCache: false });
  const copied = check?.statusCode === 200 ? await new Response(check.stream).text() : null;
  if (copied === text) {
    console.log(`  ✓ ${b.pathname}`);
  } else {
    console.error(`  ✗ ${b.pathname}: verifica fallita`);
    failed++;
  }
}

console.log(failed ? `\n${failed} errori: NON eliminare il vecchio store.` : '\nMigrazione completata e verificata.');
process.exit(failed ? 1 : 0);
