import { describe, it, expect } from 'vitest';
import { extractStreetName, extractCivicNumber } from '@/lib/streets';
import { buildCanonicalAddress } from '@/lib/address';

describe('buildCanonicalAddress', () => {
  const comp = (long_name: string, ...types: string[]) => ({ long_name, types });

  it('via + civico → "Via Roma, 15", compatibile con gli extractor', () => {
    const address = buildCanonicalAddress([
      comp('15', 'street_number'),
      comp('Via Roma', 'route'),
      comp('Opera', 'locality', 'political'),
    ]);
    expect(address).toBe('Via Roma, 15');
    expect(extractStreetName(address!)).toBe('via roma');
    expect(extractCivicNumber(address!)).toBe('15');
  });

  it('senza civico → solo la via', () => {
    const address = buildCanonicalAddress([comp('Via Roma', 'route')]);
    expect(address).toBe('Via Roma');
    expect(extractCivicNumber(address!)).toBeNull();
  });

  it('senza route → null', () => {
    expect(buildCanonicalAddress([comp('Opera', 'locality')])).toBeNull();
  });
});

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
