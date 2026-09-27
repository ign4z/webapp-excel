import { AlertTriangle, CheckCircle2, Info, Loader2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

// I controller scrivono i messaggi con un'emoji iniziale (✅ ❌ ⏳ ⚠️): qui diventano icona + colore
const KINDS = [
  { prefix: '✅', icon: CheckCircle2, className: 'text-emerald-400', spin: false },
  { prefix: '❌', icon: XCircle, className: 'text-red-400', spin: false },
  { prefix: '⏳', icon: Loader2, className: 'text-sky-400', spin: true },
  { prefix: '⚠️', icon: AlertTriangle, className: 'text-amber-400', spin: false },
];

/** Messaggio di esito con icona; senza prefisso noto viene trattato come errore o informazione (`fallback`). */
export function StatusMessage({
  message,
  fallback = 'error',
  className,
}: {
  message: string;
  fallback?: 'error' | 'info';
  className?: string;
}) {
  if (!message) return null;
  const kind = KINDS.find((k) => message.startsWith(k.prefix));
  const text = kind ? message.slice(kind.prefix.length).trim() : message;
  const Icon = kind?.icon ?? (fallback === 'error' ? XCircle : Info);
  const color = kind?.className ?? (fallback === 'error' ? 'text-red-400' : 'text-muted-foreground');

  return (
    <p className={cn('flex items-start gap-2 text-sm', color, className)} role="status">
      <Icon className={cn('mt-0.5 size-4 shrink-0', kind?.spin && 'animate-spin')} />
      <span>{text}</span>
    </p>
  );
}
