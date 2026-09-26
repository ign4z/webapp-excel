import { describe, it, expect } from 'vitest';
import { computeValuation, calcolaPianoCoeff, type ValuationInput } from '@/lib/valuation';
import { defaultConfig, mergeWithDefaults } from '@/lib/config';

const c = defaultConfig.coefficienti;

const input: ValuationInput = {
  squareMeters: 100,
  tipologia: 'appartamento',
  piano: 'piano1',
  locali: 'locali3',
  bagni: 'bagno1',
  stato: 'buono',
  classeEnergetica: 'D',
  annoCostruzione: 'dal1981al2000',
  ascensore: 'no',
  terrazzo: 'nessuno',
  giardino: 'nessuno',
  garage: 'nessuno',
  cantina: 'no',
  riscaldamento: 'centralizzatoContabilizzato',
};

describe('calcolaPianoCoeff', () => {
  it('usa la tabella con ascensore quando presente', () => {
    expect(calcolaPianoCoeff('piano3', 'si', c)).toBe(c.pianoConAscensore.piano3);
  });

  it('usa la tabella senza ascensore per interrato anche se ascensore = si', () => {
    expect(calcolaPianoCoeff('interrato', 'si', c)).toBe(c.pianoSenzaAscensore.interrato);
  });

  it('senza ascensore i piani 6-9 confluiscono in piano6Plus', () => {
    for (const p of ['piano6', 'piano7', 'piano8', 'piano9']) {
      expect(calcolaPianoCoeff(p, 'no', c)).toBe(c.pianoSenzaAscensore.piano6Plus);
    }
  });

  it('chiave sconosciuta → 1.00', () => {
    expect(calcolaPianoCoeff('piano99', 'si', c)).toBe(1);
  });
});

describe('computeValuation', () => {
  it('valore base = prezzo €/mq × superficie', () => {
    expect(computeValuation(input, 2000, c).baseValue).toBe(200000);
  });

  it('valore finale = base × prodotto dei 13 coefficienti', () => {
    const r = computeValuation(input, 2000, c);
    const product = r.coefficients.reduce((acc, d) => acc * d.coefficiente, 1);
    expect(r.coefficients).toHaveLength(13);
    expect(r.coeffTotale).toBeCloseTo(product, 10);
    expect(r.finalValue).toBe(Math.round(200000 * product));
    expect(r.totalAdjustment).toBe(r.finalValue - r.baseValue);
  });

  it('con coefficienti tutti a 1 il valore finale coincide con il base', () => {
    const ones = JSON.parse(JSON.stringify(c), (_k, v) => (typeof v === 'number' ? 1 : v));
    const r = computeValuation(input, 2500, ones);
    expect(r.finalValue).toBe(250000);
    expect(r.totalAdjustment).toBe(0);
  });

  it('details termina con il coefficiente totale e ha label leggibili', () => {
    const r = computeValuation(input, 2000, c);
    expect(r.details.at(-1)).toEqual({ label: 'Coefficiente totale', coefficiente: r.coeffTotale });
    expect(r.details[1].label).toBe('Stato: Buono');
  });
});

describe('mergeWithDefaults', () => {
  it('una tabella parziale non cancella le altre chiavi della stessa tabella', () => {
    const merged = mergeWithDefaults({ coefficienti: { stato: { nuovo: 1.5 } } } as never);
    expect(merged.coefficienti.stato.nuovo).toBe(1.5);
    expect(merged.coefficienti.stato.buono).toBe(c.stato.buono);
    expect(merged.coefficienti.garage).toEqual(c.garage);
  });

  it('non modifica defaultConfig', () => {
    const before = JSON.stringify(defaultConfig);
    mergeWithDefaults({ coefficienti: { stato: { nuovo: 9 } } } as never);
    expect(JSON.stringify(defaultConfig)).toBe(before);
  });
});
