import { describe, it, expect } from 'vitest';
import { TITOLARE, hasLegalPlaceholders } from '@/lib/legal';

describe('dati legali (lib/legal.ts)', () => {
  it('i campi obbligatori del titolare non sono vuoti', () => {
    expect(TITOLARE.ragioneSociale.trim()).not.toBe('');
    expect(TITOLARE.partitaIva.trim()).not.toBe('');
    expect(TITOLARE.sede.trim()).not.toBe('');
    expect(TITOLARE.emailPrivacy.trim()).not.toBe('');
  });

  // In sviluppo i segnaposto sono ammessi; al rilascio (CI_RELEASE=1, vedi /release) no.
  it.runIf(process.env.CI_RELEASE === '1')('nessun segnaposto rimasto al rilascio', () => {
    expect(hasLegalPlaceholders()).toBe(false);
  });
});
