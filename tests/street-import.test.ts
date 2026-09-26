import { describe, it, expect } from 'vitest';
import { buildOfficialImport, expandCivics, isCompatiblePartial, type OfficialStreetEntry } from '@/lib/street-import';
import type { StreetRow, CivicRow } from '@/lib/street-rename';

const found = (route: string, partial = false) => ({ status: 'found' as const, route, partial });

const official: OfficialStreetEntry[] = [
  { anncsu: 'PIAZZA DELLA VITTORIA', google: found('Piazza della Vittoria'), civici: ['1', '2', '3'] },
  { anncsu: 'VIA MARTIRI DELLA LIBERTA\'', google: found('Via Martiri della Libertà'), civici: ['2', '4'] },
  { anncsu: 'VIA GIOVANNI FALCONE', google: found('Via Giovanni Falcone'), civici: ['10'] },
  { anncsu: 'CASCINA FOLLA', google: { status: 'not_found' }, civici: ['1'] },
  { anncsu: 'VIA DEI MULINI', google: found('Strada Provinciale 40', true), civici: [] },
];

const streets: StreetRow[] = [
  { key: 'piazza della vittoria', value: 2100 },       // già col nome Google
  { key: 'via martiri della liberta\'', value: 1950 }, // nome ANNCSU → rinominata
  { key: 'via roma', value: 2050 },                    // inesistente → rimossa
];

const civics: CivicRow[] = [
  { street: 'piazza della vittoria', civic: '2', price: 2300 },
  { street: 'via martiri della liberta\'', civic: '4', price: 2000 },
  { street: 'via roma', civic: '15', price: 2200 },
];

describe('buildOfficialImport', () => {
  const out = buildOfficialImport(streets, civics, official, 1900);
  const price = (key: string) => out.streetRows.find((r) => r.key === key)?.value;

  it('mantiene il prezzo delle vie già presenti', () => {
    expect(out.kept).toEqual(['piazza della vittoria']);
    expect(price('piazza della vittoria')).toBe(2100);
  });

  it('rinomina col nome Google tenendo prezzo e civici', () => {
    expect(out.renamed).toEqual([{ from: 'via martiri della liberta\'', to: 'via martiri della libertà' }]);
    expect(price('via martiri della libertà')).toBe(1950);
    expect(out.civicRows).toContainEqual({ street: 'via martiri della libertà', civic: '4', price: 2000 });
  });

  it('aggiunge le vie nuove col prezzo di default', () => {
    expect(out.added).toEqual(['via giovanni falcone', 'cascina folla', 'via dei mulini']);
    expect(price('via giovanni falcone')).toBe(1900);
  });

  it('rimuove le vie inesistenti insieme ai loro civici', () => {
    expect(out.removed).toEqual(['via roma']);
    expect(price('via roma')).toBeUndefined();
    expect(out.civicRows.some((r) => r.street === 'via roma')).toBe(false);
  });

  it('usa il nome ANNCSU quando Google non trova la via o dà un match approssimato', () => {
    expect(out.unconfirmed).toEqual([
      { anncsu: 'CASCINA FOLLA', name: 'cascina folla', suggestion: undefined },
      { anncsu: 'VIA DEI MULINI', name: 'via dei mulini', suggestion: 'strada provinciale 40' },
    ]);
  });

  it('due vie ANNCSU con lo stesso nome Google: lo tiene quella con il nome identico', () => {
    const r = buildOfficialImport([], [], [
      { anncsu: 'VIA ROMA VECCHIA', google: found('Via Roma'), civici: [] },
      { anncsu: 'VIA ROMA', google: found('Via Roma'), civici: [] },
    ], 1900);
    expect(r.streetRows.map((s) => s.key)).toEqual(['via roma', 'via roma vecchia']);
    expect(r.unconfirmed.map((u) => u.name)).toEqual(['via roma vecchia']);
  });
});

