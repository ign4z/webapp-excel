import { NextRequest, NextResponse } from 'next/server';
import { safeEqual } from '@/lib/auth';
import { purgeReportsOlderThan } from '@/lib/reports-storage';
import { RETENTION_MONTHS } from '@/lib/legal';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/cron/purge-reports');

/**
 * GET /api/cron/purge-reports
 * Cron Vercel giornaliero (vercel.json): cancella i report più vecchi di RETENTION_MONTHS.
 * Non è un'API admin: Vercel invia `Authorization: Bearer ${CRON_SECRET}` (fail-closed se la env manca).
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get('authorization') ?? '';
  if (!secret || !safeEqual(header, `Bearer ${secret}`)) {
    log.warn('Unauthorized cron purge attempt');
    return NextResponse.json({ success: false, error: 'Non autorizzato' }, { status: 401 });
  }

  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - RETENTION_MONTHS);

  try {
    const deleted = await purgeReportsOlderThan(cutoff);
    log.info('Old reports purged', { deleted, cutoff: cutoff.toISOString() });
    return NextResponse.json({ success: true, deleted });
  } catch (error) {
    log.error('Cron purge error', error instanceof Error ? error.message : error);
    return NextResponse.json({ success: false, error: 'Errore cancellazione report' }, { status: 500 });
  }
}
