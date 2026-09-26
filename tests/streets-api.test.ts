import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Blob simulato: Locate ha una lista con nomi Google (anche diversi da ANNCSU), gli altri comuni no
const { blobs } = vi.hoisted(() => ({ blobs: new Map<string, Record<string, number>>() }));
vi.mock('@/lib/blob-json-cache', () => ({
  readBlobJson: vi.fn(async (path: string) => blobs.get(path) ?? null),
  invalidateBlobJson: vi.fn(),
}));

const { GET } = await import('@/app/api/streets/route');
const { getOfficialStreets } = await import('@/lib/streets/anncsu');

const get = async (city: string) => {
  const res = await GET(new NextRequest(`http://localhost/api/streets?city=${encodeURIComponent(city)}`));
  return { status: res.status, body: await res.json() };
};

beforeEach(() => {
  blobs.clear();
  blobs.set('streets/locate-di-triulzi.json', {
    'via xxv aprile': 2020,
    'via romanoni': 1970,
    'via romanoni:5': 2100,
    'via inventata': 1800,
  });
});

describe('GET /api/streets', () => {
  it('vie della lista prezzi con etichetta e civici, senza prezzi', async () => {
    const { status, body } = await get('Locate di Triulzi');
    expect(status).toBe(200);
    expect(body.streets.map((s: { label: string }) => s.label)).toEqual(['Via Inventata', 'Via Romanoni', 'Via XXV Aprile']);
    expect(JSON.stringify(body)).not.toMatch(/2020|1970|2100|1800/);
  });

  it('civici ANNCSU anche per le vie col nome Google (numeri romani, nome abbreviato)', async () => {
    const { body } = await get('locate di triulzi');
    const byName = Object.fromEntries(body.streets.map((s: { name: string; civici: string[] }) => [s.name, s.civici]));
    const official = getOfficialStreets('locate-di-triulzi')!.streets;
    expect(byName['via xxv aprile']).toEqual(official['VIA VENTICINQUE APRILE']);
    expect(byName['via romanoni']).toContain('5');
    expect(byName['via romanoni'].length).toBeGreaterThanOrEqual(official['VIA CARLO ROMANONI'].length);
    expect(byName['via inventata']).toEqual([]);
  });

  it('lista prezzi vuota → vie ufficiali ANNCSU; frazione senza dati → lista vuota', async () => {
    const pieve = await get('Pieve Emanuele');
    expect(pieve.body.streets.length).toBe(Object.keys(getOfficialStreets('pieve-emanuele')!.streets).length);
    expect((await get('Fizzonasco')).body.streets).toEqual([]);
  });

  it('comune non supportato → 400', async () => {
    expect((await get('Milano')).status).toBe(400);
  });
});
