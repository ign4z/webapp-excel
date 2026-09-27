// lib/blob-json-cache.ts
// Lettura/scrittura di JSON (config, prezzi strade) sullo store Vercel Blob PRIVATO, con cache in-memory per istanza.
// Ogni lettura fa un list() leggero e confronta uploadedAt: il JSON viene riscaricato solo
// se il blob è cambiato. Così un salvataggio admin si propaga a TUTTE le istanze serverless,
// non solo a quella che ha gestito la richiesta di salvataggio.

import { list, get, put } from '@vercel/blob';
import { assertBlobWritable } from '@/lib/blob-env';

type Entry = { version: number; data: unknown };

const cache = new Map<string, Entry>();

/**
 * Restituisce il contenuto JSON del blob `path`, oppure null se il blob non esiste.
 * Lancia in caso di errore di rete/fetch: il chiamante decide il fallback.
 */
export async function readBlobJson<T>(path: string): Promise<T | null> {
  const { blobs } = await list({ prefix: path, limit: 1 });
  const blob = blobs.find((b) => b.pathname === path);
  if (!blob) {
    cache.delete(path);
    return null;
  }

  const version = blob.uploadedAt.getTime();
  const cached = cache.get(path);
  if (cached && cached.version === version) return cached.data as T;

  // useCache: false → legge dall'origine, evita di servire la versione precedente dalla CDN
  const result = await get(path, { access: 'private', useCache: false });
  if (!result || result.statusCode !== 200) throw new Error(`Blob read failed for ${path}`);

  const data = JSON.parse(await new Response(result.stream).text()) as T;
  cache.set(path, { version, data });
  return data;
}

/** Salva un JSON (sovrascrivendo) e aggiorna subito la cache dell'istanza corrente. */
export async function writeBlobJson(path: string, data: unknown): Promise<void> {
  assertBlobWritable(`write ${path}`);
  await put(path, JSON.stringify(data, null, 2), {
    access: 'private',
    allowOverwrite: true,
    contentType: 'application/json',
  });
  cache.delete(path);
}

/** Svuota la cache locale (dopo un salvataggio, per rileggere subito sull'istanza corrente). */
export function invalidateBlobJson(path?: string): void {
  if (path) cache.delete(path);
  else cache.clear();
}
