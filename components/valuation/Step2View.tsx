'use client';

import { UseFormReturn } from 'react-hook-form';
import ReCAPTCHA from 'react-google-recaptcha';
import {
  PageShell,
  PageHeader,
  Stepper,
  VLCard,
  FieldGroup,
  PrimaryButton,
  GhostButton,
  tokens,
} from '@/components/valuation/shared';
import type {
  StatoCoefficientKey,
  ClasseEnergeticaKey,
  AnnoCostKey,
  AscensoreKey,
  TerrazzoKey,
  GiardinoKey,
  GarageKey,
  CantinaKey,
  RiscaldamentoKey,
} from '@/lib/config';
import {
  TIPOLOGIA_LABELS,
  PIANO_LABELS,
  LOCALI_LABELS,
  BAGNI_LABELS,
} from '@/lib/labels';

export interface Step2FormValues {
  stato: StatoCoefficientKey;
  classeEnergetica: ClasseEnergeticaKey;
  annoCostruzione: AnnoCostKey;
  ascensore: AscensoreKey;
  terrazzo: TerrazzoKey;
  giardino: GiardinoKey;
  garage: GarageKey;
  cantina: CantinaKey;
  riscaldamento: RiscaldamentoKey;
  notes?: string;
}

interface Form1Data {
  firstName: string;
  lastName: string;
  email: string;
  address: string;
  squareMeters: number;
  tipologia?: string;
  piano?: string;
  locali?: string;
  bagni?: string;
}

interface CalcResult {
  estimatedValue: number;
}

interface FinalResult {
  baseValue: number;
  finalValue: number;
  totalAdjustment?: number;
  details?: Array<string | { label: string; coefficiente: number }>;
}

