import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

const blobs = vi.hoisted(() => ({
  list: vi.fn(),
  del: vi.fn(async () => {}),
}));
vi.mock('@vercel/blob', () => ({ list: blobs.list, del: blobs.del, put: vi.fn(), get: vi.fn() }));

const { purgeReportsOlderThan } = await import('@/lib/reports-storage');
const { GET } = await import('@/app/api/cron/purge-reports/route');

const blob = (name: string, uploadedAt: string) => ({
  url: `https://x.private.blob.vercel-storage.com/valutazioni/${name}`,
  pathname: `valutazioni/${name}`,
  size: 1000,
  uploadedAt: new Date(uploadedAt),
});

beforeEach(() => {
  vi.stubEnv('BLOB_PRODUCTION_STORE_ID', ''); // guardia store di produzione disattivata
  blobs.del.mockClear();
  blobs.list.mockResolvedValue({
    blobs: [
      blob('vecchio.xlsx', '2023-01-10T00:00:00Z'),
      blob('recente.xlsx', '2026-06-01T00:00:00Z'),
      blob('altro.json', '2020-01-01T00:00:00Z'), // non è un report: non va toccato
    ],
    hasMore: false,
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('purgeReportsOlderThan', () => {
  it('cancella solo i report .xlsx caricati prima del cutoff', async () => {
    const deleted = await purgeReportsOlderThan(new Date('2024-10-26T00:00:00Z'));
    expect(deleted).toBe(1);
    expect(blobs.del).toHaveBeenCalledWith([expect.stringContaining('vecchio.xlsx')]);
  });

  it('non chiama del se non c\'è nulla da cancellare', async () => {
    expect(await purgeReportsOlderThan(new Date('2000-01-01T00:00:00Z'))).toBe(0);
    expect(blobs.del).not.toHaveBeenCalled();
  });
});

describe('GET /api/cron/purge-reports', () => {
  const call = (auth?: string) =>
    GET(new NextRequest('http://localhost/api/cron/purge-reports', { headers: auth ? { authorization: auth } : {} }));

  it('401 senza CRON_SECRET configurato (fail-closed)', async () => {
    vi.stubEnv('CRON_SECRET', '');
    expect((await call('Bearer ')).status).toBe(401);
    expect(blobs.del).not.toHaveBeenCalled();
  });

  it('401 con secret mancante o sbagliato', async () => {
    vi.stubEnv('CRON_SECRET', 'giusto');
    expect((await call()).status).toBe(401);
    expect((await call('Bearer sbagliato')).status).toBe(401);
    expect(blobs.del).not.toHaveBeenCalled();
  });

  it('con il secret corretto cancella i report scaduti', async () => {
    vi.stubEnv('CRON_SECRET', 'giusto');
    const res = await call('Bearer giusto');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, deleted: 1 });
  });
});
