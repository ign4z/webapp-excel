// lib/reports-storage.ts
// Archiviazione dei report Excel (contengono dati personali del cliente) nello store Vercel Blob PRIVATO.
// I file non sono raggiungibili via URL: l'admin li scarica tramite /api/admin/files/download (autenticata).

import { put, list, del, get } from '@vercel/blob';

export interface StoredReport {
  url: string;
  filename: string;
  size: number;
  uploadedAt: string;
}

const REPORTS_PREFIX = 'valutazioni/';
const BLOB_HOST_SUFFIX = '.blob.vercel-storage.com';

/** Salva un report sotto valutazioni/ e restituisce l'URL (non accessibile senza token). */
export async function saveReport(filename: string, content: Buffer): Promise<{ url: string }> {
  const blob = await put(`${REPORTS_PREFIX}${filename}`, content, { access: 'private' });
  return { url: blob.url };
}

/** Tutti i report, più recenti prima. */
export async function listReports(): Promise<StoredReport[]> {
  const out: StoredReport[] = [];
  let cursor: string | undefined;
  do {
    const page = await list({ prefix: REPORTS_PREFIX, cursor, limit: 1000 });
    for (const b of page.blobs) {
      if (!b.pathname.endsWith('.xlsx')) continue;
      out.push({ url: b.url, filename: b.pathname, size: b.size, uploadedAt: b.uploadedAt.toISOString() });
    }
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return out.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
}

/** Accetta solo URL .xlsx di Vercel Blob: evita SSRF e la cancellazione di config/strade. */
export function isReportUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === 'https:' && u.hostname.endsWith(BLOB_HOST_SUFFIX) && u.pathname.endsWith('.xlsx');
  } catch {
    return false;
  }
}

export async function deleteReport(url: string): Promise<void> {
  await del(url);
}

/** Stream del contenuto di un report, o null se non trovato. */
export async function readReport(url: string): Promise<ReadableStream<Uint8Array> | null> {
  const result = await get(url, { access: 'private' });
  return result?.statusCode === 200 ? result.stream : null;
}
