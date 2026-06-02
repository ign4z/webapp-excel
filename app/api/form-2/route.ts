import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import ExcelJS from 'exceljs';
import { put } from '@vercel/blob';
import { getValuationConfig, getCoefficienti } from '@/lib/config';
import type { ValuationCoefficientTables, PianoConAscensoreKey, PianoSenzaAscensoreKey } from '@/lib/config';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/form-2');

// ─── Readable labels ────────────────────────────────────────────────────────

const L_TIPOLOGIA: Record<string, string> = {
  appartamento: 'Appartamento', openspaceLoft: 'Open Space / Loft', mansarda: 'Mansarda',
  attico: 'Attico', villettaSchiera: 'Villetta a schiera', villa: 'Villa',
  rusticoCasale: 'Rustico / Casale', stabilePalazzo: 'Stabile / Palazzo',
};
const L_PIANO: Record<string, string> = {
  interrato: 'Interrato', seminterrato: 'Seminterrato', pianoTerra: 'Piano Terra',
  rialzato: 'Rialzato', piano1: '1° Piano', piano2: '2° Piano', piano3: '3° Piano',
  piano4: '4° Piano', piano5: '5° Piano', piano6: '6° Piano', piano7: '7° Piano',
  piano8: '8° Piano', piano9: '9° Piano', piano10Plus: '10° Piano o superiore',
};
const L_LOCALI: Record<string, string> = {
  locale1: '1 locale', locali2: '2 locali', locali3: '3 locali', locali4: '4 locali',
  locali5: '5 locali', locali6: '6 locali', locali7Plus: '7+ locali',
};
const L_BAGNI: Record<string, string> = {
  bagno1: '1 bagno', bagni2: '2 bagni', bagni3: '3 bagni', bagni4: '4 bagni', bagni5Plus: '5+ bagni',
};
const L_STATO: Record<string, string> = {
  daRistrutturare: 'Da ristrutturare', daRiattare: 'Da riattare', abitabile: 'Abitabile',
  buono: 'Buono', ottimo: 'Ottimo', ristrutturato: 'Ristrutturato', nuovo: 'Nuovo',
};
const L_CLASSE_EN: Record<string, string> = {
  G: 'G', F: 'F', E: 'E', D: 'D', C: 'C', B: 'B', A1: 'A1', A2: 'A2', A3: 'A3', A4: 'A4',
};
const L_ANNO_COST: Record<string, string> = {
  prima1945: 'Prima del 1945', dal1945al1960: '1945–1960', dal1961al1980: '1961–1980',
  dal1981al2000: '1981–2000', dal2001al2010: '2001–2010', dal2011al2020: '2011–2020',
  dal2021inPoi: '2021 o successivo',
};
const L_ASCENSORE: Record<string, string> = { no: 'No', si: 'Sì' };
const L_TERRAZZO: Record<string, string> = {
  nessuno: 'Nessuno', balcone: 'Balcone', balconiMultipli: 'Balconi multipli',
  terrazzoAbitabile: 'Terrazzo abitabile', terrazzoPanoramico: 'Terrazzo panoramico',
};
const L_GIARDINO: Record<string, string> = {
  nessuno: 'Nessuno', piccolo: 'Piccolo (<50 mq)', medio: 'Medio (50–150 mq)',
  grande: 'Grande (>150 mq)', importante: 'Giardino importante',
};
const L_GARAGE: Record<string, string> = {
  nessuno: 'Nessuno', postoScoperto: 'Posto auto scoperto', postoCoperto: 'Posto auto coperto',
  boxSingolo: 'Box singolo', boxDoppio: 'Box doppio',
};
const L_CANTINA: Record<string, string> = { no: 'No', si: 'Sì' };
const L_RISCALDAMENTO: Record<string, string> = {
  assente: 'Assente', centralizzatoVecchio: 'Centralizzato (vecchio)',
  centralizzatoContabilizzato: 'Centralizzato contabilizzato', autonomo: 'Autonomo',
  autonomoCondensazione: 'Autonomo a condensazione', pompaDiCalore: 'Pompa di calore',
  impiantoRadiante: 'Impianto radiante/evoluto',
};

