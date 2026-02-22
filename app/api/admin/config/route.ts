import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { getValuationConfig, defaultConfig, ValuationConfig } from '@/lib/config';

const CONFIG_PATH = 'config/valuation-parameters.json';

/* ─── Auth helper ─── */
function isAuthorized(request: NextRequest): boolean {
  const token = request.nextUrl.searchParams.get('token');
  return token === process.env.ADMIN_TOKEN;
}

/* ─── GET /api/admin/config?token=SECRET ─── */
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const config = await getValuationConfig();
    return NextResponse.json({ success: true, data: config });
  } catch (error) {
    console.error('❌ Errore GET config:', error);
    return NextResponse.json({ success: false, error: 'Errore recupero configurazione' }, { status: 500 });
  }
}

/* ─── POST /api/admin/config?token=SECRET ─── */
export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body: Partial<ValuationConfig> = await request.json();

    // Merge con i default per campi mancanti
    const newConfig: ValuationConfig = { ...defaultConfig, ...body };

    // Validazione campi numerici obbligatori
    const numericFields: (keyof ValuationConfig)[] = [
      'pricePerSqmDefault',
      'depreciation',
      'secondBathroom',
      'cellar',
      'renovated',
      'groundFloor',
      'topFloor',
      'exposureSouth',
      'exposureEast',
      'exposureWest',
      'exposureNorth',
      'heatingAutonomous',
      'heatingCentralized',
    ];

    for (const field of numericFields) {
      if (typeof newConfig[field] !== 'number') {
        return NextResponse.json(
          { success: false, error: `Campo non valido: ${field}` },
          { status: 400 }
        );
      }
    }

    if (!newConfig.pricePerSqmByCity || typeof newConfig.pricePerSqmByCity !== 'object') {
      return NextResponse.json(
        { success: false, error: 'pricePerSqmByCity non valido' },
        { status: 400 }
      );
    }

    // Salva su Vercel Blob sovrascrivendo il file esistente
    await put(CONFIG_PATH, JSON.stringify(newConfig, null, 2), {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN,
      allowOverwrite: true,
    });

    return NextResponse.json({
      success: true,
      message: 'Configurazione salvata con successo',
      data: newConfig,
    });
  } catch (error) {
    console.error('❌ Errore POST config:', error);
    return NextResponse.json({ success: false, error: 'Errore salvataggio configurazione' }, { status: 500 });
  }
}