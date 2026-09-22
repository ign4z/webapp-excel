import { Resend } from 'resend';
import { createLogger } from '@/lib/logger';

const log = createLogger('lib/email');

const EMAIL_FROM = process.env.EMAIL_FROM || 'Valutazione Immobiliare <onboarding@resend.dev>';

function getResendClient() {
  if (!process.env.RESEND_API_KEY) {
    log.warn('RESEND_API_KEY non configurato');
    return null;
  }
  return new Resend(process.env.RESEND_API_KEY);
}

/** Escape dei dati inseriti dall'utente prima di interpolarli nell'HTML delle email. */
function esc(value: string | number): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const eur = (n: number) => `€${n.toLocaleString('it-IT')}`;

type Attachment = { filename: string; content: Buffer };

/**
 * Invia email dopo Form 1 con la stima preliminare. Richiede RESEND_API_KEY; se assente, restituisce errore senza eccezione.
 */
export async function sendForm1Email(params: {
  email: string;
  firstName: string;
  lastName: string;
  city: string;
  address: string;
  squareMeters: number;
  pricePerSqm: number;
  estimatedValue: number;
}) {
  try {
    const resend = getResendClient();
    if (!resend) {
      return { success: false, error: 'Resend non configurato' };
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    log.info('Sending Form1 email', { to: params.email });
    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: params.email,
      subject: 'La tua stima immobiliare preliminare',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #1E2230; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #1E2230; color: white; padding: 28px 32px; border-radius: 8px 8px 0 0; }
            .header h1 { margin: 0 0 4px; font-size: 22px; font-weight: 600; }
            .header p { margin: 0; color: #A0A8BC; font-size: 14px; }
            .content { background: #FAFAF8; padding: 32px; border-radius: 0 0 8px 8px; border: 1px solid #EDE8DF; border-top: none; }
            .estimate-box { background: white; border: 1px solid #EDE8DF; border-radius: 8px; padding: 24px; margin: 24px 0; }
            .estimate-box table { width: 100%; border-collapse: collapse; }
            .estimate-box td { padding: 8px 0; font-size: 14px; border-bottom: 1px solid #F3EFE8; }
            .estimate-box td:last-child { text-align: right; font-weight: 500; }
            .estimate-box tr:last-child td { border-bottom: none; }
            .final-value { font-size: 28px; font-weight: 700; color: #9A7535; margin: 20px 0 4px; }
            .label { font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: #9CA3AF; margin-bottom: 4px; }
            .button { display: inline-block; background: #C9A84C; color: #1E2230; padding: 13px 32px; text-decoration: none; border-radius: 6px; font-weight: 700; font-size: 13px; margin-top: 8px; }
            .footer { font-size: 12px; color: #9CA3AF; margin-top: 28px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Ciao ${esc(params.firstName)},</h1>
              <p>Ecco la tua stima immobiliare preliminare</p>
            </div>
            <div class="content">
              <p>Abbiamo calcolato una stima di base per il tuo immobile in base alla superficie e alla zona.</p>

              <div class="estimate-box">
                <table>
                  <tr><td>Comune</td><td>${esc(params.city)}</td></tr>
                  <tr><td>Indirizzo</td><td>${esc(params.address)}</td></tr>
                  <tr><td>Superficie</td><td>${esc(params.squareMeters)} mq</td></tr>
                  <tr><td>Prezzo al mq</td><td>€${params.pricePerSqm.toLocaleString('it-IT')}</td></tr>
                </table>
                <div style="border-top: 1px solid #EDE8DF; margin-top: 16px; padding-top: 16px;">
                  <p class="label">Stima base</p>
                  <p class="final-value">€${params.estimatedValue.toLocaleString('it-IT')}</p>
                </div>
              </div>

              <p>Questa è solo una stima preliminare. Per affinare il risultato con le caratteristiche specifiche dell'immobile, completa il secondo step:</p>
              <a href="${baseUrl}/step-2" class="button">Affina la valutazione →</a>

              <p class="footer">Questa email è stata inviata automaticamente. Non rispondere a questo messaggio.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      log.error('Form1 email failed', error);
      return { success: false, error };
    }

    log.info('Form1 email sent', { id: data?.id });
    return { success: true, data };

  } catch (error) {
    log.error('Form1 email exception', error instanceof Error ? error.message : error);
    return { success: false, error };
  }
}

/**
 * Invia al cliente la valutazione definitiva (Step 2) con il report Excel allegato. Non lancia eccezioni.
 */
export async function sendForm2Email(params: {
  email: string;
  firstName: string;
  city: string;
  address: string;
  squareMeters: number;
  finalValue: number;
  attachment: Attachment;
}) {
  try {
    const resend = getResendClient();
    if (!resend) return { success: false, error: 'Resend non configurato' };

    log.info('Sending Form2 email', { to: params.email });
    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: params.email,
      subject: 'La tua valutazione immobiliare definitiva',
      attachments: [params.attachment],
      html: `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"></head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #1E2230; margin: 0; padding: 0;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #1E2230; color: white; padding: 28px 32px; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0 0 4px; font-size: 22px;">Ciao ${esc(params.firstName)},</h1>
              <p style="margin: 0; color: #A0A8BC; font-size: 14px;">Ecco la valutazione definitiva del tuo immobile</p>
            </div>
            <div style="background: #FAFAF8; padding: 32px; border-radius: 0 0 8px 8px; border: 1px solid #EDE8DF; border-top: none;">
              <p>${esc(params.address)} — ${esc(params.city)} — ${esc(params.squareMeters)} mq</p>
              <p style="font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: #9CA3AF; margin-bottom: 4px;">Valore stimato</p>
              <p style="font-size: 28px; font-weight: 700; color: #9A7535; margin: 0 0 20px;">${eur(params.finalValue)}</p>
              <p>In allegato trovi il report Excel con il dettaglio di tutti i coefficienti applicati.</p>
              <p style="font-size: 12px; color: #9CA3AF; margin-top: 28px;">Questa email è stata inviata automaticamente. Non rispondere a questo messaggio.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      log.error('Form2 email failed', error);
      return { success: false, error };
    }

    log.info('Form2 email sent', { id: data?.id });
    return { success: true, data };
  } catch (error) {
    log.error('Form2 email exception', error instanceof Error ? error.message : error);
    return { success: false, error };
  }
}

/**
 * Notifica l'admin di una nuova valutazione definitiva, con report allegato. Non lancia eccezioni.
 * Destinatario letto da ADMIN_EMAIL; se assente la notifica viene saltata.
 */
export async function sendAdminNotification(params: {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
  address: string;
  squareMeters: number;
  finalValue: number;
  attachment: Attachment;
}) {
  try {
    const resend = getResendClient();
    const to = process.env.ADMIN_EMAIL;
    if (!resend || !to) {
      log.warn('Notifica admin saltata: Resend o ADMIN_EMAIL non configurati');
      return;
    }

    log.info('Sending admin notification');
    const { error } = await resend.emails.send({
      from: EMAIL_FROM,
      to,
      replyTo: params.email,
      subject: `Nuova valutazione: ${params.firstName} ${params.lastName} — ${params.city}`,
      attachments: [params.attachment],
      html: `
        <h2>Nuova valutazione definitiva</h2>
        <ul>
          <li><strong>Cliente:</strong> ${esc(params.firstName)} ${esc(params.lastName)}</li>
          <li><strong>Email:</strong> ${esc(params.email)}</li>
          <li><strong>Telefono:</strong> ${esc(params.phone)}</li>
          <li><strong>Immobile:</strong> ${esc(params.address)}, ${esc(params.city)} (${esc(params.squareMeters)} mq)</li>
          <li><strong>Valore stimato:</strong> ${eur(params.finalValue)}</li>
          <li><strong>Data:</strong> ${new Date().toLocaleString('it-IT', { timeZone: 'Europe/Rome' })}</li>
        </ul>
        <p>Report Excel in allegato (disponibile anche nel pannello admin).</p>
      `,
    });

    if (error) {
      log.error('Admin notification failed', error);
      return;
    }
    log.info('Admin notification sent');
  } catch (error) {
    log.error('Admin notification failed', error instanceof Error ? error.message : error);
  }
}
