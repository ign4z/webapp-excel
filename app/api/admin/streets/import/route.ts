import { NextRequest, NextResponse } from 'next/server';
import { list, put } from '@vercel/blob';
import ExcelJS from 'exceljs';
import { ALLOWED_CITIES, cityToSlug } from '@/lib/cities';

const SUPPORTED_CITIES = ALLOWED_CITIES.map(cityToSlug);
const MAX_ROWS = 1000;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

function isAuthorized(request: NextRequest): boolean {
  const token = request.nextUrl.searchParams.get('token');
  return token === process.env.ADMIN_TOKEN;
}

/* ─── POST /api/admin/streets/import?token=SECRET&city=locate-di-triulzi ─── */
export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const city = request.nextUrl.searchParams.get('city') ?? '';
  if (!/^[a-z0-9-]+$/.test(city) || !SUPPORTED_CITIES.includes(city)) {
    return NextResponse.json({ error: 'Città non supportata' }, { status: 400 });
  }

  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (contentLength > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'File troppo grande (max 5MB)' }, { status: 400 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: 'Campo file mancante' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File troppo grande (max 5MB)' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);

    const sheet = workbook.worksheets[0];
    if (!sheet) {
      return NextResponse.json({ error: 'Foglio Excel non trovato' }, { status: 400 });
    }

    const dataRows = sheet.rowCount - 1; // exclude header
    if (dataRows > MAX_ROWS) {
      return NextResponse.json(
        { error: `Troppi righe: max ${MAX_ROWS}, trovate ${dataRows}` },
        { status: 400 }
      );
    }

    const imported: Record<string, number> = {};
    let skipped = 0;
    const errors: string[] = [];

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // skip header
      const streetCell = row.getCell(1).value;
      const priceCell = row.getCell(2).value;

      const street = typeof streetCell === 'string' ? streetCell.toLowerCase().trim() : '';
      const price = typeof priceCell === 'number' ? priceCell : Number(priceCell);

      if (!street) {
        skipped++;
        return;
      }
      if (!Number.isFinite(price) || price <= 0) {
        errors.push(`Riga ${rowNumber}: prezzo non valido (${priceCell})`);
        skipped++;
        return;
      }

      imported[street] = price;
    });

    // Load existing blob data to preserve civic keys (keys with ':')
    const blobPath = `streets/${city}.json`;
    let existingData: Record<string, number> = {};

    const { blobs } = await list({ prefix: blobPath, limit: 1 });
    if (blobs.length > 0) {
      const response = await fetch(blobs[0].url, { cache: 'no-store' });
      if (response.ok) {
        existingData = await response.json();
      }
    }

    // Preserve civic keys from existing data, overwrite street keys with imported
    const civicEntries = Object.fromEntries(
      Object.entries(existingData).filter(([key]) => key.includes(':'))
    );
    const merged = { ...imported, ...civicEntries };

    await put(blobPath, JSON.stringify(merged, null, 2), {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN,
      allowOverwrite: true,
    });

    return NextResponse.json({
      success: true,
      imported: Object.keys(imported).length,
      skipped,
      errors,
    });
  } catch (error) {
    console.error('Import streets error:', error);
    return NextResponse.json({ error: 'Errore importazione file' }, { status: 500 });
  }
}
