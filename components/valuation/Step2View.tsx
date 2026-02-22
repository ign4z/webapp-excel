'use client';

import { UseFormReturn, Controller } from 'react-hook-form';
import ReCAPTCHA from 'react-google-recaptcha';
import {
  PageShell,
  PageHeader,
  Stepper,
  VLCard,
  FieldGroup,
  PrimaryButton,
  GhostButton,
  CheckboxRow,
  tokens,
} from '@/components/valuation/shared';

export interface Step2FormValues {
  floor?: number;
  hasElevator?: boolean;
  hasSecondBathroom?: boolean;
  hasCellar?: boolean;
  exposure?: 'north' | 'south' | 'east' | 'west' | 'none';
  heatingType?: 'autonomous' | 'centralized' | 'none';
  buildYear?: number;
  isRecentlyRenovated?: boolean;
  notes?: string;
}

interface Form1Data {
  firstName: string;
  lastName: string;
  email: string;
  address: string;
  squareMeters: number;
}

interface CalcResult {
  estimatedValue: number;
}

interface FinalResult {
  baseValue: number;
  finalValue: number;
  totalAdjustment: number;
  details?: string[];
}

interface Step2ViewProps {
  form: UseFormReturn<Step2FormValues>;
  form1Data: Form1Data;
  calculationResult: CalcResult;
  isLoading: boolean;
  finalResult: FinalResult | null;
  excelUrl: string | null;
  onSubmit: (e: React.FormEvent) => void;
  onBack: () => void;
  onRecaptchaChange: (token: string | null) => void;
  onNewValuation: () => void;
}

