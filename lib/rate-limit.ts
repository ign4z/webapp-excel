// lib/rate-limit.ts
// Rate limit a finestra fissa per IP sui form pubblici (form-1 invia email: senza limite sarebbe un relay di spam).
//
// Con UPSTASH_REDIS_REST_URL/TOKEN il contatore è condiviso tra tutte le istanze serverless
// (chiamata REST, nessuna dipendenza). Senza, si usa una Map in memoria: vale per singola istanza,
// quindi è solo un argine di base. In caso di errore Redis si ricade sulla memoria (fail-open).

import type { NextRequest } from 'next/server';
import { createLogger } from '@/lib/logger';

const log = createLogger('lib/rate-limit');

export interface RateLimitResult {
  allowed: boolean;
  /** Secondi prima che la finestra si azzeri */
  retryAfter: number;
}

const memory = new Map<string, { count: number; resetAt: number }>();

function memoryHit(key: string, limit: number, windowSec: number, now: number): RateLimitResult {
  const entry = memory.get(key);
  if (!entry || entry.resetAt <= now) {
    memory.set(key, { count: 1, resetAt: now + windowSec * 1000 });
    // Pulizia occasionale per non far crescere la Map all'infinito
    if (memory.size > 10_000) {
      for (const [k, v] of memory) if (v.resetAt <= now) memory.delete(k);
    }
    return { allowed: true, retryAfter: windowSec };
  }
  entry.count++;
  return { allowed: entry.count <= limit, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
}

async function redisHit(url: string, token: string, key: string, limit: number, windowSec: number): Promise<RateLimitResult> {
  const res = await fetch(`${url.replace(/\/$/, '')}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify([
      ['INCR', key],
      ['EXPIRE', key, String(windowSec), 'NX'],
      ['TTL', key],
    ]),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Upstash ${res.status}`);
  const [incr, , ttl] = (await res.json()) as Array<{ result: number }>;
  return { allowed: incr.result <= limit, retryAfter: Math.max(ttl.result, 1) };
}

export async function rateLimit(
  name: string,
  identifier: string,
  limit: number,
  windowSec: number,
  now = Date.now(),
): Promise<RateLimitResult> {
  const key = `rl:${name}:${identifier}`;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    try {
      return await redisHit(url, token, key, limit, windowSec);
    } catch (err) {
      log.warn('Rate limit Redis error, fallback in memoria', err instanceof Error ? err.message : err);
    }
  }
  return memoryHit(key, limit, windowSec, now);
}

/** IP del client (su Vercel x-forwarded-for è impostato dalla piattaforma, il primo valore è il client). */
export function clientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0].trim()
    || req.headers.get('x-real-ip')
    || 'unknown';
}
