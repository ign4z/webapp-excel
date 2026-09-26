import { describe, it, expect, vi, beforeEach } from 'vitest';

// Logger e store Blob simulati: il blob della città contiene la mappa `blobStreets`
const { log, blobStreets } = vi.hoisted(() => ({
  log: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn(), trace: vi.fn() },
  blobStreets: { current: null as Record<string, number> | null },
}));
vi.mock('@/lib/logger', () => ({ createLogger: () => log }));
vi.mock('@/lib/blob-json-cache', () => ({
  readBlobJson: vi.fn(async () => blobStreets.current),
  invalidateBlobJson: vi.fn(),
}));

import { extractStreetName, extractCivicNumber, getPriceForStreet, getSeedStreetPrices } from '@/lib/streets';
import { getRouteName, isInCity } from '@/lib/address';

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

describe('getRouteName / isInCity', () => {
  const comp = (long_name: string, ...types: string[]) => ({ long_name, types });

  it('estrae la via dal componente route', () => {
    expect(getRouteName([comp('1', 'street_number'), comp(' Piazza della Vittoria ', 'route')])).toBe('Piazza della Vittoria');
    expect(getRouteName([comp('Opera', 'locality')])).toBeNull();
  });

  it('riconosce il comune da locality o administrative_area_level_3, senza maiuscole', () => {
    expect(isInCity([comp('Opera', 'locality', 'political')], 'opera')).toBe(true);
    expect(isInCity([comp('Pieve Emanuele', 'administrative_area_level_3')], 'Pieve Emanuele')).toBe(true);
    expect(isInCity([comp('Rozzano', 'locality')], 'Opera')).toBe(false);
    expect(isInCity([comp('Via Roma', 'route')], 'Opera')).toBe(false);
  });
});

describe('getPriceForStreet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    blobStreets.current = {
      'piazza della vittoria': 2000,
      'piazza della vittoria:2': 2150,
    };
  });

  it('civico → via, senza warning', async () => {
    expect(await getPriceForStreet('Piazza della Vittoria, 2', 'Opera')).toBe(2150);
    expect(await getPriceForStreet('Piazza della Vittoria, 9', 'Opera')).toBe(2000);
    expect(log.warn).not.toHaveBeenCalled();
  });

  it('via non in lista → default del comune e warning con il nome Google', async () => {
    expect(await getPriceForStreet('Piazza Vittoria, 2', 'Opera')).toBe(1900); // defaultPrice seed Opera
    expect(log.warn).toHaveBeenCalledWith('Street not in price list, using city default', {
      slug: 'opera',
      street: 'piazza vittoria',
    });
  });

  it('blob assente → usa il seed', async () => {
    blobStreets.current = null;
    const [street, price] = Object.entries(getSeedStreetPrices('opera')).find(([k]) => !k.includes(':'))!;
    expect(await getPriceForStreet(`${street}, 1`, 'Opera')).toBe(price);
  });
});
