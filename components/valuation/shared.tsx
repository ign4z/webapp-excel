'use client';

import { ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Turnstile } from '@marsidev/react-turnstile';
import { TITOLARE } from '@/lib/legal';

/* ─── DESIGN TOKENS ─── */
export const tokens = {
  gold: '#DA2128',
  goldLight: '#F1373E',
  goldDark: '#B01820',
  ink: '#F4F3F1',
  inkSoft: '#ABA9A5',
  paper: '#0B0B0C',
  paperDark: '#121214',
  border: 'rgba(255,255,255,0.09)',
  muted: '#6E6D6B',
  success: '#22C55E',
  successLight: '#14532D',
  error: '#F87171',
};

/* ─── STEPPER ─── */
interface StepperProps {
  current: 1 | 2;
}

export function Stepper({ current }: StepperProps) {
  return (
    <div className="stepper-wrapper">
      <style>{`
        .stepper-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0;
          margin-bottom: 2.5rem;
          font-family: var(--font-newsreader), Georgia, serif;
        }
        .step-item {
          display: flex;
          align-items: center;
          gap: 0;
        }
        .step-circle {
          width: 2.5rem;
          height: 2.5rem;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.95rem;
          font-weight: 600;
          letter-spacing: 0.05em;
          transition: all 0.4s ease;
          position: relative;
          z-index: 1;
        }
        .step-circle.active {
          background: ${tokens.gold};
          color: #FFFFFF;
          box-shadow: 0 0 0 4px ${tokens.gold}33;
        }
        .step-circle.done {
          background: ${tokens.paperDark};
          color: ${tokens.gold};
          border: 1px solid ${tokens.gold};
        }
        .step-circle.upcoming {
          background: transparent;
          color: ${tokens.muted};
          border: 1.5px solid #3A3A3A;
        }
        .step-label {
          font-size: 0.7rem;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          margin-top: 0.35rem;
          text-align: center;
          color: ${tokens.muted};
        }
        .step-label.active {
          color: ${tokens.goldLight};
          font-weight: 600;
        }
        .step-connector {
          width: 5rem;
          height: 1px;
          background: linear-gradient(90deg, ${tokens.gold}, #3A3A3A);
          margin: 0 0.5rem;
          margin-bottom: 1.4rem;
          opacity: 0.6;
        }
        .step-col {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
      `}</style>
      <div className="step-item">
        <div className="step-col">
          <div className={`step-circle ${current === 1 ? 'active' : 'done'}`}>
            {current > 1 ? '✓' : '1'}
          </div>
          <div className={`step-label ${current === 1 ? 'active' : ''}`}>Dati base</div>
        </div>
        <div className="step-connector" />
        <div className="step-col">
          <div className={`step-circle ${current === 2 ? 'active' : 'upcoming'}`}>2</div>
          <div className={`step-label ${current === 2 ? 'active' : ''}`}>Dettagli</div>
        </div>
      </div>
    </div>
  );
}

/* ─── PAGE SHELL ─── */
interface PageShellProps {
  children: ReactNode;
}

export function PageShell({ children }: PageShellProps) {
  return (
    <div className="page-shell">
      <style>{`
        .page-shell {
          min-height: 100vh;
          min-height: 100dvh;
          background-color: ${tokens.paper};
          background-image:
            radial-gradient(ellipse 80% 60% at 50% -10%, ${tokens.gold}12 0%, transparent 70%),
            url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23C41E3A' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
          padding: 3rem 1.5rem 5rem;
          font-family: var(--font-hanken), system-ui, sans-serif;
        }

        .page-inner {
          max-width: 640px;
          margin: 0 auto;
          animation: fadeUp 0.6s ease backwards;
        }

        .page-inner-wide {
          max-width: 780px;
          margin: 0 auto;
          animation: fadeUp 0.6s ease backwards;
        }

        @media (max-width: 480px) {
          .page-shell { padding: 1.75rem 1rem 3rem; }
        }

        /* fill "backwards", non "both": un transform che resta applicato a fine animazione
           fa da riferimento al position:fixed del campo via a tutta pagina, spostandolo fuori schermo */
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: none; }
        }
      `}</style>
      {children}
      <LegalFooter />
    </div>
  );
}

