import { describe, it, expect } from 'vitest';
import { extractStreetName, extractCivicNumber } from '@/lib/streets';

describe('extractStreetName', () => {
  it('prende il primo segmento in minuscolo', () => {
    expect(extractStreetName('Via Roma, 15, 20090 Opera MI, Italia')).toBe('via roma');
  });
});

describe('extractCivicNumber', () => {
  it('civico numerico', () => {
    expect(extractCivicNumber('Via Roma, 15, 20090 Opera MI, Italia')).toBe('15');
  });

  it('civico con suffisso → solo la parte numerica', () => {
    expect(extractCivicNumber('Via Roma, 15/A, 20090 Opera MI, Italia')).toBe('15');
    expect(extractCivicNumber('Via Roma, 15 bis, 20090 Opera MI, Italia')).toBe('15');
  });

  it('indirizzo senza virgole → null', () => {
    expect(extractCivicNumber('Via Roma')).toBeNull();
  });

  it('secondo segmento non numerico → null', () => {
    expect(extractCivicNumber('Via Roma, Opera MI, Italia')).toBeNull();
  });
});
