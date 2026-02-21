import { NextRequest, NextResponse } from 'next/server';
import { initializeConfig } from '@/lib/calculations';

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token');
    if (token !== process.env.ADMIN_TOKEN) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('🚀 Inizializzazione configurazione...');
    
    await initializeConfig();

    return NextResponse.json({
      success: true,
      message: 'Configurazione inizializzata con successo',
    });

  } catch (error) {
    console.error('❌ Errore inizializzazione:', error);
    return NextResponse.json(
      { success: false, error: 'Errore inizializzazione' },
      { status: 500 }
    );
  }
}
