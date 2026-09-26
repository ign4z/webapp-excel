import type { ReactNode } from 'react';
// Server Component: nel bundle client arriva solo la stringa della versione, non l'intero package.json
import pkg from '@/package.json';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <span className="fixed bottom-2 right-3 text-xs text-zinc-500 select-none">v{pkg.version}</span>
    </>
  );
}
