// app/api/form-2/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { generateExcel } from '@/lib/excel';
import { sendForm2Email, sendAdminNotification } from '@/lib/email';
import { Form1Data, Form2Data } from '@/types';

/**
 * POST /api/form-2
 * 
 * Flusso:
 * 1. Verifica reCAPTCHA
 * 2. Recupera dati Form 1 dalla session
 * 3. Genera file Excel
 * 4. Upload su Vercel Blob
 * 5. Invia email utente + admin
 * 6. Ritorna conferma
 */
export async function POST(request: NextRequest) {
  try {
    const body: Form2Data & { form1Data?: Form1Data; calculationResult?: any } = await request.json();

    // === 1. VALIDAZIONE INPUT ===
    if (!body.sessionToken || !body.company || !body.address) {
      return NextResponse.json(
        { success: false, error: 'Campi obbligatori mancanti' },
        { status: 400 }
      );
    }

    // Verifica che abbia i dati del Form 1
    if (!body.form1Data || !body.calculationResult) {
      return NextResponse.json(
        { success: false, error: 'Dati Form 1 mancanti. Ricompila il primo form.' },
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

    // === 3. GENERA FILE EXCEL ===
    console.log('📊 Generazione Excel...');
    const excelResult = await generateExcel(
      body.form1Data,
      {
        sessionToken: body.sessionToken,
        company: body.company,
        address: body.address,
        notes: body.notes || '',
        recaptchaToken: body.recaptchaToken,
      },
      body.calculationResult
    );

    console.log('✅ Excel generato:', excelResult.filename);

    // === 4. INVIA EMAIL UTENTE ===
    const emailResult = await sendForm2Email(
      body.form1Data.email,
      body.form1Data.name,
      body.company,
      excelResult.blobUrl
    );

    if (!emailResult.success) {
      console.error('⚠️ Email utente non inviata:', emailResult.error);
    }

    // === 5. NOTIFICA ADMIN ===
    await sendAdminNotification(
      body.form1Data.email,
      body.form1Data.name,
      body.company
    );

    // === 6. RITORNA CONFERMA ===
    return NextResponse.json({
      success: true,
      message: 'Ordine completato con successo!',
      data: {
        excelUrl: excelResult.blobUrl,
        filename: excelResult.filename,
      },
    });

  } catch (error) {
    console.error('❌ Errore API Form 2:', error);
    return NextResponse.json(
      { success: false, error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}
