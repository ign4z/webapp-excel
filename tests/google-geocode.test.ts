import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { geocodeStreetName, geocodeStreetNames, GoogleConfigError, romanNumeralVariant } from '@/lib/google-geocode';

const comp = (long_name: string, ...types: string[]) => ({ long_name, types });
const result = (route: string, city: string, partial = false) => ({
  address_components: [comp(route, 'route'), comp(city, 'locality', 'political')],
  ...(partial ? { partial_match: true } : {}),
});
const reply = (body: unknown) => Promise.resolve(new Response(JSON.stringify(body)));

const fetchMock = vi.fn();
const originalEnv = { ...process.env };

beforeEach(() => {
  process.env.GOOGLE_MAPS_SERVER_KEY = 'server-key';
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  process.env = { ...originalEnv };
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('geocodeStreetName', () => {
  it('restituisce la via del primo risultato nel comune richiesto', async () => {
    fetchMock.mockReturnValueOnce(reply({
      status: 'OK',
      results: [result('Via Roma', 'Rozzano'), result('Piazza della Vittoria', 'Opera')],
    }));
    expect(await geocodeStreetName('PIAZZA VITTORIA', 'Opera'))
      .toEqual({ status: 'found', route: 'Piazza della Vittoria', partial: false });
    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.searchParams.get('address')).toBe('PIAZZA VITTORIA, Opera, Italia');
    expect(url.searchParams.get('key')).toBe('server-key');
  });

  it('segnala il match approssimato', async () => {
    fetchMock.mockReturnValueOnce(reply({ status: 'OK', results: [result('Via Dante', 'Opera', true)] }));
    expect(await geocodeStreetName('VIA DANTE ALIGHIERI', 'Opera')).toMatchObject({ partial: true });
  });

  it('nessun risultato nel comune o ZERO_RESULTS → not_found', async () => {
    fetchMock.mockReturnValueOnce(reply({ status: 'OK', results: [result('Via Roma', 'Rozzano')] }));
    expect(await geocodeStreetName('VIA ROMA', 'Opera')).toEqual({ status: 'not_found' });
    fetchMock.mockReturnValueOnce(reply({ status: 'ZERO_RESULTS', results: [] }));
    expect(await geocodeStreetName('VIA INESISTENTE', 'Opera')).toEqual({ status: 'not_found' });
  });

  it('OVER_QUERY_LIMIT → riprova', async () => {
    vi.useFakeTimers();
    fetchMock
      .mockReturnValueOnce(reply({ status: 'OVER_QUERY_LIMIT', results: [] }))
      .mockReturnValueOnce(reply({ status: 'OK', results: [result('Via Roma', 'Opera')] }));
    const promise = geocodeStreetName('VIA ROMA', 'Opera');
    await vi.runAllTimersAsync();
    expect(await promise).toMatchObject({ status: 'found', route: 'Via Roma' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('chiave mancante o rifiutata → GoogleConfigError', async () => {
    delete process.env.GOOGLE_MAPS_SERVER_KEY;
    await expect(geocodeStreetName('VIA ROMA', 'Opera')).rejects.toBeInstanceOf(GoogleConfigError);
    process.env.GOOGLE_MAPS_SERVER_KEY = 'server-key';
    fetchMock.mockReturnValueOnce(reply({ status: 'REQUEST_DENIED', error_message: 'API keys with referer restrictions…', results: [] }));
    await expect(geocodeStreetName('VIA ROMA', 'Opera')).rejects.toThrow('referer');
  });
});

describe('geocodeStreetNames', () => {
  it('mantiene l\'ordine dell\'input', async () => {
    fetchMock.mockImplementation((url: string) => {
      const street = new URL(url).searchParams.get('address')!.split(',')[0];
      return reply({ status: 'OK', results: [result(street.toLowerCase(), 'Opera')] });
    });
    const out = await geocodeStreetNames(['VIA A', 'VIA B', 'VIA C'], 'Opera', 2);
    expect(out.map((m) => (m.status === 'found' ? m.route : null))).toEqual(['via a', 'via b', 'via c']);
  });
});

describe('numeri in lettere', () => {
  it('romanNumeralVariant converte cardinali e ordinali', () => {
    expect(romanNumeralVariant('VIA VENTICINQUE APRILE')).toBe('VIA XXV APRILE');
    expect(romanNumeralVariant('VIA QUATTRO NOVEMBRE')).toBe('VIA IV NOVEMBRE');
    expect(romanNumeralVariant('VIA PAPA GIOVANNI VENTITREESIMO')).toBe('VIA PAPA GIOVANNI XXIII');
    expect(romanNumeralVariant('VIA ROMA')).toBeNull();
  });

  it('se la prima ricerca non trova la via, riprova con i numeri romani', async () => {
    fetchMock
      .mockReturnValueOnce(reply({ status: 'ZERO_RESULTS', results: [] }))
      .mockReturnValueOnce(reply({ status: 'OK', results: [result('Via XXV Aprile', 'Opera')] }));
    expect(await geocodeStreetName('VIA VENTICINQUE APRILE', 'Opera')).toMatchObject({ status: 'found', route: 'Via XXV Aprile' });
    expect(new URL(fetchMock.mock.calls[1][0]).searchParams.get('address')).toBe('VIA XXV APRILE, Opera, Italia');
  });
});
