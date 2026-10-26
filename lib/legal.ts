// lib/legal.ts
// Dati del titolare del trattamento e parametri privacy, usati da /privacy, /cookie, footer ed email.
// PRIMA DEL RILASCIO: sostituire tutti i segnaposto tra parentesi quadre con i dati reali
// (CI_RELEASE=1 npm test fallisce finché ne resta uno).

export const TITOLARE = {
  ragioneSociale: '[RAGIONE SOCIALE]',
  partitaIva: '[PARTITA IVA]',
  sede: '[INDIRIZZO SEDE LEGALE]',
  emailPrivacy: '[EMAIL PRIVACY]',
  /** Facoltativa: stringa vuota per non mostrarla */
  pec: '',
};

/** Mesi di conservazione dei report Excel: oltre, il cron /api/cron/purge-reports li cancella. */
export const RETENTION_MONTHS = 24;

/** Data dell'ultima modifica a informativa e cookie policy (mostrata nelle pagine). */
export const LEGAL_LAST_UPDATE = '26 ottobre 2026';

/** Fornitori che trattano dati per nostro conto (responsabili del trattamento, art. 28 GDPR). */
export const RESPONSABILI = [
  { nome: 'Vercel Inc.', ruolo: 'hosting del sito e archiviazione dei report di valutazione', sede: 'USA' },
  { nome: 'Resend (Plus Five Five, Inc.)', ruolo: 'invio delle email con la valutazione', sede: 'USA' },
  { nome: 'Upstash, Inc.', ruolo: 'limitazione delle richieste per indirizzo IP (anti-abuso)', sede: 'USA' },
  { nome: 'Cloudflare, Inc.', ruolo: 'verifica anti-bot dei form (Turnstile)', sede: 'USA' },
] as const;

/** True se TITOLARE contiene ancora segnaposto da compilare. */
export function hasLegalPlaceholders(): boolean {
  return Object.values(TITOLARE).some((v) => /\[.+\]/.test(v));
}
