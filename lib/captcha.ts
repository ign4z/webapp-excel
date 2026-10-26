// lib/captcha.ts
// Verifica anti-bot con Cloudflare Turnstile: nessun cookie di profilazione, quindi niente banner cookie.
import { createLogger } from '@/lib/logger';

const log = createLogger('lib/captcha');

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/**
 * Verifica il token Turnstile con Cloudflare.
 * Senza TURNSTILE_SECRET_KEY: in sviluppo il controllo viene saltato, in produzione fallisce (fail-closed).
 */
export async function verifyCaptcha(token: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      log.error('TURNSTILE_SECRET_KEY non configurato in produzione: richiesta rifiutata');
      return false;
    }
    log.debug('Turnstile skipped (no secret, dev)');
    return true;
  }
  if (!token) return false;

  try {
    const res = await fetch(SITEVERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret, response: token }),
      // Se Cloudflare non risponde la richiesta fallisce (fail-closed) invece di restare appesa
      signal: AbortSignal.timeout(5000),
    });
    const data = await res.json();
    if (data.success !== true) log.warn('Turnstile rejected', { codes: data['error-codes'] });
    return data.success === true;
  } catch (err) {
    log.warn('Turnstile verification error', err instanceof Error ? err.message : err);
    return false;
  }
}
