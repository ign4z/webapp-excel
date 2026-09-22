// lib/auth.ts
// Autenticazione admin condivisa da proxy.ts (pagine /admin) e dalle API /api/admin/*.
// Solo JS puro (niente 'crypto' di Node) così funziona in qualunque runtime.

import { NextRequest, NextResponse } from 'next/server';

/** Confronto a tempo costante: evita di rivelare quanti caratteri iniziali coincidono. */
export function safeEqual(a: string, b: string): boolean {
  const len = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < len; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

/** true solo se ADMIN_TOKEN è configurato e coincide (fail-closed se la env manca). */
export function isValidAdminToken(token: string | null | undefined): boolean {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected || !token) return false;
  return safeEqual(token, expected);
}

/** Verifica l'header Basic Auth contro ADMIN_USERNAME/ADMIN_PASSWORD (fail-closed se mancano). */
export function isValidBasicAuth(header: string | null): boolean {
  const user = process.env.ADMIN_USERNAME;
  const pass = process.env.ADMIN_PASSWORD;
  if (!user || !pass || !header?.startsWith('Basic ')) return false;

  let decoded: string;
  try {
    decoded = atob(header.slice(6));
  } catch {
    return false;
  }
  const sep = decoded.indexOf(':');
  if (sep < 0) return false;
  // Valutare entrambi i confronti senza short-circuit
  const userOk = safeEqual(decoded.slice(0, sep), user);
  const passOk = safeEqual(decoded.slice(sep + 1), pass);
  return userOk && passOk;
}

/**
 * Per le API admin: il token viaggia nell'header `Authorization: Bearer <token>`,
 * mai in query string (finirebbe in log, history e Referer).
 * Restituisce una risposta 401 se non autorizzato, altrimenti null.
 */
export function requireAdmin(request: NextRequest): NextResponse | null {
  const header = request.headers.get('authorization');
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
  if (isValidAdminToken(token)) return null;
  return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
}
