import { NextRequest, NextResponse } from 'next/server';
import { list } from '@vercel/blob';
import ExcelJS from 'exceljs';
import { ALLOWED_CITIES, cityToSlug } from '@/lib/cities';

const SUPPORTED_CITIES = ALLOWED_CITIES.map(cityToSlug);

function isAuthorized(request: NextRequest): boolean {
  const token = request.nextUrl.searchParams.get('token');
  return token === process.env.ADMIN_TOKEN;
}

/* ─── GET /api/admin/streets/template?token=SECRET&city=locate-di-triulzi ─── */
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const city = request.nextUrl.searchParams.get('city') ?? '';
  if (!/^[a-z0-9-]+$/.test(city) || !SUPPORTED_CITIES.includes(city)) {
    return NextResponse.json({ error: 'Città non supportata' }, { status: 400 });
  }

  try {
    let streetData: Record<string, number> = {};

    const blobPath = `streets/${city}.json`;
    const { blobs } = await list({ prefix: blobPath, limit: 1 });

    if (blobs.length > 0) {
      const response = await fetch(blobs[0].url, { cache: 'no-store' });
      if (response.ok) {
        streetData = await response.json();
      }
    } else {
      const seed = await import(`@/lib/streets/${city}`);
      streetData = seed.streetPrices;
    }

    // Exclude civic-level keys (keys containing ':')
    const streetOnlyEntries = Object.entries(streetData)
      .filter(([key]) => !key.includes(':'))
      .sort(([a], [b]) => a.localeCompare(b));

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Strade');
    sheet.columns = [
      { header: 'Via', key: 'street', width: 40 },
      { header: 'Prezzo al mq', key: 'price', width: 15 },
    ];

    for (const [street, price] of streetOnlyEntries) {
      sheet.addRow({ street, price });
    }

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="strade-${city}.xlsx"`,
      },
    });
  } catch (error) {
    console.error('Template download error:', error);
    return NextResponse.json({ error: 'Errore generazione template' }, { status: 500 });
  }
}
