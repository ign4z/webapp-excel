import { describe, it, expect } from 'vitest';
import { applyStreetRenames, type StreetRow, type CivicRow } from '@/lib/street-rename';

const streets: StreetRow[] = [
  { key: 'piazza vittoria', value: 2000 },
  { key: 'via roma', value: 2050 },
  { key: 'via kennedy', value: 1980 },
];

const civics: CivicRow[] = [
  { street: 'piazza vittoria', civic: '1', price: 2100 },
  { street: 'piazza vittoria', civic: '2', price: 2150 },
  { street: 'via roma', civic: '15', price: 2200 },
];

describe('applyStreetRenames', () => {
  it('rinomina la via e tutti i suoi civici', () => {
    const out = applyStreetRenames(streets, civics, [{ from: 'piazza vittoria', to: 'Piazza della Vittoria' }]);
    expect(out.applied).toEqual([{ from: 'piazza vittoria', to: 'piazza della vittoria' }]);
    expect(out.conflicts).toEqual([]);
    expect(out.streetRows[0]).toEqual({ key: 'piazza della vittoria', value: 2000 });
    expect(out.civicRows.slice(0, 2).map((r) => r.street)).toEqual(['piazza della vittoria', 'piazza della vittoria']);
  });

  it('lascia invariate le righe non coinvolte', () => {
    const out = applyStreetRenames(streets, civics, [{ from: 'piazza vittoria', to: 'piazza della vittoria' }]);
    expect(out.streetRows[1]).toBe(streets[1]);
    expect(out.civicRows[2]).toBe(civics[2]);
  });

  it('non sovrascrive una via già esistente e segnala il conflitto', () => {
    const out = applyStreetRenames(streets, civics, [{ from: 'via kennedy', to: 'via roma' }]);
    expect(out.applied).toEqual([]);
    expect(out.conflicts).toEqual([{ from: 'via kennedy', to: 'via roma' }]);
    expect(out.streetRows.map((r) => r.key)).toEqual(['piazza vittoria', 'via roma', 'via kennedy']);
  });

  it('due rinomine verso lo stesso nome: applica solo la prima', () => {
    const out = applyStreetRenames(streets, civics, [
      { from: 'via roma', to: 'via di roma' },
      { from: 'via kennedy', to: 'via di roma' },
    ]);
    expect(out.applied).toHaveLength(1);
    expect(out.conflicts).toEqual([{ from: 'via kennedy', to: 'via di roma' }]);
  });

  it('applica più rinomine insieme', () => {
    const out = applyStreetRenames(streets, civics, [
      { from: 'piazza vittoria', to: 'piazza della vittoria' },
      { from: 'via kennedy', to: 'via john fitzgerald kennedy' },
    ]);
    expect(out.streetRows.map((r) => r.key)).toEqual(['piazza della vittoria', 'via roma', 'via john fitzgerald kennedy']);
  });

  it('ignora rinomine vuote o identiche (a meno di maiuscole)', () => {
    const out = applyStreetRenames(streets, civics, [{ from: 'via roma', to: 'Via Roma' }, { from: '', to: 'x' }]);
    expect(out.applied).toEqual([]);
    expect(out.conflicts).toEqual([]);
  });
});
