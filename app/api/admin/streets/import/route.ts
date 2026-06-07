import { NextRequest, NextResponse } from 'next/server';
import { list, put } from '@vercel/blob';
import ExcelJS from 'exceljs';
import { ALLOWED_CITIES, cityToSlug } from '@/lib/cities';
import { invalidateStreetCache } from '@/lib/streets';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/admin/streets/import');

const SUPPORTED_CITIES = ALLOWED_CITIES.map(cityToSlug);
const MAX_ROWS = 1000;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

function isAuthorized(request: NextRequest): boolean {
  const token = request.nextUrl.searchParams.get('token');
  return token === process.env.ADMIN_TOKEN;
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    log.warn('Unauthorized streets import attempt');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const city = request.nextUrl.searchParams.get('city') ?? '';
  if (!/^[a-z0-9-]+$/.test(city) || !SUPPORTED_CITIES.includes(city)) {
    log.warn('Streets import: invalid city', { city });
    return NextResponse.json({ error: 'Città non supportata' }, { status: 400 });
  }

  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (contentLength > MAX_FILE_SIZE) {
    log.warn('Streets import: file too large', { city, contentLength });
    return NextResponse.json({ error: 'File troppo grande (max 5MB)' }, { status: 400 });
  }

  log.info('Streets import POST', { city });

  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: 'Campo file mancante' }, { status: 400 });
    }
    // Secondo controllo sulla dimensione reale del Blob (il content-length può essere assente o falsato)
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File troppo grande (max 5MB)' }, { status: 400 });
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await file.arrayBuffer());

    const errors: string[] = [];
    let importedStreets = 0;
    let importedCivics = 0;
    let skipped = 0;

    // Raccoglie vie e civici in un unico oggetto prima di scrivere sul blob
    const merged: Record<string, number> = {};

    // Foglio "Vie" — colonne: Via | Prezzo al mq
    // Fallback al primo foglio per compatibilità con template non rinominati
    const sheetVie = workbook.getWorksheet('Vie') ?? workbook.worksheets[0];
    if (!sheetVie) {
      return NextResponse.json({ error: 'Foglio "Vie" non trovato' }, { status: 400 });
    }
    if (sheetVie.rowCount - 1 > MAX_ROWS) {
      return NextResponse.json({ error: `Troppi righe nel foglio Vie: max ${MAX_ROWS}` }, { status: 400 });
    }

    sheetVie.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // intestazione
      const streetCell = row.getCell(1).value;
      const priceCell = row.getCell(2).value;

      const street = typeof streetCell === 'string' ? streetCell.toLowerCase().trim() : '';
      const price = typeof priceCell === 'number' ? priceCell : Number(priceCell);

      if (!street) { skipped++; return; }
      if (!Number.isFinite(price) || price <= 0) {
        errors.push(`Vie riga ${rowNumber}: prezzo non valido (${priceCell})`);
        skipped++;
        return;
      }
      merged[street] = price;
      importedStreets++;
    });

    // Foglio "Civici" — opzionale, colonne: Via | Civico | Prezzo al mq
    // Le chiavi civico sono nel formato "via roma:15"
    const sheetCivici = workbook.getWorksheet('Civici');
    if (sheetCivici) {
      if (sheetCivici.rowCount - 1 > MAX_ROWS) {
        return NextResponse.json({ error: `Troppi righe nel foglio Civici: max ${MAX_ROWS}` }, { status: 400 });
      }

      sheetCivici.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // intestazione
        const streetCell = row.getCell(1).value;
        const civicCell = row.getCell(2).value;
        const priceCell = row.getCell(3).value;

        const street = typeof streetCell === 'string' ? streetCell.toLowerCase().trim() : '';
        const civic = civicCell != null ? String(civicCell).trim() : '';
        const price = typeof priceCell === 'number' ? priceCell : Number(priceCell);

        if (!street || !civic) { skipped++; return; }
        if (!Number.isFinite(price) || price <= 0) {
          errors.push(`Civici riga ${rowNumber}: prezzo non valido (${priceCell})`);
          skipped++;
          return;
        }
        merged[`${street}:${civic}`] = price;
        importedCivics++;
      });
    }

    await put(`streets/${city}.json`, JSON.stringify(merged, null, 2), {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN,
      allowOverwrite: true,
    });

    invalidateStreetCache(city);
    log.info('Streets import complete', { city, importedStreets, importedCivics, skipped, errors: errors.length });

    return NextResponse.json({ success: true, importedStreets, importedCivics, skipped, errors });
  } catch (error) {
    log.error('Streets import error', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Errore importazione file' }, { status: 500 });
  }
}
