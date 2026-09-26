import { describe, it, expect } from 'vitest';
import { createCollector, civicNumber, normalizeOdonimo } from '../scripts/anncsu-extract.mjs';
import { getOfficialStreets } from '@/lib/streets/anncsu';

// Righe reali (formato ANNCSU, settembre 2026)
const STRAD = [
  "E639;015125;1132151;;VIA MARTIRI DELLA LIBERTA';;45;;;",
  'E639;015125;1132120;;CASCINA DELL\'OLMO;;0;;;',
  'G078;015159;1065648;;VIA ROMAGNA;;26;;;',
];
const INDIR = [
  "E639;015125;1132151;;VIA MARTIRI DELLA LIBERTA';;;;9000001;;2;;;;;;;;",
  "E639;015125;1132151;;VIA MARTIRI DELLA LIBERTA';;;;9000002;;2;A;;;;;;;",
  "E639;015125;1132151;;VIA MARTIRI DELLA LIBERTA';;;;9000003;;10;;;;;;;;",
  "E639;015125;1132151;;VIA MARTIRI DELLA LIBERTA';;;;9000004;;;;;120;;;;;",
  'G078;015159;1065648;;VIA ROMAGNA;;;;8468605;;4;B;;;;;;;',
];

describe('estrazione ANNCSU', () => {
  it('civicNumber: parte numerica, niente civici metrici o zero', () => {
    expect(civicNumber('12')).toBe('12');
    expect(civicNumber('012')).toBe('12');
    expect(civicNumber('')).toBeNull();
    expect(civicNumber('0')).toBeNull();
  });

  it('normalizeOdonimo: spazi singoli, maiuscolo', () => {
    expect(normalizeOdonimo('  via  roma ')).toBe('VIA ROMA');
  });

  it('raccoglie vie (anche senza civici) e civici deduplicati solo per i comuni richiesti', () => {
    const collector = createCollector(['E639']);
    STRAD.forEach(collector.addStradLine);
    INDIR.forEach(collector.addIndirLine);
    expect(collector.result()).toEqual({
      E639: {
        "CASCINA DELL'OLMO": [],
        "VIA MARTIRI DELLA LIBERTA'": ['2', '10'],
      },
    });
  });

  it('i file generati coprono Opera e Locate', () => {
    expect(Object.keys(getOfficialStreets('opera')!.streets).length).toBeGreaterThan(100);
    expect(Object.keys(getOfficialStreets('locate-di-triulzi')!.streets).length).toBeGreaterThan(90);
    expect(getOfficialStreets('fizzonasco')).toBeNull();
  });
});