// ─── Zod schema ─────────────────────────────────────────────────────────────

const formSchema = z.object({
  stato: z.enum(['daRistrutturare', 'daRiattare', 'abitabile', 'buono', 'ottimo', 'ristrutturato', 'nuovo']),
  classeEnergetica: z.enum(['G', 'F', 'E', 'D', 'C', 'B', 'A1', 'A2', 'A3', 'A4']),
  annoCostruzione: z.enum(['prima1945', 'dal1945al1960', 'dal1961al1980', 'dal1981al2000', 'dal2001al2010', 'dal2011al2020', 'dal2021inPoi']),
  ascensore: z.enum(['no', 'si']),
  terrazzo: z.enum(['nessuno', 'balcone', 'balconiMultipli', 'terrazzoAbitabile', 'terrazzoPanoramico']),
  giardino: z.enum(['nessuno', 'piccolo', 'medio', 'grande', 'importante']),
  garage: z.enum(['nessuno', 'postoScoperto', 'postoCoperto', 'boxSingolo', 'boxDoppio']),
  cantina: z.enum(['no', 'si']),
  riscaldamento: z.enum(['assente', 'centralizzatoVecchio', 'centralizzatoContabilizzato', 'autonomo', 'autonomoCondensazione', 'pompaDiCalore', 'impiantoRadiante']),
  notes: z.string().max(500).trim().optional(),
  sessionToken: z.string(),
  form1Data: z.object({
    firstName: z.string(),
    lastName: z.string(),
    email: z.string().email(),
    phone: z.string(),
    city: z.string(),
    address: z.string(),
    squareMeters: z.number(),
    tipologia: z.enum(['appartamento', 'openspaceLoft', 'mansarda', 'attico', 'villettaSchiera', 'villa', 'rusticoCasale', 'stabilePalazzo']).optional(),
    piano: z.enum(['interrato', 'seminterrato', 'pianoTerra', 'rialzato', 'piano1', 'piano2', 'piano3', 'piano4', 'piano5', 'piano6', 'piano7', 'piano8', 'piano9', 'piano10Plus']).optional(),
    locali: z.enum(['locale1', 'locali2', 'locali3', 'locali4', 'locali5', 'locali6', 'locali7Plus']).optional(),
    bagni: z.enum(['bagno1', 'bagni2', 'bagni3', 'bagni4', 'bagni5Plus']).optional(),
  }),
  calculationResult: z.object({
    pricePerSqm: z.number(),
    estimatedValue: z.number(),
  }),
  recaptchaToken: z.string(),
});

// ─── Piano coefficient helper ────────────────────────────────────────────────

function calcolaPianoCoeff(piano: string, ascensore: 'no' | 'si', c: ValuationCoefficientTables): number {
  const soloSenzaAscensore = ['interrato', 'seminterrato', 'rialzato'];
  const soloConAscensore = ['piano6', 'piano7', 'piano8', 'piano9'];

  if (ascensore === 'si' && !soloSenzaAscensore.includes(piano)) {
    return c.pianoConAscensore[piano as PianoConAscensoreKey] ?? 1.00;
  }
  // Without elevator: piano6/7/8/9 map to piano6Plus
  const key = soloConAscensore.includes(piano) ? 'piano6Plus' : piano;
  return c.pianoSenzaAscensore[key as PianoSenzaAscensoreKey] ?? 1.00;
}

