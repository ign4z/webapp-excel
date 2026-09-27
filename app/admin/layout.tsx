import type { ReactNode } from 'react';
// Server Component: nel bundle client arriva solo la stringa della versione, non l'intero package.json
import pkg from '@/package.json';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <span className="pointer-events-none fixed bottom-2 right-3 select-none text-xs text-muted-foreground">v{pkg.version}</span>
    </>
  );
}
