// app/api/admin/config/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getConfigParams, saveConfigParams } from '@/lib/calculations';
import { ConfigParams } from '@/types';

/**
 * GET /api/admin/config?token=SECRET
 * Recupera i parametri di configurazione dal Blob Storage
 */
export async function GET(request: NextRequest) {
  try {
    // Verifica autenticazione (il middleware già protegge /admin/*)
    const token = request.nextUrl.searchParams.get('token');
    if (token !== process.env.ADMIN_TOKEN) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const config = await getConfigParams();

    return NextResponse.json({
      success: true,
      data: config,
    });

  } catch (error) {
    console.error('❌ Errore GET config:', error);
    return NextResponse.json(
      { success: false, error: 'Errore recupero configurazione' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/config?token=SECRET
 * Salva nuovi parametri di configurazione nel Blob Storage
 */
export async function POST(request: NextRequest) {
  try {
    // Verifica autenticazione
    const token = request.nextUrl.searchParams.get('token');
    if (token !== process.env.ADMIN_TOKEN) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body: ConfigParams = await request.json();

    // Validazione input
    if (
      typeof body.basePrice !== 'number' ||
      typeof body.multiplier !== 'number' ||
      typeof body.discountThreshold !== 'number' ||
      typeof body.discountPercentage !== 'number'
    ) {
      return NextResponse.json(
        { success: false, error: 'Parametri non validi' },
        { status: 400 }
      );
    }

    // Validazione valori (devono essere positivi)
    if (
      body.basePrice <= 0 ||
      body.multiplier <= 0 ||
      body.discountThreshold < 0 ||
      body.discountPercentage < 0 ||
      body.discountPercentage > 100
    ) {
      return NextResponse.json(
        { success: false, error: 'I valori devono essere validi (basePrice e multiplier > 0, discountPercentage 0-100)' },
        { status: 400 }
      );
    }

    // Salva nel Blob Storage
    const success = await saveConfigParams(body);

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Errore salvataggio configurazione' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Configurazione salvata con successo su Blob Storage',
      data: body,
    });

  } catch (error) {
    console.error('❌ Errore POST config:', error);
    return NextResponse.json(
      { success: false, error: 'Errore salvataggio configurazione' },
      { status: 500 }
    );
  }
}
