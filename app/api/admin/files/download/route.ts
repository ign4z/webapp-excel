import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { readReport, isReportUrl } from '@/lib/reports-storage';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/admin/files/download');

/**
 * GET /api/admin/files/download?url=BLOB_URL
 * Scarica un report Excel passando dal server (i blob sono privati).
 */
export async function GET(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) {
    log.warn('Unauthorized download attempt');
    return denied;
  }

  const blobUrl = request.nextUrl.searchParams.get('url') ?? '';
  if (!isReportUrl(blobUrl)) {
    return NextResponse.json({ success: false, error: 'URL non valido' }, { status: 400 });
  }

  try {
    const stream = await readReport(blobUrl);
    if (!stream) {
      return NextResponse.json({ success: false, error: 'File non trovato' }, { status: 404 });
    }
    const filename = decodeURIComponent(new URL(blobUrl).pathname.split('/').pop() ?? 'report.xlsx');
    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename.replace(/"/g, '')}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    log.error('Admin download error', error instanceof Error ? error.message : error);
    return NextResponse.json({ success: false, error: 'Errore download file' }, { status: 500 });
  }
}
