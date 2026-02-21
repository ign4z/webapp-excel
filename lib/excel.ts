// lib/excel.ts

import ExcelJS from 'exceljs';
import { put } from '@vercel/blob';
import { Form1Data, Form2Data } from '@/types';

/**
 * Genera un file Excel con i dati dell'utente
 */
export async function generateExcel(
  form1Data: Form1Data,
  form2Data: Form2Data,
  calculationResult: any
): Promise<{ blobUrl: string; filename: string; size: number }> {
  
  // Crea workbook
  const workbook = new ExcelJS.Workbook();
  
  // Metadata
  workbook.creator = 'WebApp Excel';
  workbook.created = new Date();
  
  // Worksheet principale
  const worksheet = workbook.addWorksheet('Dati Cliente', {
    properties: { tabColor: { argb: 'FF00FF00' } }
  });

  // === INTESTAZIONE ===
  worksheet.mergeCells('A1:D1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = 'RIEPILOGO ORDINE';
  titleCell.font = { size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0070C0' }
  };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  worksheet.getRow(1).height = 30;

  // === DATI PERSONALI ===
  worksheet.addRow([]);
  worksheet.addRow(['DATI PERSONALI']);
  worksheet.getCell('A3').font = { bold: true, size: 12 };
  
  worksheet.addRow(['Nome:', form1Data.name]);
  worksheet.addRow(['Email:', form1Data.email]);
  worksheet.addRow(['Telefono:', form1Data.phone]);
  
  // === DATI AZIENDALI ===
  worksheet.addRow([]);
  worksheet.addRow(['DATI AZIENDALI']);
  worksheet.getCell('A8').font = { bold: true, size: 12 };
  
  worksheet.addRow(['Azienda:', form2Data.company]);
  worksheet.addRow(['Indirizzo:', form2Data.address]);
  worksheet.addRow(['Note:', form2Data.notes]);

  // === DETTAGLI ORDINE ===
  worksheet.addRow([]);
  worksheet.addRow(['DETTAGLI ORDINE']);
  worksheet.getCell('A13').font = { bold: true, size: 12 };
  
  worksheet.addRow(['Quantità:', form1Data.quantity]);
  worksheet.addRow(['Prezzo Base:', `€${calculationResult.basePrice}`]);
  worksheet.addRow(['Sconto:', `€${calculationResult.discount}`]);
  worksheet.addRow(['Prezzo Finale:', `€${calculationResult.finalPrice}`]);
  
  // Stile prezzo finale (evidenziato)
  const finalPriceRow = worksheet.getRow(17);
  finalPriceRow.font = { bold: true, color: { argb: 'FFFF0000' }, size: 14 };
  finalPriceRow.getCell(2).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFFEB9C' }
  };

  // === TIMESTAMP ===
  worksheet.addRow([]);
  worksheet.addRow(['Data Invio:', new Date().toLocaleString('it-IT')]);

  // === FORMATTAZIONE COLONNE ===
  worksheet.columns = [
    { width: 20 }, // Colonna A
    { width: 35 }, // Colonna B
    { width: 15 }, // Colonna C
    { width: 15 }, // Colonna D
  ];

  // Bordi per tutte le celle con dati
  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber > 1) {
      row.eachCell({ includeEmpty: false }, (cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    }
  });

  // === GENERA BUFFER ===
  const buffer = await workbook.xlsx.writeBuffer();
  
  // === UPLOAD SU VERCEL BLOB ===
  const filename = `ordine_${form1Data.email}_${Date.now()}.xlsx`;
  
  const blob = await put(filename, buffer, {
    access: 'public',
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  console.log('✅ File Excel caricato su Blob Storage:', blob.url);

  return {
    blobUrl: blob.url,
    filename,
    size: buffer.byteLength,
  };
}

/**
 * Crea un Excel di esempio (per testing)
 */
export async function generateSampleExcel(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Sample');
  
  worksheet.addRow(['Colonna 1', 'Colonna 2', 'Colonna 3']);
  worksheet.addRow(['Valore 1', 'Valore 2', 'Valore 3']);
  
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
