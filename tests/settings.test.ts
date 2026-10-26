import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

// Blob simulato: un solo JSON in memoria per config/settings.json
const store = vi.hoisted(() => ({ value: null as unknown }));
vi.mock('@/lib/blob-json-cache', () => ({
  readBlobJson: vi.fn(async () => store.value),
  writeBlobJson: vi.fn(async (_path: string, data: unknown) => { store.value = data; }),
  invalidateBlobJson: vi.fn(),
}));

const { getNotificationEmails } = await import('@/lib/settings');
const { GET, POST } = await import('@/app/api/admin/settings/route');

const ADMIN = 'token-admin';
const call = (method: 'GET' | 'POST', body?: unknown, token = ADMIN) =>
  (method === 'GET' ? GET : POST)(new NextRequest('http://localhost/api/admin/settings', {
    method,
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  }));

beforeEach(() => {
  store.value = null;
  vi.stubEnv('ADMIN_TOKEN', ADMIN);
  vi.stubEnv('ADMIN_EMAIL', 'fallback@agenzia.it');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('getNotificationEmails', () => {
  it('senza impostazioni usa ADMIN_EMAIL (anche più indirizzi separati da virgola)', async () => {
    expect(await getNotificationEmails()).toEqual(['fallback@agenzia.it']);
    vi.stubEnv('ADMIN_EMAIL', 'a@x.it, b@x.it');
    expect(await getNotificationEmails()).toEqual(['a@x.it', 'b@x.it']);
  });

  it('con destinatari salvati usa quelli', async () => {
    store.value = { notificationEmails: ['agente@agenzia.it'] };
    expect(await getNotificationEmails()).toEqual(['agente@agenzia.it']);
  });

  it('ignora un blob non valido', async () => {
    store.value = { notificationEmails: ['non-una-email'] };
    expect(await getNotificationEmails()).toEqual(['fallback@agenzia.it']);
  });
});

describe('/api/admin/settings', () => {
  it('401 senza token admin', async () => {
    expect((await call('GET', undefined, 'sbagliato')).status).toBe(401);
    expect((await call('POST', { notificationEmails: [] }, 'sbagliato')).status).toBe(401);
    expect(store.value).toBeNull();
  });

  it('GET restituisce impostazioni e fallback', async () => {
    const body = await (await call('GET')).json();
    expect(body).toEqual({ success: true, data: { notificationEmails: [] }, fallbackEmails: ['fallback@agenzia.it'] });
  });

  it('POST normalizza e salva gli indirizzi', async () => {
    const res = await call('POST', { notificationEmails: ['  Agente@Agenzia.IT '] });
    expect(res.status).toBe(200);
    expect(store.value).toEqual({ notificationEmails: ['agente@agenzia.it'] });
  });

  it.each([
    ['email non valida', { notificationEmails: ['non-una-email'] }],
    ['duplicati', { notificationEmails: ['a@x.it', 'A@x.it'] }],
    ['troppi indirizzi', { notificationEmails: ['a@x.it', 'b@x.it', 'c@x.it', 'd@x.it', 'e@x.it', 'f@x.it'] }],
    ['chiave sconosciuta', { notificationEmails: [], altro: true }],
  ])('POST rifiuta: %s', async (_name, body) => {
    expect((await call('POST', body)).status).toBe(400);
    expect(store.value).toBeNull();
  });
});
