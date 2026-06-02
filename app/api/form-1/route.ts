import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';
import { getPriceForStreet } from '@/lib/streets';
import { sendForm1Email } from '@/lib/email';
import { ALLOWED_CITIES } from '@/lib/cities';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/form-1');

// Schema di validazione — i vincoli minimi (min(2), min(10)…) rispecchiano quelli del form client
// in modo che un attaccante che bypassa il client riceva comunque un 400 coerente
const formSchema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(10),
  city: z.string().min(1),
  address: z.string().min(5),
  squareMeters: z.number().min(10),
  tipologia: z.enum(['appartamento', 'openspaceLoft', 'mansarda', 'attico', 'villettaSchiera', 'villa', 'rusticoCasale', 'stabilePalazzo']),
  piano: z.enum(['interrato', 'seminterrato', 'pianoTerra', 'rialzato', 'piano1', 'piano2', 'piano3', 'piano4', 'piano5', 'piano6', 'piano7', 'piano8', 'piano9', 'piano10Plus']),
  locali: z.enum(['locale1', 'locali2', 'locali3', 'locali4', 'locali5', 'locali6', 'locali7Plus']),
  bagni: z.enum(['bagno1', 'bagni2', 'bagni3', 'bagni4', 'bagni5Plus']),
  recaptchaToken: z.string(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = formSchema.parse(body);

    log.info('Form1 POST received', { city: validated.city, sqm: validated.squareMeters });

    if (process.env.RECAPTCHA_SECRET_KEY) {
      const recaptchaResponse = await fetch(
        'https://www.google.com/recaptcha/api/siteverify',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${validated.recaptchaToken}`,
        }
      );
      const recaptchaData = await recaptchaResponse.json();
      if (!recaptchaData.success) {
        log.warn('Form1 reCAPTCHA failed');
        return NextResponse.json({ error: 'Verifica reCAPTCHA fallita' }, { status: 400 });
      }
      log.debug('Form1 reCAPTCHA passed');
    }

    const cityAllowed = ALLOWED_CITIES.some(
      (c) => c.toLowerCase() === validated.city.toLowerCase()
    );
    if (!cityAllowed) {
      log.warn('Form1 city not in whitelist', { city: validated.city });
      return NextResponse.json(
        { error: `Servizio disponibile solo nei comuni di ${ALLOWED_CITIES.join(', ')}.` },
        { status: 400 }
      );
    }

    const pricePerSqm = await getPriceForStreet(validated.address, validated.city);
    const estimatedValue = validated.squareMeters * pricePerSqm;

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

    const sessionToken = crypto.randomBytes(32).toString('hex');

    sendForm1Email({
      email: validated.email,
      firstName: validated.firstName,
      lastName: validated.lastName,
      city: validated.city,
      address: validated.address,
      squareMeters: validated.squareMeters,
      pricePerSqm,
      estimatedValue,
    }).catch((err) => log.error('Form1 email fire-and-forget failed', err instanceof Error ? err.message : err));

    log.debug('Form1 response sent', { sessionToken: sessionToken.slice(0, 8) + '…' });
    return NextResponse.json({ result, sessionToken });
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
