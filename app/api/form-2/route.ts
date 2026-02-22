import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import ExcelJS from 'exceljs';
import { put } from '@vercel/blob';
import { getValuationConfig } from '@/lib/config';

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
    // 1. Parse e validazione
    const body = await req.json();
    const validated = formSchema.parse(body);

    // 2. Verifica reCAPTCHA
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
        return NextResponse.json(
          { error: 'Verifica reCAPTCHA fallita' },
          { status: 400 }
        );
      }
    }

    // 3. Leggi configurazione dinamica
    const config = await getValuationConfig();

    // 4. Calcolo modificatori progressivi
    let currentValue = validated.calculationResult.estimatedValue;
    const details: string[] = [];

    // Secondo bagno
    if (validated.hasSecondBathroom) {
      const adjustment = currentValue * (config.secondBathroom / 100);
      currentValue += adjustment;
      details.push(`Secondo bagno: ${config.secondBathroom > 0 ? '+' : ''}€${Math.round(adjustment).toLocaleString('it-IT')} (${config.secondBathroom}%)`);
    }

    // Cantina
    if (validated.hasCellar) {
      const adjustment = currentValue * (config.cellar / 100);
      currentValue += adjustment;
      details.push(`Cantina: ${config.cellar > 0 ? '+' : ''}€${Math.round(adjustment).toLocaleString('it-IT')} (${config.cellar}%)`);
    }

    // Ristrutturato
    if (validated.isRecentlyRenovated) {
      const adjustment = currentValue * (config.renovated / 100);
      currentValue += adjustment;
      details.push(`Ristrutturato: ${config.renovated > 0 ? '+' : ''}€${Math.round(adjustment).toLocaleString('it-IT')} (${config.renovated}%)`);
    }

    // Piano
    if (validated.floor !== undefined) {
      if (validated.floor === 0) {
        const adjustment = currentValue * (config.groundFloor / 100);
        currentValue += adjustment;
        details.push(`Piano terra: ${config.groundFloor > 0 ? '+' : ''}€${Math.round(adjustment).toLocaleString('it-IT')} (${config.groundFloor}%)`);
      }
      // Per ultimo piano, devi passare info aggiuntiva o controllare logica specifica
    }

    // Esposizione
    if (validated.exposure && validated.exposure !== 'none') {
      let percentage = 0;
      let label = '';
      
      switch (validated.exposure) {
        case 'south':
          percentage = config.exposureSouth;
          label = 'Sud';
          break;
        case 'east':
          percentage = config.exposureEast;
          label = 'Est';
          break;
        case 'west':
          percentage = config.exposureWest;
          label = 'Ovest';
          break;
        case 'north':
          percentage = config.exposureNorth;
          label = 'Nord';
          break;
      }
      
      if (percentage !== 0) {
        const adjustment = currentValue * (percentage / 100);
        currentValue += adjustment;
        details.push(`Esposizione ${label}: ${percentage > 0 ? '+' : ''}€${Math.round(adjustment).toLocaleString('it-IT')} (${percentage}%)`);
      }
    }

    // Riscaldamento
    if (validated.heatingType && validated.heatingType !== 'none') {
      let percentage = 0;
      let label = '';
      
      if (validated.heatingType === 'autonomous') {
        percentage = config.heatingAutonomous;
        label = 'Autonomo';
      } else if (validated.heatingType === 'centralized') {
        percentage = config.heatingCentralized;
        label = 'Centralizzato';
      }
      
      if (percentage !== 0) {
        const adjustment = currentValue * (percentage / 100);
        currentValue += adjustment;
        details.push(`Riscaldamento ${label}: ${percentage > 0 ? '+' : ''}€${Math.round(adjustment).toLocaleString('it-IT')} (${percentage}%)`);
      }
    }

    // Anno costruzione (svalutazione)
    if (validated.buildYear) {
      const currentYear = new Date().getFullYear();
      const age = currentYear - validated.buildYear;
      if (age > 0) {
        const totalDepreciation = age * config.depreciation;
        const adjustment = currentValue * (totalDepreciation / 100) * -1;
        currentValue += adjustment;
        details.push(`Età edificio (${age} anni): €${Math.round(adjustment).toLocaleString('it-IT')} (-${totalDepreciation.toFixed(1)}%)`);
      }
    }

    const baseValue = validated.calculationResult.estimatedValue;
    const totalAdjustment = currentValue - baseValue;
    const finalValue = Math.round(currentValue);

    const finalValuation = {
      baseValue,
      totalAdjustment: Math.round(totalAdjustment),
      finalValue,
      details,
    };

    // 5. Genera Excel
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Valutazione');

    // Styling
    const headerStyle = {
      font: { bold: true, size: 14, color: { argb: 'FFFFFFFF' } },
      fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF4472C4' } },
      alignment: { horizontal: 'center' as const },
    };

    const sectionStyle = {
      font: { bold: true, size: 12 },
      fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFE7E6E6' } },
    };

    // Header
    worksheet.mergeCells('A1:B1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'VALUTAZIONE IMMOBILIARE';
    titleCell.style = headerStyle;
    worksheet.addRow([]);
    
    // Dati proprietario
    const ownerHeader = worksheet.addRow(['DATI PROPRIETARIO', '']);
    ownerHeader.getCell(1).style = sectionStyle;
    worksheet.addRow(['Nome', validated.form1Data.firstName]);
    worksheet.addRow(['Cognome', validated.form1Data.lastName]);
    worksheet.addRow(['Email', validated.form1Data.email]);
    worksheet.addRow(['Telefono', validated.form1Data.phone]);
    worksheet.addRow([]);
    
    // Dati immobile
    const propertyHeader = worksheet.addRow(['DATI IMMOBILE', '']);
    propertyHeader.getCell(1).style = sectionStyle;
    worksheet.addRow(['Indirizzo', validated.form1Data.address]);
    worksheet.addRow(['Metri Quadri', validated.form1Data.squareMeters]);
    
    if (validated.floor !== undefined) {
      worksheet.addRow(['Piano', validated.floor]);
    }
    if (validated.hasElevator) {
      worksheet.addRow(['Ascensore', 'Sì']);
    }
    if (validated.hasSecondBathroom) {
      worksheet.addRow(['Secondo Bagno', 'Sì']);
    }
    if (validated.hasCellar) {
      worksheet.addRow(['Cantina', 'Sì']);
    }
    if (validated.exposure && validated.exposure !== 'none') {
      worksheet.addRow(['Esposizione', validated.exposure.toUpperCase()]);
    }
    if (validated.heatingType && validated.heatingType !== 'none') {
      worksheet.addRow(['Riscaldamento', validated.heatingType === 'autonomous' ? 'Autonomo' : 'Centralizzato']);
    }
    if (validated.buildYear) {
      worksheet.addRow(['Anno Costruzione', validated.buildYear]);
    }
    if (validated.isRecentlyRenovated) {
      worksheet.addRow(['Ristrutturato', 'Sì']);
    }
    worksheet.addRow([]);
    
    // Valutazione
    const valuationHeader = worksheet.addRow(['VALUTAZIONE', '']);
    valuationHeader.getCell(1).style = sectionStyle;
    worksheet.addRow(['Prezzo al mq', `€${config.pricePerSqm.toLocaleString('it-IT')}`]);
    worksheet.addRow(['Valore Base', `€${baseValue.toLocaleString('it-IT')}`]);
    
    if (details.length > 0) {
      worksheet.addRow([]);
      const modHeader = worksheet.addRow(['MODIFICATORI', '']);
      modHeader.getCell(1).style = sectionStyle;
      details.forEach(detail => worksheet.addRow([detail, '']));
    }
    
    worksheet.addRow([]);
    const finalRow = worksheet.addRow(['VALORE FINALE STIMATO', `€${finalValue.toLocaleString('it-IT')}`]);
    finalRow.getCell(1).font = { bold: true, size: 14 };
    finalRow.getCell(2).font = { bold: true, size: 14, color: { argb: 'FF00B050' } };

    // Column widths
    worksheet.getColumn(1).width = 30;
    worksheet.getColumn(2).width = 30;

    // Genera buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // 6. Salva su Vercel Blob
    const filename = `valutazione_${validated.form1Data.lastName}_${Date.now()}.xlsx`;
    const blob = await put(filename, buffer, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    // 7. TODO: Invia email con Resend
    // const { Resend } = require('resend');
    // const resend = new Resend(process.env.RESEND_API_KEY);
    // await resend.emails.send({
    //   from: 'noreply@tuodominio.com',
    //   to: validated.form1Data.email,
    //   subject: 'Valutazione Immobiliare Completa',
    //   html: `<p>Gentile ${validated.form1Data.firstName},</p><p>Valutazione finale: €${finalValue.toLocaleString('it-IT')}</p>`,
    //   attachments: [{ filename, content: buffer }],
    // });

    return NextResponse.json({
      finalValuation,
      excelUrl: blob.url,
    });

  } catch (error: any) {
    console.error('Error in /api/form-2:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dati non validi', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Errore del server' },
      { status: 500 }
    );
  }
}