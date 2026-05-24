import { Resend } from 'resend';

// Lazy initialization - crea l'istanza solo quando serve
function getResendClient() {
  if (!process.env.RESEND_API_KEY) {
    console.warn('⚠️ RESEND_API_KEY non configurato');
    return null;
  }
  return new Resend(process.env.RESEND_API_KEY);
}

/**
 * Invia email dopo Form 1 con la stima preliminare
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

    const { data, error } = await resend.emails.send({
      from: 'Valutazione Immobiliare <onboarding@resend.dev>',
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
              <h1>Ciao ${params.firstName},</h1>
              <p>Ecco la tua stima immobiliare preliminare</p>
            </div>
            <div class="content">
              <p>Abbiamo calcolato una stima di base per il tuo immobile in base alla superficie e alla zona.</p>

              <div class="estimate-box">
                <table>
                  <tr><td>Comune</td><td>${params.city}</td></tr>
                  <tr><td>Indirizzo</td><td>${params.address}</td></tr>
                  <tr><td>Superficie</td><td>${params.squareMeters} mq</td></tr>
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
      console.error('❌ Errore invio email Form 1:', error);
      return { success: false, error };
    }

    console.log('✅ Email Form 1 inviata:', data);
    return { success: true, data };

  } catch (error) {
    console.error('❌ Errore catch email Form 1:', error);
    return { success: false, error };
  }
}

/**
 * Invia email dopo Form 2 (conferma ordine)
 */
export async function sendForm2Email(
  email: string,
  name: string,
  company: string,
  excelUrl: string
) {
  try {
    const resend = getResendClient();
    if (!resend) {
      return { success: false, error: 'Resend non configurato' };
    }

    const { data, error } = await resend.emails.send({
      from: 'WebApp <noreply@tuodominio.com>',
      to: email,
      subject: '✅ Ordine Confermato - Riepilogo Allegato',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #28a745; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .success-icon { font-size: 64px; margin: 20px 0; }
            .button { display: inline-block; background: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="success-icon">✅</div>
              <h1>Ordine Confermato!</h1>
            </div>
            <div class="content">
              <p>Ciao <strong>${name}</strong>,</p>
              
              <p>Il tuo ordine per <strong>${company}</strong> è stato registrato con successo.</p>

              <p>Puoi scaricare il riepilogo completo in formato Excel cliccando qui:</p>
              
              <a href="${excelUrl}" class="button" download>
                📥 Scarica Riepilogo Excel
              </a>

              <p style="margin-top: 30px;">
                Ti contatteremo presto per confermare i dettagli.
              </p>

              <p style="margin-top: 30px; font-size: 12px; color: #666;">
                Hai domande? Rispondi a questa email o contattaci su support@tuodominio.com
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error('❌ Errore invio email Form 2:', error);
      return { success: false, error };
    }

    console.log('✅ Email Form 2 inviata:', data);
    return { success: true, data };
    
  } catch (error) {
    console.error('❌ Errore catch email Form 2:', error);
    return { success: false, error };
  }
}

/**
 * Invia email di notifica all'admin
 */
export async function sendAdminNotification(
  userEmail: string,
  userName: string,
  company: string
) {
  try {
    const resend = getResendClient();
    if (!resend) {
      console.warn('⚠️ Notifica admin saltata: Resend non configurato');
      return;
    }

    await resend.emails.send({
      from: 'WebApp <noreply@tuodominio.com>',
      to: process.env.ADMIN_EMAIL || 'admin@tuodominio.com',
      subject: `🆕 Nuovo ordine da ${userName}`,
      html: `
        <h2>Nuovo ordine ricevuto</h2>
        <ul>
          <li><strong>Cliente:</strong> ${userName}</li>
          <li><strong>Email:</strong> ${userEmail}</li>
          <li><strong>Azienda:</strong> ${company}</li>
          <li><strong>Data:</strong> ${new Date().toLocaleString('it-IT')}</li>
        </ul>
      `,
    });
    
    console.log('✅ Notifica admin inviata');
  } catch (error) {
    console.error('❌ Errore notifica admin:', error);
  }
}
