import { NextResponse } from 'next/server';
import { getValuationConfig } from '@/lib/config';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/config');

export async function GET() {
  try {
    const config = await getValuationConfig();
    return NextResponse.json({ success: true, data: config });
  } catch (error) {
    log.error('Public config GET error', error instanceof Error ? error.message : error);
    return NextResponse.json({ success: false, error: 'Errore configurazione' }, { status: 500 });
  }
}
