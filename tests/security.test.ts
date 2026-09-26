import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createSessionToken, verifySessionToken } from '@/lib/session-token';
import { isValidAdminToken, isValidBasicAuth, safeEqual } from '@/lib/auth';
import type { Form1Values } from '@/lib/schema';

const form1: Form1Values = {
  firstName: 'Mario', lastName: 'Rossi', email: 'mario@example.com', phone: '3331234567',
  city: 'Opera', address: 'Via Roma, 15, 20090 Opera MI, Italia', squareMeters: 90,
  tipologia: 'appartamento', piano: 'piano2', locali: 'locali3', bagni: 'bagno1',
};

const originalEnv = { ...process.env };

beforeEach(() => {
  process.env.SESSION_SECRET = 'test-secret';
  process.env.ADMIN_TOKEN = 'admin-token';
  process.env.ADMIN_USERNAME = 'admin';
  process.env.ADMIN_PASSWORD = 'pw';
});

afterEach(() => {
  process.env = { ...originalEnv };
});

describe('session token', () => {
  it('valido per gli stessi dati', () => {
    expect(verifySessionToken(createSessionToken(form1), form1)).toBe(true);
  });

  it('rifiutato se i dati di step 1 sono stati modificati', () => {
    const token = createSessionToken(form1);
    expect(verifySessionToken(token, { ...form1, squareMeters: 900 })).toBe(false);
  });

  it('rifiutato se scaduto', () => {
    const token = createSessionToken(form1, Date.now() - 25 * 60 * 60 * 1000);
    expect(verifySessionToken(token, form1)).toBe(false);
  });

  it('rifiutato se la firma è manomessa o il segreto è cambiato', () => {
    const token = createSessionToken(form1);
    const [payload, sig] = token.split('.');
    const tampered = `${payload}.${sig[0] === 'A' ? 'B' : 'A'}${sig.slice(1)}`;
    expect(verifySessionToken(tampered, form1)).toBe(false);
    process.env.SESSION_SECRET = 'other';
    expect(verifySessionToken(token, form1)).toBe(false);
  });

  it('rifiuta formati non validi', () => {
    expect(verifySessionToken('', form1)).toBe(false);
    expect(verifySessionToken('abc', form1)).toBe(false);
  });
});

describe('admin auth', () => {
  it('safeEqual', () => {
    expect(safeEqual('abc', 'abc')).toBe(true);
    expect(safeEqual('abc', 'abd')).toBe(false);
    expect(safeEqual('abc', 'abcd')).toBe(false);
  });

  it('token: fail-closed se ADMIN_TOKEN manca', () => {
    expect(isValidAdminToken('admin-token')).toBe(true);
    expect(isValidAdminToken(null)).toBe(false);
    delete process.env.ADMIN_TOKEN;
    expect(isValidAdminToken(undefined)).toBe(false);
    expect(isValidAdminToken('')).toBe(false);
  });

  it('basic auth', () => {
    const header = (s: string) => 'Basic ' + Buffer.from(s).toString('base64');
    expect(isValidBasicAuth(header('admin:pw'))).toBe(true);
    expect(isValidBasicAuth(header('admin:wrong'))).toBe(false);
    expect(isValidBasicAuth(header('admin'))).toBe(false);
    expect(isValidBasicAuth(null)).toBe(false);
    expect(isValidBasicAuth('Basic !!!')).toBe(false);
  });

  it('basic auth: fail-closed se le credenziali non sono configurate', () => {
    delete process.env.ADMIN_USERNAME;
    delete process.env.ADMIN_PASSWORD;
    expect(isValidBasicAuth('Basic ' + Buffer.from(':').toString('base64'))).toBe(false);
  });
});
