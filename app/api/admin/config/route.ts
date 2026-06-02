import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { getValuationConfig, defaultConfig, ValuationConfig, invalidateConfigCache } from '@/lib/config';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/admin/config');

const CONFIG_PATH = 'config/valuation-parameters.json';

/* ─── Auth helper ─── */
function isAuthorized(request: NextRequest): boolean {
  const token = request.nextUrl.searchParams.get('token');
  return token === process.env.ADMIN_TOKEN;
}

/* ─── GET /api/admin/config?token=SECRET ─── */
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    log.warn('Unauthorized GET config attempt');
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    log.debug('Admin config GET');
    const config = await getValuationConfig();
    return NextResponse.json({ success: true, data: config });
  } catch (error) {
    log.error('Admin config GET error', error instanceof Error ? error.message : error);
    return NextResponse.json({ success: false, error: 'Errore recupero configurazione' }, { status: 500 });
  }
}

/* ─── POST /api/admin/config?token=SECRET ─── */
export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    log.warn('Unauthorized POST config attempt');
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    log.info('Admin config POST: saving new config');
    const body = await request.json();

    if (typeof body !== 'object' || Array.isArray(body) || body === null) {
      return NextResponse.json({ success: false, error: 'Body non valido' }, { status: 400 });
    }

    // Reject unknown keys (only keys of ValuationConfig are allowed)
    const allowedKeys = new Set<string>([
      'pricePerSqmByCity', 'pricePerSqmDefault', 'depreciation', 'secondBathroom',
      'cellar', 'renovated', 'groundFloor', 'topFloor', 'exposureSouth', 'exposureEast',
      'exposureWest', 'exposureNorth', 'heatingAutonomous', 'heatingCentralized',
      'coefficienti',
    ]);
    for (const key of Object.keys(body)) {
      if (!allowedKeys.has(key)) {
        return NextResponse.json({ success: false, error: `Chiave non consentita: ${key}` }, { status: 400 });
      }
    }

    // Merge con i default per campi mancanti
    const newConfig: ValuationConfig = { ...defaultConfig, ...body };

    // Validate pricePerSqmByCity
    if (!newConfig.pricePerSqmByCity || typeof newConfig.pricePerSqmByCity !== 'object') {
      return NextResponse.json({ success: false, error: 'pricePerSqmByCity non valido' }, { status: 400 });
    }
    for (const [city, price] of Object.entries(newConfig.pricePerSqmByCity)) {
      if (!Number.isFinite(price) || price < 100 || price > 50000) {
        return NextResponse.json({ success: false, error: `Prezzo non valido per ${city}: deve essere tra 100 e 50000` }, { status: 400 });
      }
    }

    // Validate numeric percentage fields (plausible range: -100 to 100)
    const percentageFields: (keyof Omit<ValuationConfig, 'pricePerSqmByCity' | 'pricePerSqmDefault' | 'depreciation' | 'coefficienti'>)[] = [
      'secondBathroom', 'cellar', 'renovated', 'groundFloor', 'topFloor',
      'exposureSouth', 'exposureEast', 'exposureWest', 'exposureNorth',
      'heatingAutonomous', 'heatingCentralized',
    ];
    for (const field of percentageFields) {
      const val = newConfig[field];
      if (!Number.isFinite(val) || val < -100 || val > 100) {
        return NextResponse.json({ success: false, error: `Valore non valido per ${field}: deve essere tra -100 e 100` }, { status: 400 });
      }
    }
    if (!Number.isFinite(newConfig.pricePerSqmDefault) || newConfig.pricePerSqmDefault < 100 || newConfig.pricePerSqmDefault > 50000) {
      return NextResponse.json({ success: false, error: 'pricePerSqmDefault deve essere tra 100 e 50000' }, { status: 400 });
    }
    if (!Number.isFinite(newConfig.depreciation) || newConfig.depreciation < 0 || newConfig.depreciation > 100) {
      return NextResponse.json({ success: false, error: 'depreciation deve essere tra 0 e 100' }, { status: 400 });
    }

    await put(CONFIG_PATH, JSON.stringify(newConfig, null, 2), {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN,
      allowOverwrite: true,
    });

    invalidateConfigCache();
    log.info('Config saved and cache invalidated');

    return NextResponse.json({
      success: true,
      message: 'Configurazione salvata con successo',
      data: newConfig,
    });
  } catch (error) {
    log.error('Admin config POST error', error instanceof Error ? error.message : error);
    return NextResponse.json({ success: false, error: 'Errore salvataggio configurazione' }, { status: 500 });
  }
}