// app/api/admin/files/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { list, del } from '@vercel/blob';

/**
 * GET /api/admin/files?token=SECRET
 * Lista tutti i file Excel presenti nel Blob Storage
 */
export async function GET(request: NextRequest) {
  try {
    // Verifica autenticazione
    const token = request.nextUrl.searchParams.get('token');
    if (token !== process.env.ADMIN_TOKEN) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Lista tutti i blob (escluso il config)
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

    return NextResponse.json({
      success: true,
      data: excelFiles,
      count: excelFiles.length,
    });

  } catch (error) {
    console.error('❌ Errore lista file:', error);
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
    // Verifica autenticazione
    const token = request.nextUrl.searchParams.get('token');
    if (token !== process.env.ADMIN_TOKEN) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const blobUrl = request.nextUrl.searchParams.get('url');
    if (!blobUrl) {
      return NextResponse.json(
        { success: false, error: 'URL blob mancante' },
        { status: 400 }
      );
    }

    // Elimina il file
    await del(blobUrl);

    console.log('✅ File eliminato:', blobUrl);

    return NextResponse.json({
      success: true,
      message: 'File eliminato con successo',
    });

  } catch (error) {
    console.error('❌ Errore eliminazione file:', error);
    return NextResponse.json(
      { success: false, error: 'Errore eliminazione file' },
      { status: 500 }
    );
  }
}
