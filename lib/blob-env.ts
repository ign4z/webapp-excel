// lib/blob-env.ts
// Guardia contro le scritture sullo store Blob di produzione fuori dalla produzione.
// In locale BLOB_READ_WRITE_TOKEN deve puntare allo store di sviluppo; se in .env.local è impostato
// BLOB_PRODUCTION_STORE_ID e il token appartiene a quello store, ogni scrittura/cancellazione viene rifiutata.
// In produzione (VERCEL_ENV=production) o senza BLOB_PRODUCTION_STORE_ID la guardia non fa nulla.

import { createLogger } from '@/lib/logger';

const log = createLogger('blob-env');

/** Id dello store contenuto nel token (`vercel_blob_rw_<storeId>_<segreto>`), o null se il formato non torna. */
export function blobStoreId(token = process.env.BLOB_READ_WRITE_TOKEN): string | null {
  const match = token?.match(/^vercel_blob_rw_([A-Za-z0-9]+)_/);
  return match ? match[1] : null;
}

/** Lancia se fuori dalla produzione si sta per scrivere sullo store di produzione. */
export function assertBlobWritable(operation: string): void {
  if (process.env.VERCEL_ENV === 'production') return;
  // Accetta sia l'id del token sia quello mostrato da Vercel (`store_<id>`)
  const productionId = process.env.BLOB_PRODUCTION_STORE_ID?.trim().replace(/^store_/i, '');
  if (!productionId) return;
  if (blobStoreId()?.toLowerCase() !== productionId.toLowerCase()) return;

  log.error('Scrittura bloccata: il token Blob è quello dello store di produzione', { operation });
  throw new Error(
    `Scrittura su Blob bloccata (${operation}): BLOB_READ_WRITE_TOKEN punta allo store di produzione. ` +
      'In locale usa il token dello store di sviluppo (vedi README, "Store Blob di sviluppo").',
  );
}
