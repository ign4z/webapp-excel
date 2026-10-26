import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import type { Form1Values, Form2Values } from '@/lib/schema';
import { computeValuation } from '@/lib/valuation';
import { defaultConfig } from '@/lib/config';

// Servizi esterni simulati: nel Blob solo la lista vie di Opera (config di default), niente email né verifica anti-bot reali
vi.mock('@/lib/blob-json-cache', () => ({
  readBlobJson: vi.fn(async (path: string) => (path === 'streets/opera.json' ? { 'via roma': 2050 } : null)),
  writeBlobJson: vi.fn(),
  invalidateBlobJson: vi.fn(),
}));
vi.mock('@/lib/captcha', () => ({ verifyCaptcha: vi.fn(async () => true) }));
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
const { verifyCaptcha } = await import('@/lib/captcha');
const { saveReport } = await import('@/lib/reports-storage');
const { sendForm2Email, sendAdminNotification } = await import('@/lib/email');
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

// Valore atteso calcolato con il prezzo del blob simulato (2050 €/mq), non con quello del client
const expectedFinal = computeValuation({ ...form1, ...form2 }, 2050, defaultConfig.coefficienti).finalValue;

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
  const res = await postForm1(request('/api/form-1', { ...form1, captchaToken: 'ok' }));
  expect(res.status).toBe(200);
  vi.mocked(after).mockClear(); // conta solo le chiamate di step 2
  return res.json();
}

const originalEnv = { ...process.env };

beforeEach(() => {
  process.env.SESSION_SECRET = 'test-secret';
  vi.mocked(verifyCaptcha).mockResolvedValue(true);
  vi.clearAllMocks();
});

afterEach(() => {
  process.env = { ...originalEnv };
});

describe('POST /api/form-1', () => {
  it('calcola il valore preliminare lato server e restituisce il sessionToken', async () => {
    const res = await postForm1(request('/api/form-1', { ...form1, captchaToken: 'ok' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.result.estimatedValue).toBe(205000);
    expect(body.result).not.toHaveProperty('pricePerSqm');
    expect(body.sessionToken).toEqual(expect.any(String));
    expect(body.form1Data).toEqual(form1);
    expect(after).toHaveBeenCalledOnce();
  });

  it('comune fuori whitelist → 400', async () => {
    const res = await postForm1(request('/api/form-1', { ...form1, city: 'Milano', captchaToken: 'ok' }));
    expect(res.status).toBe(400);
    expect(after).not.toHaveBeenCalled();
  });

  it('dati non validi → 400 con dettagli zod', async () => {
    const res = await postForm1(request('/api/form-1', { ...form1, squareMeters: 5, captchaToken: 'ok' }));
    expect(res.status).toBe(400);
    expect((await res.json()).details).toBeDefined();
  });

  it('verifica anti-bot fallita → 400', async () => {
    vi.mocked(verifyCaptcha).mockResolvedValueOnce(false);
    const res = await postForm1(request('/api/form-1', { ...form1, captchaToken: 'ko' }));
    expect(res.status).toBe(400);
  });

  it('oltre 10 richieste dallo stesso IP → 429', async () => {
    const body = JSON.stringify({ ...form1, captchaToken: 'ok' });
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
    const res = await postForm2(request('/api/form-2', { ...form2, form1Data, sessionToken, captchaToken: 'ok' }));
    expect(res.status).toBe(200);
    // Al cliente solo il valore finale: base, coefficienti e dettagli restano nel report admin
    expect(await res.json()).toEqual({ finalValuation: { finalValue: expectedFinal } });
    expect(saveReport).toHaveBeenCalledOnce();
    expect(vi.mocked(saveReport).mock.calls[0][0]).toMatch(/^\d{4}-\d{2}-\d{2}_rossi_[0-9a-f-]{36}\.xlsx$/);
    expect(after).toHaveBeenCalledOnce();
  });

  it('email a cliente e admin senza report allegato', async () => {
    const { form1Data, sessionToken } = await completeStep1();
    await postForm2(request('/api/form-2', { ...form2, form1Data, sessionToken, captchaToken: 'ok' }));
    await (vi.mocked(after).mock.calls[0][0] as () => Promise<void>)();
    for (const send of [sendForm2Email, sendAdminNotification]) {
      expect(send).toHaveBeenCalledOnce();
      expect(vi.mocked(send).mock.calls[0][0]).not.toHaveProperty('attachment');
    }
  });

  it('ignora un prezzo €/mq inviato dal client', async () => {
    const { form1Data, sessionToken } = await completeStep1();
    const res = await postForm2(request('/api/form-2', {
      ...form2, form1Data, sessionToken, captchaToken: 'ok', pricePerSqm: 99999,
    }));
    expect(res.status).toBe(200);
    expect((await res.json()).finalValuation.finalValue).toBe(expectedFinal);
  });

  it('form1Data manomesso (mq gonfiati) → 400', async () => {
    const { form1Data, sessionToken } = await completeStep1();
    const res = await postForm2(request('/api/form-2', {
      ...form2, form1Data: { ...form1Data, squareMeters: 1000 }, sessionToken, captchaToken: 'ok',
    }));
    expect(res.status).toBe(400);
    expect(saveReport).not.toHaveBeenCalled();
  });

  it('token mancante → 400', async () => {
    const res = await postForm2(request('/api/form-2', { ...form2, form1Data: form1, captchaToken: 'ok' }));
    expect(res.status).toBe(400);
    expect(saveReport).not.toHaveBeenCalled();
  });

  it('token firmato con un altro segreto → 400', async () => {
    const { form1Data, sessionToken } = await completeStep1();
    process.env.SESSION_SECRET = 'altro-segreto';
    const res = await postForm2(request('/api/form-2', { ...form2, form1Data, sessionToken, captchaToken: 'ok' }));
    expect(res.status).toBe(400);
  });
});
