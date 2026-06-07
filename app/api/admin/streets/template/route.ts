import { NextRequest, NextResponse } from 'next/server';
import { list } from '@vercel/blob';
import ExcelJS from 'exceljs';
import { ALLOWED_CITIES, cityToSlug } from '@/lib/cities';
import { getSeedStreetPrices } from '@/lib/streets';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/admin/streets/template');

const SUPPORTED_CITIES = ALLOWED_CITIES.map(cityToSlug);

function isAuthorized(request: NextRequest): boolean {
  const token = request.nextUrl.searchParams.get('token');
  return token === process.env.ADMIN_TOKEN;
}

// Genera un file Excel precompilato con i prezzi attuali — usato come base per l'importazione
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    log.warn('Unauthorized template download attempt');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const city = request.nextUrl.searchParams.get('city') ?? '';
  if (!/^[a-z0-9-]+$/.test(city) || !SUPPORTED_CITIES.includes(city)) {
    log.warn('Template download: invalid city', { city });
    return NextResponse.json({ error: 'Città non supportata' }, { status: 400 });
  }

  log.info('Template download', { city });
  try {
    let streetData: Record<string, number> = {};

    const { blobs } = await list({ prefix: `streets/${city}.json`, limit: 1 });
    if (blobs.length > 0) {
      const response = await fetch(blobs[0].url, { cache: 'no-store' });
      if (response.ok) streetData = await response.json();
    } else {
      // Blob non ancora creato: popola il template con i dati seed
      streetData = getSeedStreetPrices(city);
    }

    // Separa le chiavi via ("via roma") da quelle civico ("via roma:15")
    const streetEntries = Object.entries(streetData)
      .filter(([key]) => !key.includes(':'))
      .sort(([a], [b]) => a.localeCompare(b));

    const civicEntries = Object.entries(streetData)
      .filter(([key]) => key.includes(':'))
      .map(([key, price]) => {
        const [street, civic] = key.split(':');
        return { street, civic, price };
      })
      // Ordine: prima per via, poi per numero civico in modo numerico (10 dopo 9, non dopo 1)
      .sort((a, b) => a.street.localeCompare(b.street) || a.civic.localeCompare(b.civic, undefined, { numeric: true }));

    const workbook = new ExcelJS.Workbook();

    const sheetVie = workbook.addWorksheet('Vie');
    sheetVie.columns = [
      { header: 'Via', key: 'street', width: 40 },
      { header: 'Prezzo al mq', key: 'price', width: 15 },
    ];
    sheetVie.getRow(1).font = { bold: true };
    for (const [street, price] of streetEntries) {
      sheetVie.addRow({ street, price });
    }

    const sheetCivici = workbook.addWorksheet('Civici');
    sheetCivici.columns = [
      { header: 'Via', key: 'street', width: 40 },
      { header: 'Civico', key: 'civic', width: 12 },
      { header: 'Prezzo al mq', key: 'price', width: 15 },
    ];
    sheetCivici.getRow(1).font = { bold: true };
    for (const { street, civic, price } of civicEntries) {
      sheetCivici.addRow({ street, civic, price });
    }

    const buffer = await workbook.xlsx.writeBuffer();

    log.debug('Template generated', { city, streets: streetEntries.length, civics: civicEntries.length });
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="strade-${city}.xlsx"`,
      },
    });
  } catch (error) {
    log.error('Template download error', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Errore generazione template' }, { status: 500 });
  }
}
