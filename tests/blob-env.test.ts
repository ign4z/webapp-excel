import { describe, it, expect, afterEach, vi } from 'vitest';
import { blobStoreId, assertBlobWritable } from '@/lib/blob-env';

const PROD_TOKEN = 'vercel_blob_rw_Prod123abc_segretoProduzione';
const DEV_TOKEN = 'vercel_blob_rw_Dev456def_segretoSviluppo';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('blobStoreId', () => {
  it('estrae lo store id dal token', () => {
    expect(blobStoreId(PROD_TOKEN)).toBe('Prod123abc');
    expect(blobStoreId(DEV_TOKEN)).toBe('Dev456def');
  });

  it('null se il token manca o ha un formato diverso', () => {
    expect(blobStoreId(undefined)).toBeNull();
    expect(blobStoreId('')).toBeNull();
    expect(blobStoreId('token-a-caso')).toBeNull();
  });
});

describe('assertBlobWritable', () => {
  it('blocca in locale se il token è dello store di produzione', () => {
    vi.stubEnv('VERCEL_ENV', '');
    vi.stubEnv('BLOB_PRODUCTION_STORE_ID', 'prod123ABC');
    vi.stubEnv('BLOB_READ_WRITE_TOKEN', PROD_TOKEN);
    expect(() => assertBlobWritable('write config')).toThrow(/store di produzione/);
  });

  it("accetta anche l'id nel formato store_<id> mostrato da Vercel", () => {
    vi.stubEnv('VERCEL_ENV', 'preview');
    vi.stubEnv('BLOB_PRODUCTION_STORE_ID', 'store_Prod123abc');
    vi.stubEnv('BLOB_READ_WRITE_TOKEN', PROD_TOKEN);
    expect(() => assertBlobWritable('save report')).toThrow();
  });

  it('lascia passare il token dello store di sviluppo', () => {
    vi.stubEnv('VERCEL_ENV', '');
    vi.stubEnv('BLOB_PRODUCTION_STORE_ID', 'Prod123abc');
    vi.stubEnv('BLOB_READ_WRITE_TOKEN', DEV_TOKEN);
    expect(() => assertBlobWritable('write config')).not.toThrow();
  });

  it('non fa nulla senza BLOB_PRODUCTION_STORE_ID', () => {
    vi.stubEnv('VERCEL_ENV', '');
    vi.stubEnv('BLOB_PRODUCTION_STORE_ID', '');
    vi.stubEnv('BLOB_READ_WRITE_TOKEN', PROD_TOKEN);
    expect(() => assertBlobWritable('write config')).not.toThrow();
  });

  it('non fa nulla in produzione', () => {
    vi.stubEnv('VERCEL_ENV', 'production');
    vi.stubEnv('BLOB_PRODUCTION_STORE_ID', 'Prod123abc');
    vi.stubEnv('BLOB_READ_WRITE_TOKEN', PROD_TOKEN);
    expect(() => assertBlobWritable('write config')).not.toThrow();
  });
});
