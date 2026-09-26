import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import ExcelJS from 'exceljs';

vi.mock('@/lib/blob-json-cache', () => ({
  readBlobJson: vi.fn(async () => null),
  writeBlobJson: vi.fn(),
  invalidateBlobJson: vi.fn(),
}));

const { POST: importStreets } = await import('@/app/api/admin/streets/import/route');
const { GET: downloadTemplate } = await import('@/app/api/admin/streets/template/route');
const { writeBlobJson } = await import('@/lib/blob-json-cache');
const { getSeedStreetPrices } = await import('@/lib/streets');

const AUTH = { authorization: 'Bearer admin-token' };

async function xlsx(vie: Array<[unknown, unknown]>, civici?: Array<[unknown, unknown, unknown]>): Promise<Blob> {
  const wb = new ExcelJS.Workbook();
  wb.addWorksheet('Vie').addRows([['Via', 'Prezzo al mq'], ...vie]);
  if (civici) wb.addWorksheet('Civici').addRows([['Via', 'Civico', 'Prezzo al mq'], ...civici]);
  return new Blob([await wb.xlsx.writeBuffer()]);
}

function importRequest(city: string, file: Blob | null, headers: Record<string, string> = AUTH): NextRequest {
  const form = new FormData();
  if (file) form.append('file', file, 'strade.xlsx');
  return new NextRequest(`http://localhost/api/admin/streets/import?city=${city}`, { method: 'POST', headers, body: form });
}

const originalEnv = { ...process.env };

beforeEach(() => {
  process.env.ADMIN_TOKEN = 'admin-token';
  vi.clearAllMocks();
});

afterEach(() => {
  process.env = { ...originalEnv };
});

describe('POST /api/admin/streets/import', () => {
  it('importa vie e civici e scrive il blob della città', async () => {
    const file = await xlsx(
      [['Via Roma', 2100], ['  VIA MILANO ', '1950']],
      [['via roma', 15, 2300]],
    );
    const res = await importStreets(importRequest('opera', file));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ success: true, importedStreets: 2, importedCivics: 1, skipped: 0, errors: [] });
    expect(writeBlobJson).toHaveBeenCalledWith('streets/opera.json', {
      'via roma': 2100,
      'via milano': 1950,
      'via roma:15': 2300,
    });
  });

  it('scarta le righe con prezzo non valido o via vuota e le segnala', async () => {
    const file = await xlsx([['via roma', 2000], ['via dante', 'abc'], ['via trento', -5], [null, 1800]]);
    const res = await importStreets(importRequest('opera', file));
    const body = await res.json();
    expect(body.importedStreets).toBe(1);
    expect(body.skipped).toBe(3);
    expect(body.errors).toHaveLength(2);
    expect(writeBlobJson).toHaveBeenCalledWith('streets/opera.json', { 'via roma': 2000 });
  });

  it('senza token admin → 401', async () => {
    const res = await importStreets(importRequest('opera', await xlsx([['via roma', 2000]]), {}));
    expect(res.status).toBe(401);
    expect(writeBlobJson).not.toHaveBeenCalled();
  });

  it('città non supportata → 400', async () => {
    const res = await importStreets(importRequest('milano', await xlsx([['via roma', 2000]])));
    expect(res.status).toBe(400);
  });

  it('campo file mancante → 400', async () => {
    const res = await importStreets(importRequest('opera', null));
    expect(res.status).toBe(400);
  });

  it('il template scaricato e reimportato riproduce i prezzi seed', async () => {
    const tpl = await downloadTemplate(new NextRequest('http://localhost/api/admin/streets/template?city=opera', { headers: AUTH }));
    expect(tpl.status).toBe(200);
    const res = await importStreets(importRequest('opera', new Blob([await tpl.arrayBuffer()])));
    expect(res.status).toBe(200);
    expect(vi.mocked(writeBlobJson).mock.calls[0][1]).toEqual(getSeedStreetPrices('opera'));
  });
});
