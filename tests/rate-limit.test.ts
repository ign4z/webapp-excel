import { describe, it, expect, beforeEach } from 'vitest';
import { rateLimit } from '@/lib/rate-limit';
import { isReportUrl } from '@/lib/reports-storage';

beforeEach(() => {
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
});

describe('rateLimit (in memoria)', () => {
  it('blocca oltre il limite e riapre dopo la finestra', async () => {
    const t0 = 1_000_000;
    for (let i = 0; i < 3; i++) {
      expect((await rateLimit('t1', 'ip', 3, 60, t0)).allowed).toBe(true);
    }
    const blocked = await rateLimit('t1', 'ip', 3, 60, t0 + 1000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfter).toBe(59);
    expect((await rateLimit('t1', 'ip', 3, 60, t0 + 61_000)).allowed).toBe(true);
  });

  it('contatori separati per IP e per nome', async () => {
    const t0 = 2_000_000;
    expect((await rateLimit('t2', 'a', 1, 60, t0)).allowed).toBe(true);
    expect((await rateLimit('t2', 'a', 1, 60, t0)).allowed).toBe(false);
    expect((await rateLimit('t2', 'b', 1, 60, t0)).allowed).toBe(true);
    expect((await rateLimit('t3', 'a', 1, 60, t0)).allowed).toBe(true);
  });
});

describe('isReportUrl', () => {
  it('accetta solo .xlsx su Vercel Blob in https', () => {
    expect(isReportUrl('https://abc.public.blob.vercel-storage.com/valutazioni/x.xlsx')).toBe(true);
    expect(isReportUrl('https://abc.private.blob.vercel-storage.com/valutazioni/x.xlsx')).toBe(true);
    expect(isReportUrl('https://abc.public.blob.vercel-storage.com/config/valuation-parameters.json')).toBe(false);
    expect(isReportUrl('https://evil.example.com/x.xlsx')).toBe(false);
    expect(isReportUrl('https://blob.vercel-storage.com.evil.com/x.xlsx')).toBe(false);
    expect(isReportUrl('http://abc.public.blob.vercel-storage.com/x.xlsx')).toBe(false);
    expect(isReportUrl('non-un-url')).toBe(false);
  });
});