// ─── Route handler ───────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = formSchema.parse(body);

    const { form1Data, calculationResult } = validated;
    log.info('Form2 POST received', { city: form1Data.city, sqm: form1Data.squareMeters });

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
        log.warn('Form2 reCAPTCHA failed');
        return NextResponse.json({ error: 'Verifica reCAPTCHA fallita' }, { status: 400 });
      }
      log.debug('Form2 reCAPTCHA passed');
    }

    /* ─── Config + coefficienti ─── */
    const config = await getValuationConfig();
    const coeff = getCoefficienti(config);

    /* ─── Formula moltiplicativa ─── */
    const baseValue = calculationResult.pricePerSqm * form1Data.squareMeters;

    const coeffTipologia    = coeff.tipologia[form1Data.tipologia ?? 'appartamento'] ?? 1.00;
    const coeffStato        = coeff.stato[validated.stato] ?? 1.00;
    const coeffClasseEn     = coeff.classeEnergetica[validated.classeEnergetica] ?? 1.00;
    const coeffAnno         = coeff.annoCostruzione[validated.annoCostruzione] ?? 1.00;
    const coeffPiano        = calcolaPianoCoeff(form1Data.piano ?? 'piano1', validated.ascensore, coeff);
    const coeffLocali       = coeff.locali[form1Data.locali ?? 'locali3'] ?? 1.00;
    const coeffBagni        = coeff.bagni[form1Data.bagni ?? 'bagno1'] ?? 1.00;
    const coeffAscensore    = coeff.ascensore[validated.ascensore] ?? 1.00;
    const coeffTerrazzo     = coeff.terrazzo[validated.terrazzo] ?? 1.00;
    const coeffGiardino     = coeff.giardino[validated.giardino] ?? 1.00;
    const coeffGarage       = coeff.garage[validated.garage] ?? 1.00;
    const coeffCantina      = coeff.cantina[validated.cantina] ?? 1.00;
    const coeffRisc         = coeff.riscaldamento[validated.riscaldamento] ?? 1.00;

    const coeffTotale = coeffTipologia * coeffStato * coeffClasseEn * coeffAnno * coeffPiano *
      coeffLocali * coeffBagni * coeffAscensore * coeffTerrazzo * coeffGiardino *
      coeffGarage * coeffCantina * coeffRisc;

    const finalValue = Math.round(baseValue * coeffTotale);

    const details: Array<{ label: string; coefficiente: number }> = [
      { label: `Tipologia: ${L_TIPOLOGIA[form1Data.tipologia ?? 'appartamento'] ?? form1Data.tipologia}`, coefficiente: coeffTipologia },
      { label: `Stato: ${L_STATO[validated.stato]}`, coefficiente: coeffStato },
      { label: `Classe energetica: ${L_CLASSE_EN[validated.classeEnergetica]}`, coefficiente: coeffClasseEn },
      { label: `Anno costruzione: ${L_ANNO_COST[validated.annoCostruzione]}`, coefficiente: coeffAnno },
      { label: `Piano: ${L_PIANO[form1Data.piano ?? 'piano1'] ?? form1Data.piano}`, coefficiente: coeffPiano },
      { label: `Locali: ${L_LOCALI[form1Data.locali ?? 'locali3'] ?? form1Data.locali}`, coefficiente: coeffLocali },
      { label: `Bagni: ${L_BAGNI[form1Data.bagni ?? 'bagno1'] ?? form1Data.bagni}`, coefficiente: coeffBagni },
      { label: `Ascensore: ${L_ASCENSORE[validated.ascensore]}`, coefficiente: coeffAscensore },
      { label: `Terrazzo/Balcone: ${L_TERRAZZO[validated.terrazzo]}`, coefficiente: coeffTerrazzo },
      { label: `Giardino: ${L_GIARDINO[validated.giardino]}`, coefficiente: coeffGiardino },
      { label: `Garage: ${L_GARAGE[validated.garage]}`, coefficiente: coeffGarage },
      { label: `Cantina: ${L_CANTINA[validated.cantina]}`, coefficiente: coeffCantina },
      { label: `Riscaldamento: ${L_RISCALDAMENTO[validated.riscaldamento]}`, coefficiente: coeffRisc },
      { label: 'Coefficiente totale', coefficiente: coeffTotale },
    ];

    log.info('Form2 calculation complete', { baseValue, finalValue, coeffTotale });

    const finalValuation = { baseValue, finalValue, coeffTotale, details };

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

    worksheet.mergeCells('A1:C1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'VALUTAZIONE IMMOBILIARE';
    titleCell.style = headerStyle;
    worksheet.addRow([]);

    // Proprietario
    worksheet.addRow(['DATI PROPRIETARIO', '', '']).getCell(1).style = sectionStyle;
    worksheet.addRow(['Nome', form1Data.firstName]);
    worksheet.addRow(['Cognome', form1Data.lastName]);
    worksheet.addRow(['Email', form1Data.email]);
    worksheet.addRow(['Telefono', form1Data.phone]);
    worksheet.addRow([]);

    // Immobile
    worksheet.addRow(['DATI IMMOBILE', '', '']).getCell(1).style = sectionStyle;
    worksheet.addRow(['Comune', form1Data.city]);
    worksheet.addRow(['Indirizzo', form1Data.address]);
    worksheet.addRow(['Metri Quadri', form1Data.squareMeters]);
    if (form1Data.tipologia) worksheet.addRow(['Tipologia', L_TIPOLOGIA[form1Data.tipologia] ?? form1Data.tipologia]);
    if (form1Data.piano)     worksheet.addRow(['Piano', L_PIANO[form1Data.piano] ?? form1Data.piano]);
    if (form1Data.locali)    worksheet.addRow(['Locali', L_LOCALI[form1Data.locali] ?? form1Data.locali]);
    if (form1Data.bagni)     worksheet.addRow(['Bagni', L_BAGNI[form1Data.bagni] ?? form1Data.bagni]);
    worksheet.addRow(['Stato immobile', L_STATO[validated.stato]]);
    worksheet.addRow(['Classe energetica', L_CLASSE_EN[validated.classeEnergetica]]);
    worksheet.addRow(['Anno di costruzione', L_ANNO_COST[validated.annoCostruzione]]);
    worksheet.addRow(['Ascensore', L_ASCENSORE[validated.ascensore]]);
    worksheet.addRow(['Terrazzo/Balcone', L_TERRAZZO[validated.terrazzo]]);
    worksheet.addRow(['Giardino', L_GIARDINO[validated.giardino]]);
    worksheet.addRow(['Garage', L_GARAGE[validated.garage]]);
    worksheet.addRow(['Cantina', L_CANTINA[validated.cantina]]);
    worksheet.addRow(['Riscaldamento', L_RISCALDAMENTO[validated.riscaldamento]]);
    if (validated.notes) worksheet.addRow(['Note', validated.notes]);
    worksheet.addRow([]);

    // Coefficienti
    worksheet.addRow(['COEFFICIENTI APPLICATI', 'Valore selezionato', 'Coefficiente']).getCell(1).style = sectionStyle;
    for (const d of details.slice(0, -1)) {
      const [factor, value] = d.label.split(': ');
      worksheet.addRow([factor, value ?? '', d.coefficiente]);
    }
    const totRow = worksheet.addRow(['Coefficiente totale', '', coeffTotale]);
    totRow.getCell(1).style = { font: { bold: true } };
    totRow.getCell(3).style = { font: { bold: true } };
    worksheet.addRow([]);

    // Valutazione finale
    worksheet.addRow(['VALUTAZIONE', '', '']).getCell(1).style = sectionStyle;
    worksheet.addRow(['Valore base (€/mq × superficie)', `€${baseValue.toLocaleString('it-IT')}`]);
    worksheet.addRow(['Coefficiente totale', '', coeffTotale]);
    const finalRow = worksheet.addRow(['VALORE FINALE STIMATO', `€${finalValue.toLocaleString('it-IT')}`]);
    finalRow.getCell(1).style = goldStyle;
    finalRow.getCell(2).style = goldStyle;

    worksheet.getColumn(1).width = 36;
    worksheet.getColumn(2).width = 30;
    worksheet.getColumn(3).width = 16;

    const buffer = await workbook.xlsx.writeBuffer() as unknown as Promise<Buffer>;

    const filename = `valutazione_${form1Data.lastName}_${Date.now()}.xlsx`;
    log.debug('Saving Excel to blob', { filename });
    const blob = await put(filename, await buffer, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    log.info('Excel saved to blob', { filename, url: blob.url });

    return NextResponse.json({ finalValuation });

  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      log.warn('Form2 validation error', error.issues);
      return NextResponse.json({ error: 'Dati non validi', details: error.issues }, { status: 400 });
    }
    log.error('Form2 POST error', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Errore del server' }, { status: 500 });
  }
}
