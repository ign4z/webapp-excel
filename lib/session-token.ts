// lib/session-token.ts
// Token firmato (HMAC-SHA256) emesso da form-1 e verificato da form-2.
// Lega lo Step 2 ai dati validati nello Step 1: se il client modifica form1Data
// in sessionStorage, l'hash non corrisponde e form-2 rifiuta la richiesta.

import crypto from 'crypto';
import type { Form1Values } from '@/lib/schema';

const TTL_MS = 24 * 60 * 60 * 1000; // 24 ore

let devSecret: string | null = null;

function getSecret(): string {
  const secret = process.env.SESSION_SECRET || process.env.ADMIN_TOKEN;
  if (secret) return secret;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET non configurato');
  }
  // In sviluppo basta un segreto casuale per processo
  devSecret ??= crypto.randomBytes(32).toString('hex');
  return devSecret;
}

function hashForm1(data: Form1Values): string {
  const canonical = JSON.stringify([
    data.firstName, data.lastName, data.email, data.phone, data.city, data.address,
    data.squareMeters, data.tipologia, data.piano, data.locali, data.bagni,
  ]);
  return crypto.createHash('sha256').update(canonical).digest('base64url');
}

function sign(payload: string): string {
  return crypto.createHmac('sha256', getSecret()).update(payload).digest('base64url');
}

export function createSessionToken(data: Form1Values, now = Date.now()): string {
  const payload = Buffer.from(JSON.stringify({ h: hashForm1(data), exp: now + TTL_MS })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token: string, data: Form1Values, now = Date.now()): boolean {
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return false;

  const expected = Buffer.from(sign(payload));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) return false;

  try {
    const { h, exp } = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return typeof exp === 'number' && exp > now && h === hashForm1(data);
  } catch {
    return false;
  }
}