/* ─── FOOTER LEGALE ─── */
// Titolare e P.IVA vanno indicati sul sito; i link portano a informativa e cookie policy.
function LegalFooter() {
  return (
    <footer className="vl-legal-footer">
      <style>{`
        .vl-legal-footer {
          max-width: 640px;
          margin: 3rem auto 0;
          padding-top: 1.25rem;
          border-top: 1px solid ${tokens.border};
          text-align: center;
          font-size: 0.75rem;
          line-height: 1.6;
          color: ${tokens.muted};
        }
        .vl-legal-footer a { color: ${tokens.inkSoft}; text-decoration: underline; text-underline-offset: 2px; }
        .vl-legal-footer a:hover { color: ${tokens.ink}; }
        .vl-legal-footer .links { display: flex; justify-content: center; gap: 1.25rem; margin-top: 0.35rem; }
      `}</style>
      <p>{TITOLARE.ragioneSociale} · P.IVA {TITOLARE.partitaIva}</p>
      <p className="links">
        <Link href="/privacy">Privacy</Link>
        <Link href="/cookie">Cookie</Link>
      </p>
    </footer>
  );
}

/* ─── AVVISO PRIVACY SUI FORM ─── */
// Informativa al momento della raccolta (art. 13 GDPR). Non è un consenso: il ricontatto
// rientra nella richiesta di valutazione (art. 6.1.b), quindi nessuna checkbox.
export function PrivacyNotice() {
  return (
    <p className="vl-privacy-notice">
      <style>{`
        .vl-privacy-notice {
          font-size: 0.78rem;
          line-height: 1.55;
          color: ${tokens.muted};
          text-align: center;
          margin: 0 0 1rem;
        }
        .vl-privacy-notice a { color: ${tokens.inkSoft}; text-decoration: underline; text-underline-offset: 2px; }
      `}</style>
      Inviando i dati riceverai la valutazione via email e potrai essere ricontattato da un nostro agente
      per approfondirla. Leggi l&apos;<Link href="/privacy" target="_blank">informativa privacy</Link>.
    </p>
  );
}

/* ─── ERRORE DI INVIO ─── */
// Errore mostrato sopra il pulsante di invio (rate limit, verifica anti-bot, errori server).
export function FormAlert({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="vl-form-alert" role="alert">
      <style>{`
        .vl-form-alert {
          margin: 0 0 1rem;
          padding: 0.75rem 1rem;
          border: 1px solid ${tokens.error}55;
          border-left: 3px solid ${tokens.error};
          border-radius: 6px;
          background: ${tokens.error}14;
          color: ${tokens.error};
          font-size: 0.88rem;
          line-height: 1.5;
        }
      `}</style>
      {message}
    </p>
  );
}

/** Testo per FormAlert: i messaggi delle nostre API (Error), non quelli tecnici di rete o JSON. */
export function submitErrorMessage(error: unknown): string {
  if (error instanceof TypeError || error instanceof SyntaxError || !(error instanceof Error) || !error.message) {
    return 'Invio non riuscito. Controlla la connessione e riprova.';
  }
  return error.message;
}

/* ─── VERIFICA ANTI-BOT ─── */
// Cloudflare Turnstile: nessun cookie di profilazione. Senza site key (sviluppo) non viene mostrato.
export function CaptchaWidget({ onChange }: { onChange: (token: string | null) => void }) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  if (!siteKey) return null;
  return (
    <div className="vl-captcha">
      <style>{`.vl-captcha { margin: 0.5rem 0 1.25rem; }`}</style>
      <Turnstile
        siteKey={siteKey}
        options={{ theme: 'dark', language: 'it', size: 'flexible' }}
        onSuccess={onChange}
        onExpire={() => onChange(null)}
        onError={() => onChange(null)}
      />
    </div>
  );
}

