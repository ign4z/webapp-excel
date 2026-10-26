// lib/settings.ts
// Impostazioni modificabili dal pannello admin (/admin/settings), salvate su Blob privato.
// Oggi: destinatari della notifica di nuova valutazione. ADMIN_EMAIL resta il fallback se la lista è vuota.

import { settingsSchema, type AppSettings } from '@/lib/schema';
import { readBlobJson, writeBlobJson } from '@/lib/blob-json-cache';
import { createLogger } from '@/lib/logger';

const log = createLogger('lib/settings');

const SETTINGS_PATH = 'config/settings.json';

const EMPTY_SETTINGS: AppSettings = { notificationEmails: [] };

/** Impostazioni salvate; vuote se il blob manca o non è valido. */
export async function getSettings(): Promise<AppSettings> {
  try {
    const parsed = settingsSchema.safeParse(await readBlobJson(SETTINGS_PATH));
    return parsed.success ? parsed.data : EMPTY_SETTINGS;
  } catch (error) {
    log.warn('Error loading settings, using empty', error instanceof Error ? error.message : error);
    return EMPTY_SETTINGS;
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await writeBlobJson(SETTINGS_PATH, settingsSchema.parse(settings));
}

/** Indirizzi da ADMIN_EMAIL (separati da virgola), usati se l'admin non ha configurato destinatari. */
export function envNotificationEmails(): string[] {
  return (process.env.ADMIN_EMAIL ?? '').split(',').map((e) => e.trim()).filter(Boolean);
}

/** Destinatari della notifica di nuova valutazione: impostazioni admin, altrimenti ADMIN_EMAIL. */
export async function getNotificationEmails(): Promise<string[]> {
  const { notificationEmails } = await getSettings();
  return notificationEmails.length > 0 ? notificationEmails : envNotificationEmails();
}
