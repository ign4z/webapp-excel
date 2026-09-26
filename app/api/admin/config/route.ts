import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { writeBlobJson } from '@/lib/blob-json-cache';
import { getValuationConfig, defaultConfig, mergeWithDefaults, invalidateConfigCache } from '@/lib/config';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/admin/config');

const CONFIG_PATH = 'config/valuation-parameters.json';

/* ─── GET /api/admin/config?token=SECRET ─── */
export async function GET(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) {
    log.warn('Unauthorized GET config attempt');
    return denied;
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
  const denied = requireAdmin(request);
  if (denied) {
    log.warn('Unauthorized POST config attempt');
    return denied;
  }

  try {
    log.info('Admin config POST: saving new config');
    const body = await request.json();

    if (typeof body !== 'object' || Array.isArray(body) || body === null) {
      return NextResponse.json({ success: false, error: 'Body non valido' }, { status: 400 });
    }

    // Reject unknown keys (only keys of ValuationConfig are allowed)
    const allowedKeys = new Set<string>(['pricePerSqmByCity', 'pricePerSqmDefault', 'coefficienti']);
    for (const key of Object.keys(body)) {
      if (!allowedKeys.has(key)) {
        return NextResponse.json({ success: false, error: `Chiave non consentita: ${key}` }, { status: 400 });
      }
    }

    // Merge con i default per campi mancanti (deep merge per tabella coefficienti, come in lettura)
    const newConfig = mergeWithDefaults(body);

    // Validate pricePerSqmByCity
    if (!newConfig.pricePerSqmByCity || typeof newConfig.pricePerSqmByCity !== 'object') {
      return NextResponse.json({ success: false, error: 'pricePerSqmByCity non valido' }, { status: 400 });
    }
    for (const [city, price] of Object.entries(newConfig.pricePerSqmByCity)) {
      if (!Number.isFinite(price) || price < 100 || price > 50000) {
        return NextResponse.json({ success: false, error: `Prezzo non valido per ${city}: deve essere tra 100 e 50000` }, { status: 400 });
      }
    }

    if (!Number.isFinite(newConfig.pricePerSqmDefault) || newConfig.pricePerSqmDefault < 100 || newConfig.pricePerSqmDefault > 50000) {
      return NextResponse.json({ success: false, error: 'pricePerSqmDefault deve essere tra 100 e 50000' }, { status: 400 });
    }

    // Validate coefficienti: each sub-key value must be in [0.01, 5.00]
    if (body.coefficienti && typeof body.coefficienti === 'object') {
      const errors: string[] = [];
      const defaultTables = defaultConfig.coefficienti as unknown as Record<string, Record<string, number>>;
      for (const [table, tableValues] of Object.entries(body.coefficienti as Record<string, unknown>)) {
        if (!(table in defaultTables)) {
          errors.push(`coefficienti.${table}: tabella sconosciuta`);
          continue;
        }
        if (typeof tableValues !== 'object' || tableValues === null) continue;
        for (const [key, val] of Object.entries(tableValues as Record<string, unknown>)) {
          if (!(key in defaultTables[table])) {
            errors.push(`coefficienti.${table}.${key}: chiave sconosciuta`);
            continue;
          }
          if (typeof val !== 'number' || !Number.isFinite(val) || val < 0.01 || val > 5.00) {
            errors.push(`coefficienti.${table}.${key}: valore ${val} fuori range [0.01, 5.00]`);
          }
        }
      }
      if (errors.length > 0) {
        return NextResponse.json({ success: false, error: errors.join('; ') }, { status: 400 });
      }
    }

    await writeBlobJson(CONFIG_PATH, newConfig);

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