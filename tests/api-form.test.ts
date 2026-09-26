import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import type { Form1Values, Form2Values } from '@/lib/schema';

// Servizi esterni simulati: nel Blob solo la lista vie di Opera (config di default), niente email né reCAPTCHA reali
vi.mock('@/lib/blob-json-cache', () => ({
  readBlobJson: vi.fn(async (path: string) => (path === 'streets/opera.json' ? { 'via roma': 2050 } : null)),
  writeBlobJson: vi.fn(),
  invalidateBlobJson: vi.fn(),
}));
vi.mock('@/lib/recaptcha', () => ({ verifyRecaptcha: vi.fn(async () => true) }));
vi.mock('@/lib/email', () => ({
  sendForm1Email: vi.fn(),
  sendForm2Email: vi.fn(),
  sendAdminNotification: vi.fn(),
}));
vi.mock('@/lib/reports-storage', () => ({ saveReport: vi.fn(async () => ({ url: 'blob://report' })) }));
vi.mock('next/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/server')>()),
  after: vi.fn(),
}));

const { POST: postForm1 } = await import('@/app/api/form-1/route');
const { POST: postForm2 } = await import('@/app/api/form-2/route');
const { verifyRecaptcha } = await import('@/lib/recaptcha');
const { saveReport } = await import('@/lib/reports-storage');
const { after } = await import('next/server');

// Opera, "via roma" nel blob simulato vale 2050 €/mq
const form1: Form1Values = {
  firstName: 'Mario', lastName: 'Rossi', email: 'mario@example.com', phone: '3331234567',
  city: 'Opera', address: 'Via Roma, 15, 20090 Opera MI, Italia', squareMeters: 100,
  tipologia: 'appartamento', piano: 'piano2', locali: 'locali3', bagni: 'bagno1',
};

const form2: Form2Values = {
  stato: 'buono', classeEnergetica: 'D', annoCostruzione: 'dal1981al2000', ascensore: 'si',
  terrazzo: 'balcone', giardino: 'nessuno', garage: 'boxSingolo', cantina: 'si',
  riscaldamento: 'autonomo',
};

// IP diverso per ogni richiesta: il rate limit in memoria non deve interferire tra i test
let ipCounter = 0;
function request(path: string, body: unknown): NextRequest {
  return new NextRequest(`http://localhost${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': `10.0.0.${++ipCounter}` },
    body: JSON.stringify(body),
  });
}

async function completeStep1(): Promise<{ form1Data: Form1Values; sessionToken: string }> {
  const res = await postForm1(request('/api/form-1', { ...form1, recaptchaToken: 'ok' }));
  expect(res.status).toBe(200);
  vi.mocked(after).mockClear(); // conta solo le chiamate di step 2
  return res.json();
}

const originalEnv = { ...process.env };

beforeEach(() => {
  process.env.SESSION_SECRET = 'test-secret';
  vi.mocked(verifyRecaptcha).mockResolvedValue(true);
  vi.clearAllMocks();
});

afterEach(() => {
  process.env = { ...originalEnv };
});

describe('POST /api/form-1', () => {
  it('calcola il valore preliminare lato server e restituisce il sessionToken', async () => {
    const res = await postForm1(request('/api/form-1', { ...form1, recaptchaToken: 'ok' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.result.pricePerSqm).toBe(2050);
    expect(body.result.estimatedValue).toBe(205000);
    expect(body.sessionToken).toEqual(expect.any(String));
    expect(body.form1Data).toEqual(form1);
    expect(after).toHaveBeenCalledOnce();
  });

  it('comune fuori whitelist → 400', async () => {
    const res = await postForm1(request('/api/form-1', { ...form1, city: 'Milano', recaptchaToken: 'ok' }));
    expect(res.status).toBe(400);
    expect(after).not.toHaveBeenCalled();
  });

  it('dati non validi → 400 con dettagli zod', async () => {
    const res = await postForm1(request('/api/form-1', { ...form1, squareMeters: 5, recaptchaToken: 'ok' }));
    expect(res.status).toBe(400);
    expect((await res.json()).details).toBeDefined();
  });

  it('reCAPTCHA fallito → 400', async () => {
    vi.mocked(verifyRecaptcha).mockResolvedValueOnce(false);
    const res = await postForm1(request('/api/form-1', { ...form1, recaptchaToken: 'ko' }));
    expect(res.status).toBe(400);
  });

  it('oltre 10 richieste dallo stesso IP → 429', async () => {
    const body = JSON.stringify({ ...form1, recaptchaToken: 'ok' });
    const sameIp = () => new NextRequest('http://localhost/api/form-1', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': '192.168.1.1' },
      body,
    });
    for (let i = 0; i < 10; i++) expect((await postForm1(sameIp())).status).toBe(200);
    const res = await postForm1(sameIp());
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBeTruthy();
  });
});

describe('POST /api/form-2', () => {
  it('con token valido calcola la valutazione e salva il report', async () => {
    const { form1Data, sessionToken } = await completeStep1();
    const res = await postForm2(request('/api/form-2', { ...form2, form1Data, sessionToken, recaptchaToken: 'ok' }));
    expect(res.status).toBe(200);
    const { finalValuation } = await res.json();
    expect(finalValuation.baseValue).toBe(205000);
    expect(finalValuation.finalValue).toBe(Math.round(205000 * finalValuation.coeffTotale));
    expect(saveReport).toHaveBeenCalledOnce();
    expect(vi.mocked(saveReport).mock.calls[0][0]).toMatch(/^\d{4}-\d{2}-\d{2}_rossi_[0-9a-f-]{36}\.xlsx$/);
    expect(after).toHaveBeenCalledOnce();
  });

  it('ignora un prezzo €/mq inviato dal client', async () => {
    const { form1Data, sessionToken } = await completeStep1();
    const res = await postForm2(request('/api/form-2', {
      ...form2, form1Data, sessionToken, recaptchaToken: 'ok', pricePerSqm: 99999,
    }));
    expect(res.status).toBe(200);
    expect((await res.json()).finalValuation.baseValue).toBe(205000);
  });

  it('form1Data manomesso (mq gonfiati) → 400', async () => {
    const { form1Data, sessionToken } = await completeStep1();
    const res = await postForm2(request('/api/form-2', {
      ...form2, form1Data: { ...form1Data, squareMeters: 1000 }, sessionToken, recaptchaToken: 'ok',
    }));
    expect(res.status).toBe(400);
    expect(saveReport).not.toHaveBeenCalled();
  });

  it('token mancante → 400', async () => {
    const res = await postForm2(request('/api/form-2', { ...form2, form1Data: form1, recaptchaToken: 'ok' }));
    expect(res.status).toBe(400);
    expect(saveReport).not.toHaveBeenCalled();
  });

  it('token firmato con un altro segreto → 400', async () => {
    const { form1Data, sessionToken } = await completeStep1();
    process.env.SESSION_SECRET = 'altro-segreto';
    const res = await postForm2(request('/api/form-2', { ...form2, form1Data, sessionToken, recaptchaToken: 'ok' }));
    expect(res.status).toBe(400);
  });
});
