// app/api/form-1/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getConfigParams, calculatePrice, generateSessionToken } from '@/lib/calculations';
import { sendForm1Email } from '@/lib/email';
import { Form1Data } from '@/types';

/**
 * POST /api/form-1
 * 
 * Flusso:
 * 1. Verifica reCAPTCHA
 * 2. Carica config parametri
 * 3. Calcola prezzo
 * 4. Invia email
 * 5. Genera session token
 * 6. Ritorna risultato
 */
export async function POST(request: NextRequest) {
  try {
    const body: Form1Data = await request.json();

    // === 1. VALIDAZIONE INPUT ===
    if (!body.name || !body.email || !body.phone || !body.quantity) {
      return NextResponse.json(
        { success: false, error: 'Campi obbligatori mancanti' },
        { status: 400 }
      );
    }

    if (body.quantity <= 0) {
      return NextResponse.json(
        { success: false, error: 'La quantità deve essere maggiore di 0' },
        { status: 400 }
      );
    }

    // === 2. VERIFICA reCAPTCHA ===
    if (!body.recaptchaToken) {
      return NextResponse.json(
        { success: false, error: 'reCAPTCHA mancante' },
        { status: 400 }
      );
    }

    const recaptchaResponse = await fetch(
      'https://www.google.com/recaptcha/api/siteverify',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${body.recaptchaToken}`,
      }
    );

    const recaptchaData = await recaptchaResponse.json();

    if (!recaptchaData.success || recaptchaData.score < 0.5) {
      console.error('❌ reCAPTCHA fallito:', recaptchaData);
      return NextResponse.json(
        { success: false, error: 'Verifica reCAPTCHA fallita' },
        { status: 400 }
      );
    }

    console.log('✅ reCAPTCHA verificato, score:', recaptchaData.score);

    // === 3. CARICA CONFIG E CALCOLA ===
    const config = await getConfigParams();
    const result = calculatePrice(body.quantity, config);

    console.log('📊 Calcolo:', {
      quantity: body.quantity,
      config,
      result,
    });

    // === 4. INVIA EMAIL ===
    const emailResult = await sendForm1Email(
      body.email,
      body.name,
      result
    );

    if (!emailResult.success) {
      console.error('⚠️ Email non inviata, ma continuo:', emailResult.error);
      // Non blocchiamo l'utente se l'email fallisce
    }

    // === 5. GENERA SESSION TOKEN ===
    const sessionToken = generateSessionToken();

    // === 6. RITORNA RISULTATO ===
    return NextResponse.json({
      success: true,
      result: {
        basePrice: result.basePrice,
        finalPrice: result.finalPrice,
        discount: result.discount,
        message: result.message,
      },
      sessionToken,
    });

  } catch (error) {
    console.error('❌ Errore API Form 1:', error);
    return NextResponse.json(
      { success: false, error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}
