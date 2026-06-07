import { put, list } from '@vercel/blob';

export type LogLevel = 'error' | 'warn' | 'info' | 'debug' | 'trace';

const LEVEL_NUM: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
  trace: 4,
};

interface LogEntry {
  ts: string;
  level: LogLevel;
  ctx: string;
  msg: string;
  data?: unknown;
}

/* ─── Level configuration ─── */
function getConfiguredLevel(): number {
  const raw = (process.env.LOG_LEVEL ?? '').toLowerCase();
  if (raw in LEVEL_NUM) return LEVEL_NUM[raw as LogLevel];
  return process.env.NODE_ENV === 'production' ? LEVEL_NUM.info : LEVEL_NUM.debug;
}

function shouldLog(level: LogLevel): boolean {
  return LEVEL_NUM[level] <= getConfiguredLevel();
}

/* ─── Console output ─── */
const LEVEL_EMOJI: Record<LogLevel, string> = {
  error: '❌',
  warn: '⚠️ ',
  info: 'ℹ️ ',
  debug: '🐛',
  trace: '🔍',
};

function writeConsole(entry: LogEntry): void {
  const fn =
    entry.level === 'error' ? console.error :
    entry.level === 'warn'  ? console.warn  :
    console.log;

  if (process.env.NODE_ENV === 'production') {
    fn(JSON.stringify(entry));
  } else {
    const time = entry.ts.slice(11, 23);
    const tag = `${LEVEL_EMOJI[entry.level]} [${time}] ${entry.level.toUpperCase().padEnd(5)} [${entry.ctx}]`;
    entry.data !== undefined ? fn(tag, entry.msg, entry.data) : fn(tag, entry.msg);
  }
}

/* ─── Local file output (dev only, Node.js) ─── */
// Dynamic require so the module loads cleanly in Edge Runtime (where fs is unavailable)
let _writeToFile: ((line: string) => void) | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fs = require('fs') as typeof import('fs');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const path = require('path') as typeof import('path');
  const logDir = path.join(process.cwd(), 'logs');
  fs.mkdirSync(logDir, { recursive: true });
  const logFile = path.join(logDir, 'app.log');
  _writeToFile = (line: string) => {
    try { fs.appendFileSync(logFile, line + '\n'); } catch { /* ignore */ }
  };
} catch { /* Edge Runtime or fs unavailable */ }

/* ─── Vercel Blob output (prod, opt-in via LOG_BLOB_ENABLED=true) ─── */
// Writes are serialized in a per-instance Promise chain to reduce concurrent append conflicts.
// Each day gets its own JSONL file: logs/YYYY-MM-DD.jsonl
let _blobQueue: Promise<void> = Promise.resolve();

function writeBlobAsync(entry: LogEntry): void {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return;
  _blobQueue = _blobQueue.then(async () => {
    try {
      const date = entry.ts.slice(0, 10);
      const blobPath = `logs/${date}.jsonl`;
      const line = JSON.stringify(entry) + '\n';
      const { blobs } = await list({ prefix: blobPath, limit: 1 });
      let existing = '';
      if (blobs.length > 0) {
        const res = await fetch(blobs[0].url, { cache: 'no-store' });
        if (res.ok) existing = await res.text();
      }
      await put(blobPath, existing + line, {
        access: 'public',
        token: process.env.BLOB_READ_WRITE_TOKEN,
        allowOverwrite: true,
      });
    } catch { /* silently ignore blob errors to never break the application */ }
  });
}

/* ─── Logger ─── */
export class Logger {
  constructor(private readonly ctx: string) {}

  error(msg: string, data?: unknown) { this._log('error', msg, data); }
  warn(msg: string, data?: unknown)  { this._log('warn',  msg, data); }
  info(msg: string, data?: unknown)  { this._log('info',  msg, data); }
  debug(msg: string, data?: unknown) { this._log('debug', msg, data); }
  trace(msg: string, data?: unknown) { this._log('trace', msg, data); }

  private _log(level: LogLevel, msg: string, data?: unknown): void {
    if (!shouldLog(level)) return;
    const entry: LogEntry = {
      ts: new Date().toISOString(),
      level,
      ctx: this.ctx,
      msg,
      ...(data !== undefined ? { data } : {}),
    };
    writeConsole(entry);
    if (process.env.NODE_ENV !== 'production') {
      _writeToFile?.(JSON.stringify(entry));
    } else if (process.env.LOG_BLOB_ENABLED === 'true') {
      writeBlobAsync(entry);
    }
  }
}

/** Returns a logger scoped to a specific module or function. */
export function createLogger(context: string): Logger {
  return new Logger(context);
}
