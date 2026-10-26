'use client';

// Client component: legge `tokens` da components/valuation/shared (modulo client).
import type { ReactNode } from 'react';
import Link from 'next/link';
import { PageShell, VLCard, tokens } from '@/components/valuation/shared';
import { LEGAL_LAST_UPDATE } from '@/lib/legal';

/** Layout delle pagine legali (/privacy, /cookie): stesso stile dei form pubblici, testo leggibile. */
export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <PageShell>
      <style>{`
        .legal-page { max-width: 720px; margin: 0 auto; color: ${tokens.inkSoft}; font-size: 0.92rem; line-height: 1.7; }
        .legal-page h1 {
          font-family: var(--font-newsreader), Georgia, serif;
          font-size: clamp(1.8rem, 5vw, 2.4rem);
          font-weight: 400;
          color: ${tokens.ink};
          margin: 0 0 0.35rem;
        }
        .legal-page .updated { font-size: 0.78rem; color: ${tokens.muted}; margin-bottom: 1.75rem; }
        .legal-page h2 {
          font-family: var(--font-newsreader), Georgia, serif;
          font-size: 1.15rem;
          font-weight: 500;
          color: ${tokens.ink};
          margin: 1.75rem 0 0.5rem;
        }
        .legal-page h2:first-child { margin-top: 0; }
        .legal-page p { margin: 0 0 0.75rem; }
        .legal-page ul { margin: 0 0 0.75rem; padding-left: 1.2rem; list-style: disc; }
        .legal-page li { margin-bottom: 0.35rem; }
        .legal-page strong { color: ${tokens.ink}; font-weight: 600; }
        .legal-page a { color: ${tokens.goldLight}; text-decoration: underline; text-underline-offset: 2px; overflow-wrap: anywhere; }
        .legal-page .back { display: inline-block; margin-bottom: 1.5rem; font-size: 0.8rem; color: ${tokens.muted}; }
      `}</style>
      <div className="legal-page">
        <Link href="/" className="back">← Torna alla valutazione</Link>
        <h1>{title}</h1>
        <p className="updated">Ultimo aggiornamento: {LEGAL_LAST_UPDATE}</p>
        <VLCard>{children}</VLCard>
      </div>
    </PageShell>
  );
}
