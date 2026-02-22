'use client';

import { ReactNode } from 'react';

/* ─── DESIGN TOKENS ─── */
export const tokens = {
  gold: '#C9A84C',
  goldLight: '#E8C97A',
  goldDark: '#9A7535',
  ink: '#0F1117',
  inkSoft: '#1E2230',
  paper: '#F9F6F0',
  paperDark: '#EDE8DF',
  muted: '#6B7280',
  success: '#2D7A4F',
  successLight: '#E8F5EE',
  error: '#B91C1C',
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
          font-family: 'Cormorant Garamond', Georgia, serif;
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
          color: ${tokens.ink};
          box-shadow: 0 0 0 4px ${tokens.goldLight}33;
        }
        .step-circle.done {
          background: ${tokens.ink};
          color: ${tokens.gold};
        }
        .step-circle.upcoming {
          background: transparent;
          color: ${tokens.muted};
          border: 1.5px solid #D1C9BB;
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
          color: ${tokens.goldDark};
          font-weight: 600;
        }
        .step-connector {
          width: 5rem;
          height: 1px;
          background: linear-gradient(90deg, ${tokens.gold}, #D1C9BB);
          margin: 0 0.5rem;
          margin-bottom: 1.4rem;
          opacity: 0.5;
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
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=DM+Mono:wght@300;400&family=Outfit:wght@300;400;500;600&display=swap');

        .page-shell {
          min-height: 100vh;
          background-color: ${tokens.paper};
          background-image:
            radial-gradient(ellipse 80% 60% at 50% -10%, ${tokens.goldLight}18 0%, transparent 70%),
            url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23C9A84C' fill-opacity='0.04'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
          padding: 3rem 1.5rem 5rem;
          font-family: 'Outfit', sans-serif;
        }

        .page-inner {
          max-width: 640px;
          margin: 0 auto;
          animation: fadeUp 0.6s ease both;
        }

        .page-inner-wide {
          max-width: 780px;
          margin: 0 auto;
          animation: fadeUp 0.6s ease both;
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      {children}
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
          font-family: 'DM Mono', monospace;
          font-size: 0.65rem;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: ${tokens.gold};
          margin-bottom: 0.6rem;
        }
        .page-header-vl h1 {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(2rem, 5vw, 2.8rem);
          font-weight: 300;
          color: ${tokens.ink};
          line-height: 1.1;
          letter-spacing: -0.01em;
          margin-bottom: 0.5rem;
        }
        .page-header-vl h1 em {
          font-style: italic;
          color: ${tokens.goldDark};
        }
        .page-header-vl .subtitle {
          font-size: 0.9rem;
          color: ${tokens.muted};
          font-weight: 300;
        }
        .header-rule {
          width: 3rem;
          height: 1px;
          background: ${tokens.gold};
          margin: 1rem auto 0;
          opacity: 0.6;
        }
      `}</style>
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
          font-family: 'DM Mono', monospace;
          font-size: 0.65rem;
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
          background: white;
          border: 1px solid #DDD7CC;
          border-radius: 6px;
          padding: 0.7rem 0.9rem;
          font-family: 'Outfit', sans-serif;
          font-size: 0.95rem;
          color: ${tokens.ink};
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
          box-sizing: border-box;
        }
        .vl-input:focus {
          border-color: ${tokens.gold};
          box-shadow: 0 0 0 3px ${tokens.goldLight}22;
        }
        .vl-input:disabled {
          background: ${tokens.paperDark};
          color: ${tokens.muted};
          cursor: not-allowed;
        }
        .vl-input::placeholder { color: #BDB8AF; }
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
          background: ${tokens.ink};
          color: ${tokens.gold};
          border: none;
          border-radius: 6px;
          font-family: 'DM Mono', monospace;
          font-size: 0.75rem;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          cursor: pointer;
          transition: background 0.2s, transform 0.15s, box-shadow 0.2s;
          width: var(--btn-width, auto);
        }
        .vl-btn-primary:hover:not(:disabled) {
          background: ${tokens.inkSoft};
          transform: translateY(-1px);
          box-shadow: 0 6px 20px ${tokens.ink}22;
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
        style={{ ['--btn-width' as any]: fullWidth ? '100%' : 'auto' }}
      >
        {children}
      </button>
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
          border: 1px solid #DDD7CC;
          border-radius: 6px;
          font-family: 'DM Mono', monospace;
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
          background: white;
          border: 1px solid #E8E2D9;
          border-radius: 12px;
          padding: 2rem;
          box-shadow: 0 2px 12px ${tokens.ink}08;
          margin-bottom: 1.5rem;
        }
        .vl-card-accent {
          border-left: 3px solid ${tokens.gold};
          background: linear-gradient(135deg, white 0%, ${tokens.paper} 100%);
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
          padding: 0.6rem 0.9rem;
          border-radius: 6px;
          border: 1px solid #EDE8DF;
          background: white;
          transition: border-color 0.2s, background 0.2s;
          user-select: none;
        }
        .vl-checkbox-row:hover {
          border-color: ${tokens.gold};
          background: ${tokens.paper};
        }
        .vl-checkbox-row input[type="checkbox"] {
          width: 1rem;
          height: 1rem;
          accent-color: ${tokens.gold};
          cursor: pointer;
          flex-shrink: 0;
        }
        .vl-checkbox-label {
          font-size: 0.9rem;
          color: ${tokens.ink};
          flex: 1;
          font-family: 'Outfit', sans-serif;
        }
        .vl-checkbox-badge {
          font-family: 'DM Mono', monospace;
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