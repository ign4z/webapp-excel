import { describe, it, expect } from 'vitest';
import {
  formatStreetLabel,
  searchStreets,
  findExactStreet,
  composeAddress,
  splitAddress,
  CIVIC_PATTERN,
  type StreetOption,
} from '@/lib/street-search';
import { extractStreetName, extractCivicNumber } from '@/lib/streets';

const opt = (name: string): StreetOption => ({ name, label: formatStreetLabel(name), civici: [] });
const streets = [
  'piazza giovanni falcone',
  'via giovanni verdi',
  'via giuseppe garibaldi',
  'via martiri della libertà',
  'via xxv aprile',
  'largo pietro nenni',
].map(opt);

describe('formatStreetLabel', () => {
  it('maiuscole sulle parole, preposizioni minuscole, numeri romani maiuscoli', () => {
    expect(formatStreetLabel('via martiri della libertà')).toBe('Via Martiri della Libertà');
    expect(formatStreetLabel("cascina dell'olmo")).toBe("Cascina dell'Olmo");
    expect(formatStreetLabel("via san francesco d'assisi")).toBe("Via San Francesco d'Assisi");
    expect(formatStreetLabel('via xxv aprile')).toBe('Via XXV Aprile');
    expect(formatStreetLabel('via papa giovanni xxiii')).toBe('Via Papa Giovanni XXIII');
    expect(formatStreetLabel('via g. garibaldi')).toBe('Via G. Garibaldi');
    expect(formatStreetLabel('via vivaldi')).toBe('Via Vivaldi'); // non un numero romano
  });
});

describe('searchStreets', () => {
  const labels = (q: string) => searchStreets(streets, q).map((s) => s.label);

  it('ogni parola digitata è l\'inizio di una parola del nome', () => {
    expect(labels('giov falc')).toEqual(['Piazza Giovanni Falcone']);
    expect(labels('giov')).toEqual(['Piazza Giovanni Falcone', 'Via Giovanni Verdi']);
  });

  it('ignora accenti, maiuscole e tipo di via; prima i nomi che iniziano con la ricerca', () => {
    expect(labels('LIBERTA')).toEqual(['Via Martiri della Libertà']);
    expect(labels('via g')[0]).toBe('Via Giovanni Verdi');
    expect(labels('nenni')).toEqual(['Largo Pietro Nenni']);
    expect(labels('pietro')).toEqual(['Largo Pietro Nenni']);
  });

  it('ricerca vuota → le prime vie; nessuna corrispondenza → lista vuota', () => {
    expect(searchStreets(streets, '', 3)).toHaveLength(3);
    expect(labels('inesistente')).toEqual([]);
  });
});

describe('findExactStreet', () => {
  it('trova la via scritta per intero, senza badare a maiuscole e accenti', () => {
    expect(findExactStreet(streets, 'Via Martiri della Liberta')?.name).toBe('via martiri della libertà');
    expect(findExactStreet(streets, 'via martiri')).toBeNull();
  });
});

describe('composeAddress / splitAddress', () => {
  it('formato compatibile con il lookup prezzi lato server', () => {
    const address = composeAddress('Piazza Giovanni Falcone', '15/A');
    expect(address).toBe('Piazza Giovanni Falcone, 15/A');
    expect(extractStreetName(address)).toBe('piazza giovanni falcone');
    expect(extractCivicNumber(address)).toBe('15');
    expect(composeAddress('Via XXV Aprile', ' ')).toBe('Via XXV Aprile');
  });

  it('splitAddress ripristina via e civico', () => {
    expect(splitAddress('Via XXV Aprile, 10')).toEqual({ street: 'Via XXV Aprile', civic: '10' });
    expect(splitAddress('Via Roma')).toEqual({ street: 'Via Roma', civic: '' });
    // vecchio formato Google completo: il secondo segmento non è un civico
    expect(splitAddress('Via Roma, Opera MI, Italia')).toEqual({ street: 'Via Roma', civic: '' });
  });

  it('CIVIC_PATTERN accetta numeri con esponente', () => {
    for (const c of ['15', '15/A', '15 bis', '2B']) expect(CIVIC_PATTERN.test(c)).toBe(true);
    for (const c of ['abc', '15-17', '']) expect(CIVIC_PATTERN.test(c)).toBe(false);
  });
});
