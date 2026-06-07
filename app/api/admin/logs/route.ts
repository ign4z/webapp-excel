import { NextRequest, NextResponse } from 'next/server';
import { list } from '@vercel/blob';

/**
 * GET /api/admin/logs?token=SECRET&date=YYYY-MM-DD
 * Restituisce i log del giorno specificato (default: oggi) dal Blob Storage.
 * Funziona solo se LOG_BLOB_ENABLED=true è impostato nel progetto.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  if (token !== process.env.ADMIN_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const date = request.nextUrl.searchParams.get('date') ?? new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'Formato data non valido (YYYY-MM-DD)' }, { status: 400 });
  }

  try {
    const { blobs } = await list({ prefix: `logs/${date}.jsonl`, limit: 1 });

    if (blobs.length === 0) {
      return NextResponse.json({ entries: [], date, count: 0 });
    }

    const res = await fetch(blobs[0].url, { cache: 'no-store' });
    if (!res.ok) {
      return NextResponse.json({ error: 'Errore lettura log dal blob' }, { status: 500 });
    }

    const text = await res.text();
    const entries = text
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((line) => { try { return JSON.parse(line); } catch { return null; } })
      .filter(Boolean);

    return NextResponse.json({ entries, date, count: entries.length });
  } catch (error) {
    console.error('Admin logs error:', error);
    return NextResponse.json({ error: 'Errore recupero log' }, { status: 500 });
  }
}
