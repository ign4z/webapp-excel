import { describe, it, expect } from 'vitest';
import ExcelJS from 'exceljs';
import { buildValuationReport } from '@/lib/excel/valuation-report';
import { computeValuation } from '@/lib/valuation';
import { defaultConfig } from '@/lib/config';
import type { Form1Values, Form2Values } from '@/lib/schema';

const form1: Form1Values = {
  firstName: 'Mario', lastName: 'Rossi', email: 'mario@example.com', phone: '3331234567',
  city: 'Opera', address: 'Via Roma, 15, 20090 Opera MI, Italia', squareMeters: 100,
  tipologia: 'appartamento', piano: 'piano2', locali: 'locali3', bagni: 'bagno1',
};

const form2: Form2Values = {
  stato: 'buono', classeEnergetica: 'D', annoCostruzione: 'dal1981al2000', ascensore: 'si',
  terrazzo: 'balcone', giardino: 'nessuno', garage: 'boxSingolo', cantina: 'si',
  riscaldamento: 'autonomo', notes: 'Vista parco',
};

const valuation = computeValuation({ ...form1, ...form2 }, 2050, defaultConfig.coefficienti);

async function readSheet(extra: Partial<Form2Values> = {}) {
  const buffer = await buildValuationReport(form1, { ...form2, ...extra }, valuation);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as unknown as ArrayBuffer);
  const ws = wb.getWorksheet('Valutazione')!;
  // Mappa etichetta colonna A → riga, per cercare i valori senza dipendere dai numeri di riga.
  // Vince l'ultima occorrenza: le righe coefficienti ("Tipologia", "Piano"…) seguono i dati immobile omonimi.
  const rows = new Map<string, ExcelJS.Row>();
  ws.eachRow((row) => {
    const label = row.getCell(1).value;
    if (typeof label === 'string') rows.set(label, row);
  });
  return { ws, rows };
}

describe('buildValuationReport', () => {
  it('contiene dati del proprietario e dell\'immobile', async () => {
    const { ws, rows } = await readSheet();
    expect(ws.getCell('A1').value).toBe('VALUTAZIONE IMMOBILIARE');
    expect(rows.get('Cognome')?.getCell(2).value).toBe('Rossi');
    expect(rows.get('Indirizzo')?.getCell(2).value).toBe(form1.address);
    expect(rows.get('Metri Quadri')?.getCell(2).value).toBe(100);
    expect(rows.get('Note')?.getCell(2).value).toBe('Vista parco');
  });

  it('elenca un coefficiente per riga e il coefficiente totale', async () => {
    const { rows } = await readSheet();
    for (const d of valuation.coefficients) {
      expect(rows.get(d.factor)?.getCell(3).value).toBe(d.coefficiente);
    }
    expect(rows.get('Coefficiente totale')?.getCell(3).value).toBe(valuation.coeffTotale);
  });

  it('riporta valore base e valore finale', async () => {
    const { rows } = await readSheet();
    expect(rows.get('Valore base (€/mq × superficie)')?.getCell(2).value)
      .toBe(`€${valuation.baseValue.toLocaleString('it-IT')}`);
    expect(rows.get('VALORE FINALE STIMATO')?.getCell(2).value)
      .toBe(`€${valuation.finalValue.toLocaleString('it-IT')}`);
  });

  it('omette la riga Note se non ci sono note', async () => {
    const { rows } = await readSheet({ notes: undefined });
    expect(rows.has('Note')).toBe(false);
  });
});
