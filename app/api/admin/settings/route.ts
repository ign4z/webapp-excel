import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth';
import { getSettings, saveSettings, envNotificationEmails } from '@/lib/settings';
import { settingsSchema } from '@/lib/schema';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/admin/settings');

/**
 * GET /api/admin/settings
 * Impostazioni salvate + destinatari di fallback da ADMIN_EMAIL (mostrati nell'admin quando la lista è vuota)
 */
export async function GET(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) {
    log.warn('Unauthorized GET settings attempt');
    return denied;
  }

  try {
    const settings = await getSettings();
    return NextResponse.json({ success: true, data: settings, fallbackEmails: envNotificationEmails() });
  } catch (error) {
    log.error('Admin settings GET error', error instanceof Error ? error.message : error);
    return NextResponse.json({ success: false, error: 'Errore recupero impostazioni' }, { status: 500 });
  }
}

/**
 * POST /api/admin/settings
 * Salva le impostazioni (oggetto completo, validato con settingsSchema; chiavi sconosciute rifiutate)
 */
export async function POST(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) {
    log.warn('Unauthorized POST settings attempt');
    return denied;
  }

  try {
    const settings = settingsSchema.strict().parse(await request.json());
    await saveSettings(settings);
    log.info('Settings saved', { notificationEmails: settings.notificationEmails.length });
    return NextResponse.json({ success: true, data: settings });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ success: false, error: 'Body non valido' }, { status: 400 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.issues.map((i) => i.message).join('; ') }, { status: 400 });
    }
    log.error('Admin settings POST error', error instanceof Error ? error.message : error);
    return NextResponse.json({ success: false, error: 'Errore salvataggio impostazioni' }, { status: 500 });
  }
}