export function Step2View({
  form,
  form1Data,
  calculationResult,
  isLoading,
  finalResult,
  excelUrl,
  onSubmit,
  onBack,
  onRecaptchaChange,
  onNewValuation,
}: Step2ViewProps) {
  const { register, formState: { errors }, control } = form;

  if (finalResult && excelUrl) {
    return <ResultScreen finalResult={finalResult} excelUrl={excelUrl} onNewValuation={onNewValuation} />;
  }

  return (
    <PageShell>
      <style>{`
        .page-inner-wide { max-width: 780px; margin: 0 auto; }
        .summary-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.75rem 1.5rem;
          font-family: 'Outfit', sans-serif;
        }
        .summary-item-label {
          font-family: 'DM Mono', monospace;
          font-size: 0.62rem;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: ${tokens.muted};
          margin-bottom: 0.15rem;
        }
        .summary-item-value {
          font-size: 0.95rem;
          color: ${tokens.ink};
          font-weight: 500;
        }
        .summary-estimate {
          grid-column: 1 / -1;
          border-top: 1px solid #EDE8DF;
          padding-top: 1rem;
          margin-top: 0.25rem;
          display: flex;
          align-items: baseline;
          gap: 1rem;
        }
        .estimate-label {
          font-family: 'DM Mono', monospace;
          font-size: 0.65rem;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: ${tokens.muted};
        }
        .estimate-value {
          font-family: 'Cormorant Garamond', serif;
          font-size: 2rem;
          font-weight: 500;
          color: ${tokens.goldDark};
          letter-spacing: -0.01em;
        }
        .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        @media (max-width: 520px) {
          .two-col { grid-template-columns: 1fr; }
          .summary-grid { grid-template-columns: 1fr; }
        }
        .form-fields { display: flex; flex-direction: column; gap: 1rem; }
        .checkboxes { display: flex; flex-direction: column; gap: 0.5rem; }
        .section-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 1rem;
          font-weight: 500;
          color: ${tokens.inkSoft};
          letter-spacing: 0.02em;
          margin-bottom: 1.2rem;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid #EDE8DF;
        }
        .optional-tag {
          font-family: 'DM Mono', monospace;
          font-size: 0.6rem;
          letter-spacing: 0.1em;
          color: ${tokens.muted};
          margin-left: 0.5rem;
          font-weight: 400;
        }
        .vl-select {
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
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23C9A84C' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 0.9rem center;
          cursor: pointer;
        }
        .vl-select:focus {
          border-color: ${tokens.gold};
          box-shadow: 0 0 0 3px ${tokens.goldLight}22;
        }
        .btn-row {
          display: flex;
          gap: 0.75rem;
          align-items: center;
        }
        .btn-row > :first-child { flex-shrink: 0; }
        .btn-row > :last-child { flex: 1; }
        .recaptcha-wrap { display: flex; justify-content: center; }
        .field-hint {
          font-size: 0.72rem;
          color: ${tokens.muted};
          font-family: 'DM Mono', monospace;
          letter-spacing: 0.04em;
          margin-top: 0.2rem;
        }
      `}</style>

      <div className="page-inner-wide">
        <PageHeader subtitle={`Ciao ${form1Data.firstName}, aggiungi i dettagli per affinare la stima`} />
        <Stepper current={2} />

        {/* Riepilogo step 1 */}
        <VLCard accent>
          <div className="summary-grid">
            <div>
              <p className="summary-item-label">Proprietario</p>
              <p className="summary-item-value">{form1Data.firstName} {form1Data.lastName}</p>
            </div>
            <div>
              <p className="summary-item-label">Superficie</p>
              <p className="summary-item-value">{form1Data.squareMeters} mq</p>
            </div>
            <div className="summary-grid" style={{ gridColumn: '1/-1', padding: 0, margin: 0 }}>
              <div style={{ gridColumn: '1/-1' }}>
                <p className="summary-item-label">Indirizzo</p>
                <p className="summary-item-value">{form1Data.address}</p>
              </div>
            </div>
            <div className="summary-estimate">
              <span className="estimate-label">Stima base</span>
              <span className="estimate-value">
                €{calculationResult.estimatedValue.toLocaleString('it-IT')}
              </span>
            </div>
          </div>
        </VLCard>

        <form onSubmit={onSubmit}>
          {/* Caratteristiche strutturali */}
          <VLCard>
            <p className="section-title">
              Caratteristiche strutturali
              <span className="optional-tag">opzionali</span>
            </p>
            <div className="form-fields">
              <div className="two-col">
                <FieldGroup label="Piano" error={errors.floor?.message}>
                  <input
                    className="vl-input"
                    type="number"
                    min={0}
                    placeholder="Es. 2"
                    {...register('floor', {
                      setValueAs: (v) => (v === '' ? undefined : parseInt(v)),
                    })}
                  />
                  <span className="field-hint">0 = piano terra</span>
                </FieldGroup>
                <FieldGroup label="Anno di costruzione" error={errors.buildYear?.message}>
                  <input
                    className="vl-input"
                    type="number"
                    min={1800}
                    max={new Date().getFullYear()}
                    placeholder="Es. 1990"
                    {...register('buildYear', {
                      setValueAs: (v) => (v === '' ? undefined : parseInt(v)),
                    })}
                  />
                  <span className="field-hint">−0.3% per ogni anno</span>
                </FieldGroup>
              </div>

              <div className="two-col">
                <FieldGroup label="Esposizione">
                  <select className="vl-select" {...register('exposure')}>
                    <option value="none">Non specificato</option>
                    <option value="south">Sud (+5%)</option>
                    <option value="east">Est (+5%)</option>
                    <option value="west">Ovest (+5%)</option>
                    <option value="north">Nord (−3%)</option>
                  </select>
                </FieldGroup>
                <FieldGroup label="Riscaldamento">
                  <select className="vl-select" {...register('heatingType')}>
                    <option value="none">Non specificato</option>
                    <option value="autonomous">Autonomo</option>
                    <option value="centralized">Centralizzato</option>
                  </select>
                </FieldGroup>
              </div>
            </div>
          </VLCard>

          {/* Optional features */}
          <VLCard>
            <p className="section-title">
              Dotazioni
              <span className="optional-tag">opzionali</span>
            </p>
            <div className="checkboxes">
              <Controller
                control={control}
                name="hasElevator"
                render={({ field }) => (
                  <CheckboxRow
                    label="Ascensore"
                    checked={!!field.value}
                    onChange={(e) => field.onChange(e.target.checked)}
                  />
                )}
              />
              <Controller
                control={control}
                name="hasSecondBathroom"
                render={({ field }) => (
                  <CheckboxRow
                    label="Secondo bagno"
                    badge="+3%"
                    checked={!!field.value}
                    onChange={(e) => field.onChange(e.target.checked)}
                  />
                )}
              />
              <Controller
                control={control}
                name="hasCellar"
                render={({ field }) => (
                  <CheckboxRow
                    label="Cantina"
                    badge="+3%"
                    checked={!!field.value}
                    onChange={(e) => field.onChange(e.target.checked)}
                  />
                )}
              />
              <Controller
                control={control}
                name="isRecentlyRenovated"
                render={({ field }) => (
                  <CheckboxRow
                    label="Ristrutturato recentemente"
                    badge="+10%"
                    checked={!!field.value}
                    onChange={(e) => field.onChange(e.target.checked)}
                  />
                )}
              />
            </div>
          </VLCard>

          {/* Note */}
          <VLCard>
            <p className="section-title">
              Note aggiuntive
              <span className="optional-tag">opzionali</span>
            </p>
            <FieldGroup label="Note">
              <input
                className="vl-input"
                placeholder="Eventuali dettagli rilevanti…"
                {...register('notes')}
              />
            </FieldGroup>
          </VLCard>

          {process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY && (
            <div className="recaptcha-wrap" style={{ marginBottom: '1.5rem' }}>
              <ReCAPTCHA
                sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}
                onChange={onRecaptchaChange}
                onExpired={() => onRecaptchaChange(null)}
              />
            </div>
          )}

          <div className="btn-row">
            <GhostButton onClick={onBack} disabled={isLoading}>
              ← Indietro
            </GhostButton>
            <PrimaryButton disabled={isLoading}>
              {isLoading ? 'Elaborazione…' : 'Completa valutazione →'}
            </PrimaryButton>
          </div>
        </form>
      </div>
    </PageShell>
  );
}

