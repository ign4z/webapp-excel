import { describe, it, expect, afterEach, vi } from 'vitest';
import { verifyCaptcha } from '@/lib/captcha';

function mockSiteverify(body: unknown) {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify(body)));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('verifyCaptcha (Turnstile)', () => {
  it('accetta un token valido e lo invia a Cloudflare con il secret', async () => {
    vi.stubEnv('TURNSTILE_SECRET_KEY', 'segreto');
    const fetchMock = mockSiteverify({ success: true });

    expect(await verifyCaptcha('tok')).toBe(true);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://challenges.cloudflare.com/turnstile/v0/siteverify');
    const params = init.body as URLSearchParams;
    expect(params.get('secret')).toBe('segreto');
    expect(params.get('response')).toBe('tok');
  });

  it('rifiuta un token che Cloudflare non conferma', async () => {
    vi.stubEnv('TURNSTILE_SECRET_KEY', 'segreto');
    mockSiteverify({ success: false, 'error-codes': ['invalid-input-response'] });
    expect(await verifyCaptcha('tok')).toBe(false);
  });

  it('rifiuta un token vuoto senza chiamare Cloudflare', async () => {
    vi.stubEnv('TURNSTILE_SECRET_KEY', 'segreto');
    const fetchMock = mockSiteverify({ success: true });
    expect(await verifyCaptcha('')).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rifiuta se la chiamata a Cloudflare fallisce', async () => {
    vi.stubEnv('TURNSTILE_SECRET_KEY', 'segreto');
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('rete giù'); }));
    expect(await verifyCaptcha('tok')).toBe(false);
  });

  it('senza secret: fail-closed in produzione, saltato in sviluppo', async () => {
    vi.stubEnv('TURNSTILE_SECRET_KEY', '');
    vi.stubEnv('NODE_ENV', 'production');
    expect(await verifyCaptcha('tok')).toBe(false);
    vi.stubEnv('NODE_ENV', 'development');
    expect(await verifyCaptcha('tok')).toBe(true);
  });
});
