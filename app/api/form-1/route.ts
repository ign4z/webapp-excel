import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';
import { getValuationConfig, getPricePerSqm } from '@/lib/config';
import { sendForm1Email } from '@/lib/email';

/* ==========================
   SCHEMA
========================== */
const formSchema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(10),
  city: z.string().min(1),
  address: z.string().min(5),
  squareMeters: z.number().min(10),
  recaptchaToken: z.string(),
});

/* ==========================
   CONFIG
========================== */
const ALLOWED_CITIES = [
  'Milano',
  'Monza',
  'Sesto San Giovanni',
  'Cinisello Balsamo',
  'Locate di Triulzi',
];

/* ==========================
   ROUTE
========================== */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = formSchema.parse(body);

    /* ─── reCAPTCHA ─── */
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
        return NextResponse.json(
          { error: 'Verifica reCAPTCHA fallita' },
          { status: 400 }
        );
      }
    }

    /* ─── City whitelist (fast check prima del geocoding) ─── */
    const cityAllowed = ALLOWED_CITIES.some(
      (c) => c.toLowerCase() === validated.city.toLowerCase()
    );

    if (!cityAllowed) {
      return NextResponse.json(
        {
          error:
            'Servizio disponibile solo nei comuni di Milano, Monza, Sesto San Giovanni, Cinisello Balsamo e Locate di Triulzi.',
        },
        { status: 400 }
      );
    }

    /* ─── Business logic ─── */
    const config = await getValuationConfig();
    const pricePerSqm = getPricePerSqm(config, validated.city);
    const estimatedValue = validated.squareMeters * pricePerSqm;

    const result = {
      city: validated.city,
      pricePerSqm,
      estimatedValue,
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
    }).catch((err) => console.error('Email Form 1 failed:', err));

    return NextResponse.json({ result, sessionToken });
  } catch (error: any) {
    console.error('Error in /api/form-1:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dati non validi', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: 'Errore del server' }, { status: 500 });
  }
}