/* ─── LOGO / HEADER ─── */
export function PageHeader({ subtitle }: { subtitle: string }) {
  return (
    <header className="page-header-vl">
      <style>{`
        .page-header-vl {
          text-align: center;
          margin-bottom: 2.5rem;
        }
        .page-header-vl .eyebrow {
          font-family: var(--font-jetbrains), ui-monospace, monospace;
          font-size: 0.65rem;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: ${tokens.gold};
          margin-bottom: 0.6rem;
        }
        .page-header-vl h1 {
          font-family: var(--font-newsreader), Georgia, serif;
          font-size: clamp(2rem, 5vw, 2.8rem);
          font-weight: 300;
          color: ${tokens.ink};
          line-height: 1.1;
          letter-spacing: -0.01em;
          margin-bottom: 0.5rem;
        }
        .page-header-vl h1 em {
          font-style: italic;
          color: ${tokens.gold};
        }
        .page-header-vl .subtitle {
          font-size: 0.9rem;
          color: ${tokens.muted};
          font-weight: 300;
        }
        .header-logo {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid ${tokens.gold};
          box-shadow: 0 0 0 4px ${tokens.gold}22;
          margin: 0 auto 1.2rem;
          display: block;
        }
        .header-rule {
          width: 3rem;
          height: 1px;
          background: ${tokens.gold};
          margin: 1rem auto 0;
          opacity: 0.6;
        }
      `}</style>
      <Image
        className="header-logo"
        src="/logo.jpg"
        alt="Logo"
        width={80}
        height={80}
      />
      <p className="eyebrow">Valutazione Immobiliare</p>
      <h1>Scopri il valore<br />del <em>tuo immobile</em></h1>
      <p className="subtitle">{subtitle}</p>
      <div className="header-rule" />
    </header>
  );
}

/* ─── FIELD WRAPPER ─── */
export function FieldGroup({ children, label, error }: { children: ReactNode; label: string; error?: string }) {
  return (
    <div className="vl-field-group">
      <style>{`
        .vl-field-group {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }
        .vl-label {
          font-family: var(--font-jetbrains), ui-monospace, monospace;
          font-size: 0.72rem;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: ${tokens.inkSoft};
          font-weight: 400;
        }
        .vl-error {
          font-size: 0.75rem;
          color: ${tokens.error};
          margin-top: 0.15rem;
        }
        .vl-input {
          width: 100%;
          background: ${tokens.paperDark};
          border: 1px solid ${tokens.border};
          border-radius: 6px;
          padding: 0.7rem 0.9rem;
          font-family: var(--font-hanken), system-ui, sans-serif;
          font-size: 1rem; /* sotto 16px iOS fa zoom al focus */
          color: ${tokens.ink};
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
          box-sizing: border-box;
        }
        .vl-input:focus {
          border-color: ${tokens.gold};
          box-shadow: 0 0 0 3px ${tokens.gold}22;
        }
        .vl-input:disabled {
          background: #111111;
          color: ${tokens.muted};
          cursor: not-allowed;
        }
        .vl-input::placeholder { color: #444444; }
      `}</style>
      <label className="vl-label">{label}</label>
      {children}
      {error && <span className="vl-error">{error}</span>}
    </div>
  );
}

/* ─── SUBMIT BUTTON ─── */
export function PrimaryButton({
  children,
  disabled,
  type = 'submit',
  onClick,
  fullWidth = true,
}: {
  children: ReactNode;
  disabled?: boolean;
  type?: 'submit' | 'button';
  onClick?: () => void;
  fullWidth?: boolean;
}) {
  return (
    <>
      <style>{`
        .vl-btn-primary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.85rem 2rem;
          background: ${tokens.gold};
          color: #FFFFFF;
          border: none;
          border-radius: 6px;
          font-family: var(--font-jetbrains), ui-monospace, monospace;
          font-size: 0.75rem;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          cursor: pointer;
          transition: background 0.2s, transform 0.15s, box-shadow 0.2s;
          width: var(--btn-width, auto);
        }
        .vl-btn-primary:hover:not(:disabled) {
          background: ${tokens.goldDark};
          transform: translateY(-1px);
          box-shadow: 0 6px 20px ${tokens.gold}44;
        }
        .vl-btn-primary:active:not(:disabled) { transform: translateY(0); }
        .vl-btn-primary:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }
      `}</style>
      <button
        type={type}
        disabled={disabled}
        onClick={onClick}
        className="vl-btn-primary"
        style={{ '--btn-width': fullWidth ? '100%' : 'auto' } as React.CSSProperties}
      >
        {children}
      </button>
    </>
  );
}

