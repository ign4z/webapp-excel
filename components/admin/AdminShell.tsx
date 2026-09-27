'use client';

import { Suspense, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { FileSpreadsheet, Home, LockKeyhole, MapPin, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/admin/files', label: 'Report', short: 'Report', icon: FileSpreadsheet },
  { href: '/admin/config', label: 'Configurazione', short: 'Config', icon: SlidersHorizontal },
  { href: '/admin/streets', label: 'Prezzi per via', short: 'Vie', icon: MapPin },
];

interface AdminPageProps {
  title: string;
  description: string;
  /** Contenuto della pagina, riceve il token admin letto dall'URL */
  children: (token: string) => ReactNode;
}

/** Pagina admin: header con navigazione comune, controllo del token in URL e titolo. */
export function AdminPage(props: AdminPageProps) {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-background" />}>
      <AdminPageContent {...props} />
    </Suspense>
  );
}

function AdminPageContent({ title, description, children }: AdminPageProps) {
  const token = useSearchParams().get('token');
  const pathname = usePathname();

  if (!token) return <AccessDenied />;

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 sm:px-6">
          <span className="hidden shrink-0 py-3 text-sm font-semibold text-foreground sm:block">Admin</span>
          <nav className="-mb-px flex flex-1 gap-1 overflow-x-auto" aria-label="Sezioni admin">
            {NAV.map(({ href, label, short, icon: Icon }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={`${href}?token=${encodeURIComponent(token)}`}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-sm transition-colors',
                    active
                      ? 'border-primary font-medium text-foreground'
                      : 'border-transparent text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Icon className="size-4" />
                  <span className="sm:hidden">{short}</span>
                  <span className="hidden sm:inline">{label}</span>
                </Link>
              );
            })}
          </nav>
          <Link
            href="/"
            className="flex shrink-0 items-center gap-1.5 py-3 text-sm text-muted-foreground transition-colors hover:text-foreground"
            title="Torna al sito"
          >
            <Home className="size-4" />
            <span className="hidden sm:inline">Sito</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-16 pt-6 sm:px-6 sm:pt-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        {children(token)}
      </main>
    </div>
  );
}

function AccessDenied() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-4">
      <div className="max-w-sm rounded-xl border bg-card p-8 text-center">
        <LockKeyhole className="mx-auto mb-4 size-8 text-primary" />
        <h1 className="mb-2 text-lg font-semibold text-foreground">Accesso negato</h1>
        <p className="text-sm text-muted-foreground">Token di accesso mancante nell&apos;indirizzo.</p>
      </div>
    </div>
  );
}
