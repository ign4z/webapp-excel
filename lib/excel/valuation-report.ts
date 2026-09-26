// lib/excel/valuation-report.ts
// Genera il report Excel della valutazione definitiva (Step 2).

import ExcelJS from 'exceljs';
import type { Form1Values, Form2Values } from '@/lib/schema';
import type { ValuationResult } from '@/lib/valuation';
import {
  TIPOLOGIA_LABELS,
  STATO_LABELS,
  CLASSE_ENERGETICA_LABELS,
  ANNO_COST_LABELS,
  PIANO_LABELS,
  LOCALI_LABELS,
  BAGNI_LABELS,
  ASCENSORE_LABELS,
  TERRAZZO_LABELS,
  GIARDINO_LABELS,
  GARAGE_LABELS,
  CANTINA_LABELS,
  RISCALDAMENTO_LABELS,
} from '@/lib/labels';

const headerStyle: Partial<ExcelJS.Style> = {
  font: { bold: true, size: 14, color: { argb: 'FFFFFFFF' } },
  fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E2230' } },
  alignment: { horizontal: 'center' },
};
const sectionStyle: Partial<ExcelJS.Style> = {
  font: { bold: true, size: 11 },
  fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEDE8DF' } },
};
const goldStyle: Partial<ExcelJS.Style> = {
  font: { bold: true, size: 13, color: { argb: 'FF9A7535' } },
};

export async function buildValuationReport(
  form1: Form1Values,
  form2: Form2Values,
  valuation: ValuationResult,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Valutazione');

  worksheet.mergeCells('A1:C1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = 'VALUTAZIONE IMMOBILIARE';
  titleCell.style = headerStyle;
  worksheet.addRow([]);

  // Proprietario
  worksheet.addRow(['DATI PROPRIETARIO', '', '']).getCell(1).style = sectionStyle;
  worksheet.addRow(['Nome', form1.firstName]);
  worksheet.addRow(['Cognome', form1.lastName]);
  worksheet.addRow(['Email', form1.email]);
  worksheet.addRow(['Telefono', form1.phone]);
  worksheet.addRow([]);

  // Immobile
  worksheet.addRow(['DATI IMMOBILE', '', '']).getCell(1).style = sectionStyle;
  worksheet.addRow(['Comune', form1.city]);
  worksheet.addRow(['Indirizzo', form1.address]);
  worksheet.addRow(['Metri Quadri', form1.squareMeters]);
  worksheet.addRow(['Tipologia', TIPOLOGIA_LABELS[form1.tipologia]]);
  worksheet.addRow(['Piano', PIANO_LABELS[form1.piano]]);
  worksheet.addRow(['Locali', LOCALI_LABELS[form1.locali]]);
  worksheet.addRow(['Bagni', BAGNI_LABELS[form1.bagni]]);
  worksheet.addRow(['Stato immobile', STATO_LABELS[form2.stato]]);
  worksheet.addRow(['Classe energetica', CLASSE_ENERGETICA_LABELS[form2.classeEnergetica]]);
  worksheet.addRow(['Anno di costruzione', ANNO_COST_LABELS[form2.annoCostruzione]]);
  worksheet.addRow(['Ascensore', ASCENSORE_LABELS[form2.ascensore]]);
  worksheet.addRow(['Terrazzo/Balcone', TERRAZZO_LABELS[form2.terrazzo]]);
  worksheet.addRow(['Giardino', GIARDINO_LABELS[form2.giardino]]);
  worksheet.addRow(['Garage', GARAGE_LABELS[form2.garage]]);
  worksheet.addRow(['Cantina', CANTINA_LABELS[form2.cantina]]);
  worksheet.addRow(['Riscaldamento', RISCALDAMENTO_LABELS[form2.riscaldamento]]);
  if (form2.notes) worksheet.addRow(['Note', form2.notes]);
  worksheet.addRow([]);

  // Coefficienti
  worksheet.addRow(['COEFFICIENTI APPLICATI', 'Valore selezionato', 'Coefficiente']).getCell(1).style = sectionStyle;
  for (const d of valuation.coefficients) {
    worksheet.addRow([d.factor, d.value, d.coefficiente]);
  }
  const totRow = worksheet.addRow(['Coefficiente totale', '', valuation.coeffTotale]);
  totRow.getCell(1).style = { font: { bold: true } };
  totRow.getCell(3).style = { font: { bold: true } };
  worksheet.addRow([]);

  // Valutazione finale
  worksheet.addRow(['VALUTAZIONE', '', '']).getCell(1).style = sectionStyle;
  worksheet.addRow(['Valore base (€/mq × superficie)', `€${valuation.baseValue.toLocaleString('it-IT')}`]);
  worksheet.addRow(['Coefficiente totale', '', valuation.coeffTotale]);
  const finalRow = worksheet.addRow(['VALORE FINALE STIMATO', `€${valuation.finalValue.toLocaleString('it-IT')}`]);
  finalRow.getCell(1).style = goldStyle;
  finalRow.getCell(2).style = goldStyle;

  worksheet.getColumn(1).width = 36;
  worksheet.getColumn(2).width = 30;
  worksheet.getColumn(3).width = 16;

  return Buffer.from(await workbook.xlsx.writeBuffer());
}
