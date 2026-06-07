import { NextRequest, NextResponse } from 'next/server';
import { list, del } from '@vercel/blob';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/admin/files');

/**
 * GET /api/admin/files?token=SECRET
 * Lista tutti i file Excel presenti nel Blob Storage
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token');
    if (token !== process.env.ADMIN_TOKEN) {
      log.warn('Unauthorized GET files attempt');
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    log.debug('Admin files GET');
    const { blobs } = await list();

    // Filtra solo i file Excel (escludi config.json)
    const excelFiles = blobs
      .filter(blob => blob.pathname.endsWith('.xlsx'))
      .map(blob => ({
        url: blob.url,
        filename: blob.pathname,
        size: blob.size,
        uploadedAt: blob.uploadedAt,
      }))
      .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

    log.debug('Admin files listed', { count: excelFiles.length });
    return NextResponse.json({
      success: true,
      data: excelFiles,
      count: excelFiles.length,
    });

  } catch (error) {
    log.error('Admin files GET error', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { success: false, error: 'Errore recupero file' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/files?token=SECRET&url=BLOB_URL
 * Elimina un file Excel dal Blob Storage
 */
export async function DELETE(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token');
    if (token !== process.env.ADMIN_TOKEN) {
      log.warn('Unauthorized DELETE file attempt');
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const blobUrl = request.nextUrl.searchParams.get('url');
    if (!blobUrl) {
      return NextResponse.json({ success: false, error: 'URL blob mancante' }, { status: 400 });
    }

    await del(blobUrl);
    log.info('Admin file deleted', { url: blobUrl });

    return NextResponse.json({ success: true, message: 'File eliminato con successo' });

  } catch (error) {
    log.error('Admin files DELETE error', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { success: false, error: 'Errore eliminazione file' },
      { status: 500 }
    );
  }
}
