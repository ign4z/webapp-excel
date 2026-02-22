import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import ExcelJS from 'exceljs';
import { put } from '@vercel/blob';
import { getValuationConfig, getPricePerSqm } from '@/lib/config';

const formSchema = z.object({
  floor: z.number().optional(),
  hasElevator: z.boolean().optional(),
  hasSecondBathroom: z.boolean().optional(),
  hasCellar: z.boolean().optional(),
  exposure: z.enum(['north', 'south', 'east', 'west', 'none']).optional(),
  heatingType: z.enum(['autonomous', 'centralized', 'none']).optional(),
  buildYear: z.number().optional(),
  isRecentlyRenovated: z.boolean().optional(),
  notes: z.string().optional(),
  sessionToken: z.string(),
  form1Data: z.object({
    firstName: z.string(),
    lastName: z.string(),
    email: z.string().email(),
    phone: z.string(),
    city: z.string(),           // ← aggiunto
    address: z.string(),
    squareMeters: z.number(),
  }),
  calculationResult: z.object({
    pricePerSqm: z.number(),
    estimatedValue: z.number(),
  }),
  recaptchaToken: z.string(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = formSchema.parse(body);

    /* ─── reCAPTCHA ─── */
    if (process.env.RECAPTCHA_SECRET_KEY) {
      const recaptchaResponse = await fetch(
        'https://www.google.com/recaptcha/api/siteverify',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${validated.recaptchaToken}`,
        }
      );
      const recaptchaData = await recaptchaResponse.json();
      if (!recaptchaData.success) {
        return NextResponse.json({ error: 'Verifica reCAPTCHA fallita' }, { status: 400 });
      }
    }

    /* ─── Config + prezzo per comune ─── */
    const config = await getValuationConfig();
    const pricePerSqm = getPricePerSqm(config, validated.form1Data.city);

    /* ─── Calcolo modificatori ─── */
    let currentValue = validated.calculationResult.estimatedValue;
    const details: string[] = [];

    function applyPct(pct: number, label: string) {
      const adjustment = currentValue * (pct / 100);
      currentValue += adjustment;
      details.push(`${label}: ${pct > 0 ? '+' : ''}€${Math.round(adjustment).toLocaleString('it-IT')} (${pct}%)`);
    }

    if (validated.hasSecondBathroom)  applyPct(config.secondBathroom, 'Secondo bagno');
    if (validated.hasCellar)          applyPct(config.cellar, 'Cantina');
    if (validated.isRecentlyRenovated) applyPct(config.renovated, 'Ristrutturato');

    if (validated.floor !== undefined && validated.floor === 0) {
      applyPct(config.groundFloor, 'Piano terra');
    }

    if (validated.exposure && validated.exposure !== 'none') {
      const map = {
        south: [config.exposureSouth, 'Sud'],
        east:  [config.exposureEast,  'Est'],
        west:  [config.exposureWest,  'Ovest'],
        north: [config.exposureNorth, 'Nord'],
      } as const;
      const [pct, label] = map[validated.exposure];
      if (pct !== 0) applyPct(pct as number, `Esposizione ${label}`);
    }

    if (validated.heatingType && validated.heatingType !== 'none') {
      if (validated.heatingType === 'autonomous')   applyPct(config.heatingAutonomous,  'Riscaldamento autonomo');
      if (validated.heatingType === 'centralized')  applyPct(config.heatingCentralized, 'Riscaldamento centralizzato');
    }

    if (validated.buildYear) {
      const age = new Date().getFullYear() - validated.buildYear;
      if (age > 0) {
        const totalPct = age * config.depreciation;
        const adjustment = currentValue * (totalPct / 100) * -1;
        currentValue += adjustment;
        details.push(`Età edificio (${age} anni): €${Math.round(adjustment).toLocaleString('it-IT')} (-${totalPct.toFixed(1)}%)`);
      }
    }

    const baseValue = validated.calculationResult.estimatedValue;
    const finalValue = Math.round(currentValue);
    const totalAdjustment = finalValue - baseValue;

    const finalValuation = { baseValue, totalAdjustment, finalValue, details };

    /* ─── Genera Excel ─── */
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Valutazione');

    const headerStyle = {
      font: { bold: true, size: 14, color: { argb: 'FFFFFFFF' } },
      fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF1E2230' } },
      alignment: { horizontal: 'center' as const },
    };
    const sectionStyle = {
      font: { bold: true, size: 11 },
      fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFEDE8DF' } },
    };
    const goldStyle = {
      font: { bold: true, size: 13, color: { argb: 'FF9A7535' } },
    };

    worksheet.mergeCells('A1:B1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'VALUTAZIONE IMMOBILIARE';
    titleCell.style = headerStyle;
    worksheet.addRow([]);

    // Proprietario
    worksheet.addRow(['DATI PROPRIETARIO', '']).getCell(1).style = sectionStyle;
    worksheet.addRow(['Nome', validated.form1Data.firstName]);
    worksheet.addRow(['Cognome', validated.form1Data.lastName]);
    worksheet.addRow(['Email', validated.form1Data.email]);
    worksheet.addRow(['Telefono', validated.form1Data.phone]);
    worksheet.addRow([]);

    // Immobile
    worksheet.addRow(['DATI IMMOBILE', '']).getCell(1).style = sectionStyle;
    worksheet.addRow(['Comune', validated.form1Data.city]);
    worksheet.addRow(['Indirizzo', validated.form1Data.address]);
    worksheet.addRow(['Metri Quadri', validated.form1Data.squareMeters]);
    if (validated.floor !== undefined)                            worksheet.addRow(['Piano', validated.floor]);
    if (validated.hasElevator)                                    worksheet.addRow(['Ascensore', 'Sì']);
    if (validated.hasSecondBathroom)                              worksheet.addRow(['Secondo Bagno', 'Sì']);
    if (validated.hasCellar)                                      worksheet.addRow(['Cantina', 'Sì']);
    if (validated.exposure && validated.exposure !== 'none')      worksheet.addRow(['Esposizione', validated.exposure.toUpperCase()]);
    if (validated.heatingType && validated.heatingType !== 'none') worksheet.addRow(['Riscaldamento', validated.heatingType === 'autonomous' ? 'Autonomo' : 'Centralizzato']);
    if (validated.buildYear)                                      worksheet.addRow(['Anno Costruzione', validated.buildYear]);
    if (validated.isRecentlyRenovated)                            worksheet.addRow(['Ristrutturato', 'Sì']);
    if (validated.notes)                                          worksheet.addRow(['Note', validated.notes]);
    worksheet.addRow([]);

    // Valutazione
    worksheet.addRow(['VALUTAZIONE', '']).getCell(1).style = sectionStyle;
    worksheet.addRow(['Comune', validated.form1Data.city]);
    worksheet.addRow(['Prezzo al mq', `€${pricePerSqm.toLocaleString('it-IT')}`]);
    worksheet.addRow(['Valore Base', `€${baseValue.toLocaleString('it-IT')}`]);

    if (details.length > 0) {
      worksheet.addRow([]);
      worksheet.addRow(['MODIFICATORI', '']).getCell(1).style = sectionStyle;
      details.forEach((d) => worksheet.addRow([d, '']));
    }

    worksheet.addRow([]);
    const finalRow = worksheet.addRow(['VALORE FINALE STIMATO', `€${finalValue.toLocaleString('it-IT')}`]);
    finalRow.getCell(1).style = goldStyle;
    finalRow.getCell(2).style = goldStyle;

    worksheet.getColumn(1).width = 32;
    worksheet.getColumn(2).width = 30;

    const buffer = await workbook.xlsx.writeBuffer();

    /* ─── Salva su Vercel Blob ─── */
    const filename = `valutazione_${validated.form1Data.lastName}_${Date.now()}.xlsx`;
    const blob = await put(filename, buffer, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    return NextResponse.json({ finalValuation, excelUrl: blob.url });

  } catch (error: any) {
    console.error('Error in /api/form-2:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Dati non validi', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Errore del server' }, { status: 500 });
  }
}