/* ─── SPINNER ─── */
export function Spinner({ size = '1rem', color = 'currentColor' }: { size?: string; color?: string }) {
  return (
    <>
      <style>{`
        @keyframes vl-spin { to { transform: rotate(360deg); } }
        .vl-spinner {
          display: inline-block;
          flex-shrink: 0;
          border: 2px solid transparent;
          border-top-color: var(--spinner-color);
          border-right-color: var(--spinner-color);
          border-radius: 50%;
          animation: vl-spin 0.7s linear infinite;
        }
      `}</style>
      <span
        className="vl-spinner"
        role="status"
        aria-label="Caricamento"
        style={{ width: size, height: size, '--spinner-color': color } as React.CSSProperties}
      />
    </>
  );
}

/* ─── GHOST BUTTON ─── */
export function GhostButton({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <>
      <style>{`
        .vl-btn-ghost {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.85rem 1.5rem;
          background: transparent;
          color: ${tokens.muted};
          border: 1px solid ${tokens.border};
          border-radius: 6px;
          font-family: var(--font-jetbrains), ui-monospace, monospace;
          font-size: 0.7rem;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          cursor: pointer;
          transition: border-color 0.2s, color 0.2s;
        }
        .vl-btn-ghost:hover:not(:disabled) {
          border-color: ${tokens.ink};
          color: ${tokens.ink};
        }
        .vl-btn-ghost:disabled { opacity: 0.4; cursor: not-allowed; }
      `}</style>
      <button type="button" onClick={onClick} disabled={disabled} className="vl-btn-ghost">
        {children}
      </button>
    </>
  );
}

/* ─── CARD ─── */
export function VLCard({ children, accent }: { children: ReactNode; accent?: boolean }) {
  return (
    <div className={`vl-card ${accent ? 'vl-card-accent' : ''}`}>
      <style>{`
        .vl-card {
          background: ${tokens.paperDark};
          border: 1px solid ${tokens.border};
          border-top: 1px solid rgba(255,255,255,0.08);
          border-radius: 14px;
          padding: 2rem;
          box-shadow: 0 8px 40px rgba(0,0,0,0.7), 0 2px 8px rgba(0,0,0,0.4);
          margin-bottom: 1.5rem;
        }
        @media (max-width: 480px) {
          .vl-card { padding: 1.25rem; border-radius: 12px; margin-bottom: 1rem; }
        }
        .vl-card-accent {
          border-left: 3px solid ${tokens.gold};
          border-top: 1px solid rgba(196,30,58,0.3);
          background: linear-gradient(135deg, #2a2a2a 0%, #1e1e1e 100%);
          box-shadow: 0 8px 40px rgba(0,0,0,0.7), 0 0 0 1px rgba(196,30,58,0.1), 0 2px 8px rgba(0,0,0,0.4);
        }
      `}</style>
      {children}
    </div>
  );
}

/* ─── CHECKBOX ROW ─── */
export function CheckboxRow({
  label,
  badge,
  checked,
  onChange,
}: {
  label: string;
  badge?: string;
  checked?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <label className="vl-checkbox-row">
      <style>{`
        .vl-checkbox-row {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          cursor: pointer;
          min-height: 2.75rem;
          box-sizing: border-box;
          padding: 0.6rem 0.9rem;
          border-radius: 6px;
          border: 1px solid ${tokens.border};
          background: ${tokens.paperDark};
          transition: border-color 0.2s, background 0.2s;
          user-select: none;
        }
        .vl-checkbox-row:hover {
          border-color: ${tokens.gold};
          background: #2e2e2e;
        }
        .vl-checkbox-row input[type="checkbox"] {
          width: 1.15rem;
          height: 1.15rem;
          accent-color: ${tokens.gold};
          cursor: pointer;
          flex-shrink: 0;
        }
        .vl-checkbox-label {
          font-size: 0.9rem;
          color: ${tokens.ink};
          flex: 1;
          font-family: var(--font-hanken), system-ui, sans-serif;
        }
        .vl-checkbox-badge {
          font-family: var(--font-jetbrains), ui-monospace, monospace;
          font-size: 0.65rem;
          letter-spacing: 0.08em;
          color: ${tokens.success};
          background: ${tokens.successLight};
          padding: 0.15rem 0.45rem;
          border-radius: 4px;
        }
      `}</style>
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span className="vl-checkbox-label">{label}</span>
      {badge && <span className="vl-checkbox-badge">{badge}</span>}
    </label>
  );
}