/* ─── RESULT SCREEN ─── */
function ResultScreen({
  finalResult,
  excelUrl,
  onNewValuation,
}: {
  finalResult: FinalResult;
  excelUrl: string;
  onNewValuation: () => void;
}) {
  const adj = finalResult.totalAdjustment;
  const adjSign = adj >= 0 ? '+' : '';

  return (
    <PageShell>
      <style>{`
        .result-inner {
          max-width: 560px;
          margin: 0 auto;
          text-align: center;
          animation: fadeUp 0.7s ease both;
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .result-icon {
          width: 4rem;
          height: 4rem;
          border-radius: 50%;
          background: ${tokens.ink};
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1.5rem;
          color: ${tokens.gold};
          font-size: 1.6rem;
        }
        .result-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(1.8rem, 4vw, 2.4rem);
          font-weight: 300;
          color: ${tokens.ink};
          margin-bottom: 0.5rem;
          line-height: 1.15;
        }
        .result-title em { font-style: italic; color: ${tokens.goldDark}; }
        .result-subtitle {
          font-size: 0.88rem;
          color: ${tokens.muted};
          margin-bottom: 2.5rem;
        }
        .value-card {
          background: ${tokens.ink};
          border-radius: 12px;
          padding: 2rem;
          margin-bottom: 1.5rem;
          position: relative;
          overflow: hidden;
        }
        .value-card::before {
          content: '';
          position: absolute;
          top: -40%;
          right: -20%;
          width: 60%;
          height: 160%;
          background: radial-gradient(circle, ${tokens.gold}18 0%, transparent 70%);
          pointer-events: none;
        }
        .value-base-label {
          font-family: 'DM Mono', monospace;
          font-size: 0.6rem;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: ${tokens.muted};
          margin-bottom: 0.25rem;
        }
        .value-base {
          font-size: 1rem;
          color: ${tokens.muted};
          text-decoration: line-through;
          margin-bottom: 1.25rem;
        }
        .value-details {
          text-align: left;
          margin-bottom: 1.25rem;
        }
        .value-detail-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.3rem 0;
          border-bottom: 1px solid ${tokens.inkSoft};
          font-size: 0.82rem;
          color: #A0A8BC;
          font-family: 'Outfit', sans-serif;
        }
        .value-detail-pos { color: #6EE7B7; }
        .value-detail-neg { color: #FCA5A5; }
        .value-final-label {
          font-family: 'DM Mono', monospace;
          font-size: 0.62rem;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: ${tokens.gold};
          margin-bottom: 0.4rem;
        }
        .value-final {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(2.2rem, 6vw, 3rem);
          font-weight: 500;
          color: white;
          letter-spacing: -0.01em;
        }
        .value-adj {
          font-size: 0.82rem;
          color: ${adj >= 0 ? '#6EE7B7' : '#FCA5A5'};
          margin-top: 0.25rem;
          font-family: 'DM Mono', monospace;
          font-size: 0.7rem;
          letter-spacing: 0.05em;
        }
        .dl-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.6rem;
          padding: 0.9rem 2rem;
          background: ${tokens.gold};
          color: ${tokens.ink};
          border-radius: 6px;
          font-family: 'DM Mono', monospace;
          font-size: 0.72rem;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          text-decoration: none;
          font-weight: 600;
          transition: background 0.2s, transform 0.15s;
          margin-bottom: 1rem;
        }
        .dl-btn:hover {
          background: ${tokens.goldLight};
          transform: translateY(-1px);
        }
        .new-val-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.7rem 1.5rem;
          background: transparent;
          color: ${tokens.muted};
          border: 1px solid #DDD7CC;
          border-radius: 6px;
          font-family: 'DM Mono', monospace;
          font-size: 0.68rem;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          cursor: pointer;
          transition: border-color 0.2s, color 0.2s;
        }
        .new-val-btn:hover { border-color: ${tokens.ink}; color: ${tokens.ink}; }
        .actions { display: flex; flex-direction: column; align-items: center; gap: 0.75rem; }
      `}</style>

      <div className="result-inner">
        <div className="result-icon">✓</div>
        <h2 className="result-title">
          Valutazione<br /><em>completata</em>
        </h2>
        <p className="result-subtitle">
          Ti abbiamo inviato il report completo via email.
        </p>

        <div className="value-card">
          <p className="value-base-label">Valore base</p>
          <p className="value-base">€{finalResult.baseValue.toLocaleString('it-IT')}</p>

          {finalResult.details && finalResult.details.length > 0 && (
            <div className="value-details">
              {finalResult.details.map((d, i) => (
                <div key={i} className="value-detail-row">
                  <span>{d}</span>
                </div>
              ))}
            </div>
          )}

          <p className="value-final-label">Valore stimato</p>
          <p className="value-final">€{finalResult.finalValue.toLocaleString('it-IT')}</p>
          {adj !== 0 && (
            <p className="value-adj">
              Aggiustamento: {adjSign}€{Math.abs(adj).toLocaleString('it-IT')}
            </p>
          )}
        </div>

        <div className="actions">
          <a href={excelUrl} download className="dl-btn">
            ↓ Scarica report Excel
          </a>
          <button className="new-val-btn" onClick={onNewValuation}>
            ← Nuova valutazione
          </button>
        </div>
      </div>
    </PageShell>
  );
}