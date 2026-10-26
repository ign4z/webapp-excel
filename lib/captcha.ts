// lib/recaptcha.ts
import { createLogger } from '@/lib/logger';

const log = createLogger('lib/recaptcha');

/**
 * Verifica il token reCAPTCHA con Google.
 * Senza RECAPTCHA_SECRET_KEY: in sviluppo il controllo viene saltato, in produzione fallisce (fail-closed).
 */
export async function verifyRecaptcha(token: string): Promise<boolean> {
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      log.error('RECAPTCHA_SECRET_KEY non configurato in produzione: richiesta rifiutata');
      return false;
    }
    log.debug('reCAPTCHA skipped (no secret, dev)');
    return true;
  }

  try {
    const res = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret, response: token }),
    });
    const data = await res.json();
    return data.success === true;
  } catch (err) {
    log.warn('reCAPTCHA verification error', err instanceof Error ? err.message : err);
    return false;
  }
}
