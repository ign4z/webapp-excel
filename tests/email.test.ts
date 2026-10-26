import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const resend = vi.hoisted(() => ({ send: vi.fn(async () => ({ data: { id: 'email-1' }, error: null })) }));
vi.mock('resend', () => ({
  Resend: class { emails = { send: resend.send }; },
}));
vi.mock('@/lib/settings', () => ({ getNotificationEmails: vi.fn(async () => ['agente@agenzia.it']) }));

const { sendAdminNotification, sendForm2Email } = await import('@/lib/email');
const { getNotificationEmails } = await import('@/lib/settings');

const cliente = {
  firstName: 'Mario', lastName: 'Rossi', email: 'mario@example.com', phone: '3331234567',
  city: 'Opera', address: 'Via Roma, 15', squareMeters: 100, finalValue: 250000,
};

type SentEmail = { to: string | string[]; subject: string; html: string; attachments?: unknown };
const sent = (): SentEmail => (resend.send.mock.calls[0] as unknown as [SentEmail])[0];

beforeEach(() => {
  vi.stubEnv('RESEND_API_KEY', 're_test');
  resend.send.mockClear();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('sendAdminNotification', () => {
  it('invia ai destinatari delle impostazioni, senza allegati', async () => {
    await sendAdminNotification(cliente);
    expect(sent().to).toEqual(['agente@agenzia.it']);
    expect(sent().attachments).toBeUndefined();
  });

  it('oggetto su una riga anche se i dati del cliente contengono a-capo', async () => {
    await sendAdminNotification({ ...cliente, firstName: 'Mario\r\nBcc: x@evil.test', lastName: 'Rossi\t' });
    expect(sent().subject).not.toMatch(/[\r\n\t]/);
    expect(sent().subject).toBe('Nuova valutazione: Mario Bcc: x@evil.test Rossi — Opera');
  });

  it('nessun invio se non ci sono destinatari', async () => {
    vi.mocked(getNotificationEmails).mockResolvedValueOnce([]);
    await sendAdminNotification(cliente);
    expect(resend.send).not.toHaveBeenCalled();
  });
});

describe('sendForm2Email', () => {
  it('nessun report allegato al cliente', async () => {
    await sendForm2Email(cliente);
    expect(sent().to).toBe('mario@example.com');
    expect(sent().attachments).toBeUndefined();
    expect(sent().html).toContain('/privacy');
  });
});