interface Step2ViewProps {
  form: UseFormReturn<Step2FormValues>;
  form1Data: Form1Data;
  calculationResult: CalcResult;
  isLoading: boolean;
  finalResult: FinalResult | null;
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
  onSubmit,
  onBack,
  onRecaptchaChange,
  onNewValuation,
}: Step2ViewProps) {
  const { register, formState: { errors } } = form;

  if (finalResult) {
    return <ResultScreen finalResult={finalResult} onNewValuation={onNewValuation} />;
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
            <div style={{ gridColumn: '1/-1' }}>
              <p className="summary-item-label">Indirizzo</p>
              <p className="summary-item-value">{form1Data.address}</p>
            </div>
            {form1Data.tipologia && (
              <div>
                <p className="summary-item-label">Tipologia</p>
                <p className="summary-item-value">{TIPOLOGIA_LABELS[form1Data.tipologia] ?? '—'}</p>
              </div>
            )}
            {form1Data.piano && (
              <div>
                <p className="summary-item-label">Piano</p>
                <p className="summary-item-value">{PIANO_LABELS[form1Data.piano] ?? '—'}</p>
              </div>
            )}
            {form1Data.locali && (
              <div>
                <p className="summary-item-label">Locali</p>
                <p className="summary-item-value">{LOCALI_LABELS[form1Data.locali] ?? '—'}</p>
              </div>
            )}
            {form1Data.bagni && (
              <div>
                <p className="summary-item-label">Bagni</p>
                <p className="summary-item-value">{BAGNI_LABELS[form1Data.bagni] ?? '—'}</p>
              </div>
            )}
            <div className="summary-estimate">
              <span className="estimate-label">Stima base</span>
              <span className="estimate-value">
                €{calculationResult.estimatedValue.toLocaleString('it-IT')}
              </span>
            </div>
          </div>
        </VLCard>

        <form onSubmit={onSubmit}>
          {/* Stato e anno */}
          <VLCard>
            <p className="section-title">Condizioni immobile</p>
            <div className="form-fields">
              <div className="two-col">
                <FieldGroup label="Stato immobile" error={errors.stato?.message}>
                  <select className="vl-select" {...register('stato')}>
                    <option value="daRistrutturare">Da ristrutturare</option>
                    <option value="daRiattare">Da riattare</option>
                    <option value="abitabile">Abitabile</option>
                    <option value="buono">Buono</option>
                    <option value="ottimo">Ottimo</option>
                    <option value="ristrutturato">Ristrutturato</option>
                    <option value="nuovo">Nuovo</option>
                  </select>
                </FieldGroup>
                <FieldGroup label="Anno di costruzione" error={errors.annoCostruzione?.message}>
                  <select className="vl-select" {...register('annoCostruzione')}>
                    <option value="prima1945">Prima del 1945</option>
                    <option value="dal1945al1960">1945–1960</option>
                    <option value="dal1961al1980">1961–1980</option>
                    <option value="dal1981al2000">1981–2000</option>
                    <option value="dal2001al2010">2001–2010</option>
                    <option value="dal2011al2020">2011–2020</option>
                    <option value="dal2021inPoi">2021 o successivo</option>
                  </select>
                </FieldGroup>
              </div>
              <FieldGroup label="Classe energetica" error={errors.classeEnergetica?.message}>
                <select className="vl-select" {...register('classeEnergetica')}>
                  {(['G','F','E','D','C','B','A1','A2','A3','A4'] as const).map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </FieldGroup>
            </div>
          </VLCard>

          {/* Dotazioni */}
          <VLCard>
            <p className="section-title">Dotazioni</p>
            <div className="form-fields">
              <div className="two-col">
                <FieldGroup label="Ascensore" error={errors.ascensore?.message}>
                  <select className="vl-select" {...register('ascensore')}>
                    <option value="no">No</option>
                    <option value="si">Sì</option>
                  </select>
                </FieldGroup>
                <FieldGroup label="Cantina" error={errors.cantina?.message}>
                  <select className="vl-select" {...register('cantina')}>
                    <option value="no">No</option>
                    <option value="si">Sì</option>
                  </select>
                </FieldGroup>
              </div>
              <div className="two-col">
                <FieldGroup label="Terrazzo / Balcone" error={errors.terrazzo?.message}>
                  <select className="vl-select" {...register('terrazzo')}>
                    <option value="nessuno">Nessuno</option>
                    <option value="balcone">Balcone</option>
                    <option value="balconiMultipli">Balconi multipli</option>
                    <option value="terrazzoAbitabile">Terrazzo abitabile</option>
                    <option value="terrazzoPanoramico">Terrazzo panoramico</option>
                  </select>
                </FieldGroup>
                <FieldGroup label="Giardino" error={errors.giardino?.message}>
                  <select className="vl-select" {...register('giardino')}>
                    <option value="nessuno">Nessuno</option>
                    <option value="piccolo">Piccolo (&lt;50 mq)</option>
                    <option value="medio">Medio (50–150 mq)</option>
                    <option value="grande">Grande (&gt;150 mq)</option>
                    <option value="importante">Giardino importante</option>
                  </select>
                </FieldGroup>
              </div>
              <div className="two-col">
                <FieldGroup label="Garage / Box" error={errors.garage?.message}>
                  <select className="vl-select" {...register('garage')}>
                    <option value="nessuno">Nessuno</option>
                    <option value="postoScoperto">Posto auto scoperto</option>
                    <option value="postoCoperto">Posto auto coperto</option>
                    <option value="boxSingolo">Box singolo</option>
                    <option value="boxDoppio">Box doppio</option>
                  </select>
                </FieldGroup>
                <FieldGroup label="Riscaldamento" error={errors.riscaldamento?.message}>
                  <select className="vl-select" {...register('riscaldamento')}>
                    <option value="assente">Assente</option>
                    <option value="centralizzatoVecchio">Centralizzato (vecchio)</option>
                    <option value="centralizzatoContabilizzato">Centralizzato contabilizzato</option>
                    <option value="autonomo">Autonomo</option>
                    <option value="autonomoCondensazione">Autonomo a condensazione</option>
                    <option value="pompaDiCalore">Pompa di calore</option>
                    <option value="impiantoRadiante">Impianto radiante/evoluto</option>
                  </select>
                </FieldGroup>
              </div>
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
                maxLength={500}
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
  onNewValuation,
}: {
  finalResult: FinalResult;
  onNewValuation: () => void;
}) {
  const adj = finalResult.totalAdjustment ?? 0;
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
          font-size: 0.7rem;
          color: ${adj >= 0 ? '#6EE7B7' : '#FCA5A5'};
          margin-top: 0.25rem;
          font-family: 'DM Mono', monospace;
          letter-spacing: 0.05em;
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
          Ecco il riepilogo completo della tua valutazione.
        </p>

        <div className="value-card">
          <p className="value-base-label">Valore base</p>
          <p className="value-base">€{finalResult.baseValue.toLocaleString('it-IT')}</p>

          {finalResult.details && finalResult.details.length > 0 && (
            <div className="value-details">
              {finalResult.details.map((d, i) => (
                <div key={i} className="value-detail-row">
                  {typeof d === 'string' ? (
                    <span>{d}</span>
                  ) : (
                    <>
                      <span>{d.label}</span>
                      <span>×{d.coefficiente.toFixed(2)}</span>
                    </>
                  )}
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
          <button className="new-val-btn" onClick={onNewValuation}>
            ← Nuova valutazione
          </button>
        </div>
      </div>
    </PageShell>
  );
}