describe('expandCivics', () => {
  const rows: StreetRow[] = [
    { key: 'piazza della vittoria', value: 2100 },
    { key: 'via martiri della liberta\'', value: 1950 }, // trovata tramite nome ANNCSU
    { key: 'via inventata', value: 1800 },
  ];

  it('aggiunge solo i civici mancanti, con il prezzo della via', () => {
    const out = expandCivics(rows, [{ street: 'piazza della vittoria', civic: '2', price: 2300 }], official);
    expect(out.added).toBe(4);
    expect(out.expandedStreets).toBe(2);
    expect(out.civicRows).toContainEqual({ street: 'piazza della vittoria', civic: '2', price: 2300 });
    expect(out.civicRows).toContainEqual({ street: 'piazza della vittoria', civic: '3', price: 2100 });
    expect(out.civicRows).toContainEqual({ street: 'via martiri della liberta\'', civic: '4', price: 1950 });
  });

  it('segnala le vie senza dati ufficiali', () => {
    expect(expandCivics(rows, [], official).unmatchedStreets).toEqual(['via inventata']);
  });

  it('seconda espansione: niente da aggiungere', () => {
    const first = expandCivics(rows, [], official);
    expect(expandCivics(rows, first.civicRows, official).added).toBe(0);
  });
});

describe('isCompatiblePartial', () => {
  it('accetta il nome Google abbreviato dello stesso tipo', () => {
    expect(isCompatiblePartial('VIA CARLO ROMANONI', 'via romanoni')).toBe(true);
    expect(isCompatiblePartial('VICOLO SAN MICHELE DEL CARSO', 'Vicolo San Michele')).toBe(true);
    expect(isCompatiblePartial('VIA PRIVATA SOGLIANI', 'via sogliani')).toBe(true);
    expect(isCompatiblePartial("VIA MARTIRI DELLA LIBERTA'", 'Via Martiri della Libertà')).toBe(true);
  });

  it('scarta vie diverse o di tipo diverso', () => {
    expect(isCompatiblePartial('VIA LUIGI SALAZAR', 'via luigi calori')).toBe(false);
    expect(isCompatiblePartial('CASCINA MIRASOLE', 'strada consortile mirasole')).toBe(false);
    expect(isCompatiblePartial('PIAZZA MARTIRI DI CEFALONIA', 'via martiri di cefalonia')).toBe(false);
    expect(isCompatiblePartial('VIA CORTE BENEGGI', 'via privata dottore luigi beneggi')).toBe(false);
  });

  it('nell\'import il match approssimato compatibile tiene prezzo e nome Google', () => {
    const r = buildOfficialImport([{ key: 'via romanoni', value: 2200 }], [], [
      { anncsu: 'VIA CARLO ROMANONI', google: found('Via Romanoni', true), civici: [] },
    ], 1900);
    expect(r.streetRows).toEqual([{ key: 'via romanoni', value: 2200 }]);
    expect(r.removed).toEqual([]);
    expect(r.unconfirmed).toEqual([]);
  });
});

describe('abbinamento a righe esistenti compatibili', () => {
  it('via non confermata da Google: tiene la forma abbreviata già in lista col suo prezzo', () => {
    const r = buildOfficialImport([{ key: 'via salazar', value: 2300 }, { key: 'viale molise', value: 2000 }], [], [
      { anncsu: 'VIA LUIGI SALAZAR', google: found('Via Luigi Calori', true), civici: [] },
      { anncsu: 'VIA MOLISE', google: { status: 'not_found' }, civici: [] },
    ], 1900);
    expect(r.streetRows).toEqual([{ key: 'via molise', value: 1900 }, { key: 'via salazar', value: 2300 }]);
    expect(r.kept).toEqual(['via salazar']);
    expect(r.removed).toEqual(['viale molise']); // tipo diverso: non abbinata
    expect(r.unconfirmed.map((u) => u.name)).toEqual(['via molise']);
  });
});
