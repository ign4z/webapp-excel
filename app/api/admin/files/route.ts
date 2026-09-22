import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { listReports, deleteReport, isReportUrl } from '@/lib/reports-storage';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/admin/files');

/**
 * GET /api/admin/files
 * Lista i report Excel dello store privato
 */
export async function GET(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) {
    log.warn('Unauthorized GET files attempt');
    return denied;
  }

  try {
    const files = await listReports();
    log.debug('Admin files listed', { count: files.length });
    return NextResponse.json({ success: true, data: files, count: files.length });
  } catch (error) {
    log.error('Admin files GET error', error instanceof Error ? error.message : error);
    return NextResponse.json({ success: false, error: 'Errore recupero file' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/files?url=BLOB_URL
 * Elimina un report Excel
 */
export async function DELETE(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) {
    log.warn('Unauthorized DELETE file attempt');
    return denied;
  }

  const blobUrl = request.nextUrl.searchParams.get('url') ?? '';
  // Solo report Excel: impedisce di cancellare config/strade/log passando un altro URL dello stesso store
  if (!isReportUrl(blobUrl)) {
    log.warn('Admin DELETE rejected: not a report url', { url: blobUrl });
    return NextResponse.json({ success: false, error: 'Si possono eliminare solo file .xlsx' }, { status: 400 });
  }

  try {
    await deleteReport(blobUrl);
    log.info('Admin file deleted', { url: blobUrl });
    return NextResponse.json({ success: true, message: 'File eliminato con successo' });
  } catch (error) {
    log.error('Admin files DELETE error', error instanceof Error ? error.message : error);
    return NextResponse.json({ success: false, error: 'Errore eliminazione file' }, { status: 500 });
  }
}
