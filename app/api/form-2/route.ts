import { NextRequest, NextResponse, after } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';
import { getValuationConfig, getCoefficienti } from '@/lib/config';
import { getPriceForStreet } from '@/lib/streets';
import { isAllowedCity } from '@/lib/cities';
import { form1Schema, form2Schema } from '@/lib/schema';
import { verifyCaptcha } from '@/lib/captcha';
import { rateLimit, clientIp } from '@/lib/rate-limit';
import { verifySessionToken } from '@/lib/session-token';
import { computeValuation } from '@/lib/valuation';
import { buildValuationReport } from '@/lib/excel/valuation-report';
import { saveReport } from '@/lib/reports-storage';
import { sendForm2Email, sendAdminNotification } from '@/lib/email';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/form-2');

// Il prezzo €/mq NON viene accettato dal client: è ricalcolato qui a partire da form1Data,
// la cui integrità è garantita dal sessionToken firmato emesso da form-1.
const requestSchema = form2Schema.extend({
  sessionToken: z.string().max(1000),
  form1Data: form1Schema,
  captchaToken: z.string().max(2048),
});

export async function POST(req: NextRequest) {
  // 10 richieste ogni 10 minuti per IP (contano anche i tentativi falliti)
  const rl = await rateLimit('form-2', clientIp(req), 10, 600);
  if (!rl.allowed) {
    log.warn('Form-2 rate limited');
    return NextResponse.json(
      { error: 'Troppe richieste. Riprova tra qualche minuto.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    );
  }

  try {
    const body = await req.json();
    const { sessionToken, form1Data, captchaToken, ...form2Data } = requestSchema.parse(body);

    log.info('Form2 POST received', { city: form1Data.city, sqm: form1Data.squareMeters });

    if (!verifySessionToken(sessionToken, form1Data)) {
      log.warn('Form2 invalid or expired session token');
      return NextResponse.json({ error: 'Sessione non valida o scaduta. Ricompila il primo step.' }, { status: 400 });
    }

    if (!(await verifyCaptcha(captchaToken))) {
      log.warn('Form2 captcha failed');
      return NextResponse.json({ error: 'Verifica anti-bot fallita' }, { status: 400 });
    }

    if (!isAllowedCity(form1Data.city)) {
      return NextResponse.json({ error: 'Comune non supportato' }, { status: 400 });
    }

    /* ─── Calcolo (tutto lato server) ─── */
    const [pricePerSqm, config] = await Promise.all([
      getPriceForStreet(form1Data.address, form1Data.city),
      getValuationConfig(),
    ]);
    const valuation = computeValuation({ ...form1Data, ...form2Data }, pricePerSqm, getCoefficienti(config));

    log.info('Form2 calculation complete', {
      baseValue: valuation.baseValue,
      finalValue: valuation.finalValue,
      coeffTotale: valuation.coeffTotale,
    });

    /* ─── Excel ─── */
    const excel = await buildValuationReport(form1Data, form2Data, valuation);
    // Store privato; UUID per unicità, cognome sanificato per riconoscere il file nella lista admin
    const safeLastName = form1Data.lastName.normalize('NFD').replace(/[^a-zA-Z0-9]/g, '').slice(0, 30).toLowerCase() || 'cliente';
    const filename = `${new Date().toISOString().slice(0, 10)}_${safeLastName}_${crypto.randomUUID()}.xlsx`;
    await saveReport(filename, excel);
    log.info('Excel saved to blob', { filename });

    /* ─── Email dopo la risposta (after() mantiene viva la funzione serverless fino al completamento) ─── */
    // Report solo su Blob (pannello admin): niente allegati nelle email
    after(async () => {
      await Promise.all([
        sendForm2Email({ ...form1Data, finalValue: valuation.finalValue }),
        sendAdminNotification({ ...form1Data, finalValue: valuation.finalValue }),
      ]);
    });

    // Al cliente solo il valore finale: base e coefficienti restano nel report admin
    return NextResponse.json({ finalValuation: { finalValue: valuation.finalValue } });

  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      log.warn('Form2 validation error', error.issues);
      return NextResponse.json({ error: 'Dati non validi', details: error.issues }, { status: 400 });
    }
    log.error('Form2 POST error', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Errore del server' }, { status: 500 });
  }
}
