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
 * Invia email dopo Form 1 (con risultato calcolo)
 */
export async function sendForm1Email(
  email: string,
  name: string,
  result: {
    basePrice: number;
    finalPrice: number;
    discount: number;
    message: string;
  }
) {
  try {
    const resend = getResendClient();
    if (!resend) {
      return { success: false, error: 'Resend non configurato' };
    }

    const { data, error } = await resend.emails.send({
      from: 'WebApp <onboarding@resend.dev>',
      to: email,
      subject: 'Il tuo preventivo è pronto!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #0070C0; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .result-box { background: white; padding: 20px; margin: 20px 0; border-left: 4px solid #0070C0; }
            .price { font-size: 32px; font-weight: bold; color: #0070C0; margin: 10px 0; }
            .discount { color: #28a745; font-weight: bold; }
            .button { display: inline-block; background: #0070C0; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Ciao ${name}!</h1>
            </div>
            <div class="content">
              <p>Grazie per aver richiesto un preventivo. Ecco i dettagli:</p>
              
              <div class="result-box">
                <h2>Riepilogo Prezzi</h2>
                <p><strong>Prezzo Base:</strong> €${result.basePrice.toFixed(2)}</p>
                ${result.discount > 0 ? `<p class="discount"><strong>Sconto Applicato:</strong> -€${result.discount.toFixed(2)}</p>` : ''}
                <p class="price">€${result.finalPrice.toFixed(2)}</p>
                <p style="margin-top: 15px; padding: 10px; background: #e8f4f8; border-radius: 5px;">
                  ℹ️ ${result.message}
                </p>
              </div>

              <p>Per completare la richiesta, clicca sul pulsante qui sotto:</p>
              <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/step-2" class="button">
                Completa la Richiesta →
              </a>

              <p style="margin-top: 30px; font-size: 12px; color: #666;">
                Questa email è stata inviata automaticamente. Non rispondere a questo messaggio.
              </p>
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
