import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

// Geocoding simulato: ogni via viene "trovata" con il nome in minuscolo
vi.mock('@/lib/google-geocode', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/google-geocode')>();
  return {
    ...actual,
    geocodeStreetNames: vi.fn(async (streets: string[]) =>
      streets.map((s) => ({ status: 'found', route: s.toLowerCase(), partial: false }))),
  };
});

const { GET: getOfficial } = await import('@/app/api/admin/streets/official/route');
const { POST: postGoogle } = await import('@/app/api/admin/streets/google/route');
const { geocodeStreetNames, GoogleConfigError } = await import('@/lib/google-geocode');

const AUTH = { authorization: 'Bearer admin-token' };
const originalEnv = { ...process.env };

beforeEach(() => {
  process.env.ADMIN_TOKEN = 'admin-token';
  vi.clearAllMocks();
});

afterEach(() => {
  process.env = { ...originalEnv };
});

const official = (city: string, headers: Record<string, string> = AUTH) =>
  getOfficial(new NextRequest(`http://localhost/api/admin/streets/official?city=${city}`, { headers }));

const google = (body: unknown, headers: Record<string, string> = AUTH) =>
  postGoogle(new NextRequest('http://localhost/api/admin/streets/google', {
    method: 'POST',
    headers: { ...headers, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }));

describe('GET /api/admin/streets/official', () => {
  it('restituisce le vie ANNCSU con nome Google, civici e prezzo di default', async () => {
    const res = await official('opera');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(body.defaultPrice).toBe(1900);
    expect(body.streets.length).toBeGreaterThan(100);
    expect(body.streets[0]).toMatchObject({ anncsu: expect.any(String), google: { status: 'found' }, civici: expect.any(Array) });
    expect(vi.mocked(geocodeStreetNames).mock.calls[0][1]).toBe('Opera');
  });

  it('senza token → 401', async () => {
    expect((await official('opera', {})).status).toBe(401);
  });

  it('frazione senza dati ANNCSU → 404, comune non supportato → 400', async () => {
    expect((await official('fizzonasco')).status).toBe(404);
    expect((await official('milano')).status).toBe(400);
  });

  it('chiave Google non configurata → 503', async () => {
    vi.mocked(geocodeStreetNames).mockRejectedValueOnce(new GoogleConfigError('GOOGLE_MAPS_SERVER_KEY non configurata'));
    const res = await official('opera');
    expect(res.status).toBe(503);
    expect((await res.json()).error).toContain('GOOGLE_MAPS_SERVER_KEY');
  });
});

describe('POST /api/admin/streets/google', () => {
  it('restituisce il match Google per ogni via', async () => {
    const res = await google({ city: 'locate-di-triulzi', streets: ['piazza vittoria'] });
    expect(res.status).toBe(200);
    expect((await res.json()).results).toEqual([{ street: 'piazza vittoria', status: 'found', route: 'piazza vittoria', partial: false }]);
    expect(vi.mocked(geocodeStreetNames).mock.calls[0][1]).toBe('Locate di Triulzi');
  });

  it('senza token → 401; body non valido o troppe vie → 400', async () => {
    expect((await google({ city: 'opera', streets: ['via a'] }, {})).status).toBe(401);
    expect((await google({ city: 'opera', streets: [] })).status).toBe(400);
    expect((await google({ city: 'opera', streets: Array(301).fill('via a') })).status).toBe(400);
    expect((await google({ city: 'milano', streets: ['via a'] })).status).toBe(400);
  });
});
