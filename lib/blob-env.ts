// lib/blob-env.ts
// Guardia contro le scritture sullo store Blob di produzione fuori dalla produzione.
// In locale le credenziali Blob devono puntare allo store di sviluppo; se in .env.local è impostato
// BLOB_PRODUCTION_STORE_ID e lo store in uso è quello, ogni scrittura/cancellazione viene rifiutata.
// In produzione (VERCEL_ENV=production) o senza BLOB_PRODUCTION_STORE_ID la guardia non fa nulla.

import { createLogger } from '@/lib/logger';

const log = createLogger('blob-env');

/** Id dello store contenuto nel token (`vercel_blob_rw_<storeId>_<segreto>`), o null se il formato non torna. */
export function blobStoreId(token = process.env.BLOB_READ_WRITE_TOKEN): string | null {
  const match = token?.match(/^vercel_blob_rw_([A-Za-z0-9]+)_/);
  return match ? match[1] : null;
}

const normalizeStoreId = (id: string) => id.trim().replace(/^store_/i, '').toLowerCase();

/**
 * Store usato da @vercel/blob con le variabili d'ambiente correnti, con la stessa precedenza dell'SDK:
 * OIDC (`VERCEL_OIDC_TOKEN` + `BLOB_STORE_ID`, store collegati di recente) prima del token `BLOB_READ_WRITE_TOKEN`.
 */
export function activeBlobStoreId(): string | null {
  const oidcStore = process.env.BLOB_STORE_ID;
  if (process.env.VERCEL_OIDC_TOKEN?.trim() && oidcStore?.trim()) return normalizeStoreId(oidcStore);
  const fromToken = blobStoreId();
  return fromToken ? normalizeStoreId(fromToken) : null;
}

/** Lancia se fuori dalla produzione si sta per scrivere sullo store di produzione. */
export function assertBlobWritable(operation: string): void {
  if (process.env.VERCEL_ENV === 'production') return;
  // Accetta sia l'id del token sia quello mostrato da Vercel (`store_<id>`)
  const productionId = process.env.BLOB_PRODUCTION_STORE_ID?.trim();
  if (!productionId) return;
  if (activeBlobStoreId() !== normalizeStoreId(productionId)) return;

  log.error('Scrittura bloccata: le credenziali Blob sono quelle dello store di produzione', { operation });
  throw new Error(
    `Scrittura su Blob bloccata (${operation}): le credenziali Blob puntano allo store di produzione. ` +
      'In locale usa lo store di sviluppo (vedi README, "Store Blob di sviluppo").',
  );
}
