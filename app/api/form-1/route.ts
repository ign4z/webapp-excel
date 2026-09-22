import { NextRequest, NextResponse, after } from 'next/server';
import { z } from 'zod';
import { getPriceForStreet } from '@/lib/streets';
import { sendForm1Email } from '@/lib/email';
import { isAllowedCity, ALLOWED_CITIES } from '@/lib/cities';
import { form1Schema } from '@/lib/schema';
import { verifyRecaptcha } from '@/lib/recaptcha';
import { rateLimit, clientIp } from '@/lib/rate-limit';
import { createSessionToken } from '@/lib/session-token';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/form-1');

// Stesso schema del form client (lib/schema.ts): un attaccante che bypassa il client riceve comunque un 400 coerente
const requestSchema = form1Schema.extend({ recaptchaToken: z.string() });

export async function POST(req: NextRequest) {
  // 10 richieste ogni 10 minuti per IP (contano anche i tentativi falliti)
  const rl = await rateLimit('form-1', clientIp(req), 10, 600);
  if (!rl.allowed) {
    log.warn('Form-1 rate limited');
    return NextResponse.json(
      { error: 'Troppe richieste. Riprova tra qualche minuto.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    );
  }

  try {
    const body = await req.json();
    const { recaptchaToken, ...validated } = requestSchema.parse(body);

    log.info('Form1 POST received', { city: validated.city, sqm: validated.squareMeters });

    if (!(await verifyRecaptcha(recaptchaToken))) {
      log.warn('Form1 reCAPTCHA failed');
      return NextResponse.json({ error: 'Verifica reCAPTCHA fallita' }, { status: 400 });
    }

    if (!isAllowedCity(validated.city)) {
      log.warn('Form1 city not in whitelist', { city: validated.city });
      return NextResponse.json(
        { error: `Servizio disponibile solo nei comuni di ${ALLOWED_CITIES.join(', ')}.` },
        { status: 400 }
      );
    }

    const pricePerSqm = await getPriceForStreet(validated.address, validated.city);
    const estimatedValue = Math.round(validated.squareMeters * pricePerSqm);

    log.info('Form1 calculation', { pricePerSqm, estimatedValue });

    const result = {
      city: validated.city,
      pricePerSqm,
      estimatedValue,
      tipologia: validated.tipologia,
      piano: validated.piano,
      locali: validated.locali,
      bagni: validated.bagni,
      message: 'Valutazione preliminare calcolata',
    };

    const sessionToken = createSessionToken(validated);

    // after() mantiene viva la funzione serverless fino all'invio (una promise non attesa può essere interrotta)
    after(() => sendForm1Email({
      email: validated.email,
      firstName: validated.firstName,
      lastName: validated.lastName,
      city: validated.city,
      address: validated.address,
      squareMeters: validated.squareMeters,
      pricePerSqm,
      estimatedValue,
    }));

    // form1Data normalizzato (trim ecc.) restituito al client: è quello su cui è calcolato l'hash del token
    return NextResponse.json({ result, sessionToken, form1Data: validated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      log.warn('Form1 validation error', error.issues);
      return NextResponse.json(
        { error: 'Dati non validi', details: error.issues },
        { status: 400 }
      );
    }
    log.error('Form1 POST error', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Errore del server' }, { status: 500 });
  }
}
