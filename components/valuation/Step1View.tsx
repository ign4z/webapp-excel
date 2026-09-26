'use client';

import { UseFormReturn, useWatch } from 'react-hook-form';
import ReCAPTCHA from 'react-google-recaptcha';
import {
  PageShell,
  PageHeader,
  Stepper,
  VLCard,
  FieldGroup,
  PrimaryButton,
  tokens,
} from './shared';
import { ALLOWED_CITIES } from '@/lib/cities';
import type { StreetOption } from '@/lib/street-search';
import { StreetCombobox } from './StreetCombobox';
import type { TipologiaCoefficientKey, PianoKey, LocaliKey, BagniKey } from '@/lib/config';

/** Piano keys selectable in the form (excludes 'piano6Plus' which is a server-side aggregation key) */
export type PianoFormKey = Exclude<PianoKey, 'piano6Plus'>;

export interface Step1FormValues {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
  address: string;
  squareMeters: number;
  tipologia: TipologiaCoefficientKey;
  piano: PianoFormKey;
  locali: LocaliKey;
  bagni: BagniKey;
}

/** Stato del campo indirizzo (via + civico), gestito dal controller Form1 */
export interface AddressFieldProps {
  /** Vie del comune selezionato; vuota per le frazioni senza elenco (via scritta a mano) */
  streets: StreetOption[];
  status: 'idle' | 'loading' | 'ready' | 'error';
  streetText: string;
  selectedStreet: StreetOption | null;
  civic: string;
  civicError?: string;
  onStreetTextChange: (text: string) => void;
  onSelectStreet: (street: StreetOption) => void;
  onCivicChange: (civic: string) => void;
}

interface Step1ViewProps {
  form: UseFormReturn<Step1FormValues>;
  address: AddressFieldProps;
  isLoading: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onRecaptchaChange: (token: string | null) => void;
}

export function Step1View({
  form,
  address,
  isLoading,
  onSubmit,
  onRecaptchaChange,
}: Step1ViewProps) {
  const {
    register,
    control,
    formState: { errors },
  } = form;

  // useWatch (non watch()): con il React Compiler watch() non fa ri-renderizzare il componente
  const selectedCity = useWatch({ control, name: 'city' });

  return (
    <PageShell>
      <style>{`
        .page-inner { max-width: 640px; margin: 0 auto; }
        .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        @media (max-width: 480px) { .two-col { grid-template-columns: 1fr; } }
        .vl-select {
          width: 100%;
          background: ${tokens.paperDark};
          border: 1px solid ${tokens.border};
          border-radius: 6px;
          padding: 0.7rem 0.9rem;
          font-family: 'Outfit', sans-serif;
          font-size: 0.95rem;
          color: ${tokens.ink};
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23C41E3A' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 0.9rem center;
          cursor: pointer;
        }
        .vl-select:focus {
          border-color: ${tokens.gold};
          box-shadow: 0 0 0 3px ${tokens.gold}22;
        }
        .section-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 1rem;
          font-weight: 500;
          color: ${tokens.inkSoft};
          letter-spacing: 0.02em;
          margin-bottom: 1.2rem;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid ${tokens.border};
        }
        .form-fields { display: flex; flex-direction: column; gap: 1.1rem; }
        .recaptcha-wrap { display: flex; justify-content: center; margin: 0.5rem 0; }
        .address-hint {
          font-size: 0.75rem;
          color: ${tokens.muted};
          margin-top: 0.25rem;
          font-family: 'DM Mono', monospace;
          letter-spacing: 0.05em;
        }
        .street-row { display: grid; grid-template-columns: 1fr 7rem; gap: 0.75rem; align-items: start; }
        .address-summary {
          display: flex; gap: 0.5rem; align-items: baseline;
          padding: 0.65rem 0.85rem; border-radius: 6px;
          background: ${tokens.success}14; border: 1px solid ${tokens.success}40;
          font-size: 0.9rem; color: ${tokens.ink};
        }
        .address-summary-city { color: ${tokens.inkSoft}; }
      `}</style>

      <div className="page-inner">
        <PageHeader subtitle="Inserisci i dati dell'immobile per ricevere una stima preliminare" />
        <Stepper current={1} />

        <form onSubmit={onSubmit}>
          <VLCard>
            <p className="section-title">Dati personali</p>
            <div className="form-fields">
              <div className="two-col">
                <FieldGroup label="Nome" error={errors.firstName?.message}>
                  <input
                    className="vl-input"
                    placeholder="Mario"
                    {...register('firstName')}
                  />
                </FieldGroup>
                <FieldGroup label="Cognome" error={errors.lastName?.message}>
                  <input
                    className="vl-input"
                    placeholder="Rossi"
                    {...register('lastName')}
                  />
                </FieldGroup>
              </div>
              <FieldGroup label="Email" error={errors.email?.message}>
                <input
                  className="vl-input"
                  type="email"
                  placeholder="mario.rossi@email.it"
                  {...register('email')}
                />
              </FieldGroup>
              <FieldGroup label="Telefono" error={errors.phone?.message}>
                <input
                  className="vl-input"
                  type="tel"
                  placeholder="+39 333 1234567"
                  {...register('phone')}
                />
              </FieldGroup>
            </div>
          </VLCard>

          <VLCard accent>
            <p className="section-title">Dati immobile</p>
            <div className="form-fields">
              <FieldGroup label="Comune" error={errors.city?.message}>
                <select className="vl-select" {...register('city')}>
                  <option value="">Seleziona comune</option>
                  {ALLOWED_CITIES.map((city) => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </FieldGroup>

              <div className="street-row">
                <FieldGroup label="Via" error={errors.address?.message}>
                  {address.streets.length > 0 ? (
                    <StreetCombobox
                      streets={address.streets}
                      value={address.streetText}
                      city={selectedCity}
                      invalid={!!errors.address}
                      placeholder="Inizia a scrivere il nome della via…"
                      onTextChange={address.onStreetTextChange}
                      onSelect={address.onSelectStreet}
                    />
                  ) : (
                    <input
                      className="vl-input"
                      autoComplete="off"
                      disabled={!selectedCity || address.status === 'loading'}
                      placeholder={
                        !selectedCity ? 'Seleziona prima il comune'
                          : address.status === 'loading' ? 'Carico le vie…'
                            : 'Es. Via Roma'
                      }
                      value={address.streetText}
                      onChange={(e) => address.onStreetTextChange(e.target.value)}
                    />
                  )}
                </FieldGroup>
                <FieldGroup label="Civico" error={address.civicError}>
                  <input
                    className="vl-input"
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="Es. 15"
                    maxLength={10}
                    disabled={!selectedCity}
                    list={address.selectedStreet?.civici.length ? 'civici-suggeriti' : undefined}
                    value={address.civic}
                    onChange={(e) => address.onCivicChange(e.target.value)}
                  />
                  {address.selectedStreet && address.selectedStreet.civici.length > 0 && (
                    <datalist id="civici-suggeriti">
                      {address.selectedStreet.civici.map((c) => <option key={c} value={c} />)}
                    </datalist>
                  )}
                </FieldGroup>
              </div>
              {address.selectedStreet ? (
                <div className="address-summary" aria-live="polite">
                  <span>📍</span>
                  <span>
                    {address.selectedStreet.label}{address.civic.trim() && ` ${address.civic.trim()}`}
                    <span className="address-summary-city">, {selectedCity}</span>
                  </span>
                </div>
              ) : selectedCity && address.status === 'error' ? (
                <span className="address-hint">Elenco vie non disponibile: scrivi la via a mano</span>
              ) : selectedCity && address.streets.length > 0 ? (
                <span className="address-hint">Scegli la via dall&apos;elenco · il civico è facoltativo</span>
              ) : null}

              <FieldGroup label="Superficie (mq)" error={errors.squareMeters?.message}>
                <input
                  className="vl-input"
                  type="number"
                  min={10}
                  {...register('squareMeters', { valueAsNumber: true })}
                />
              </FieldGroup>

              <FieldGroup label="Tipologia immobile" error={errors.tipologia?.message}>
                <select className="vl-select" {...register('tipologia')}>
                  <option value="appartamento">Appartamento</option>
                  <option value="openspaceLoft">Open Space / Loft</option>
                  <option value="mansarda">Mansarda</option>
                  <option value="attico">Attico</option>
                  <option value="villettaSchiera">Villetta a schiera</option>
                  <option value="villa">Villa</option>
                  <option value="rusticoCasale">Rustico / Casale</option>
                  <option value="stabilePalazzo">Stabile / Palazzo</option>
                </select>
              </FieldGroup>

              <FieldGroup label="Piano" error={errors.piano?.message}>
                <select className="vl-select" {...register('piano')}>
                  <option value="interrato">Interrato</option>
                  <option value="seminterrato">Seminterrato</option>
                  <option value="pianoTerra">Piano Terra</option>
                  <option value="rialzato">Rialzato</option>
                  <option value="piano1">1° Piano</option>
                  <option value="piano2">2° Piano</option>
                  <option value="piano3">3° Piano</option>
                  <option value="piano4">4° Piano</option>
                  <option value="piano5">5° Piano</option>
                  <option value="piano6">6° Piano</option>
                  <option value="piano7">7° Piano</option>
                  <option value="piano8">8° Piano</option>
                  <option value="piano9">9° Piano</option>
                  <option value="piano10Plus">10° Piano o superiore</option>
                </select>
              </FieldGroup>

              <div className="two-col">
                <FieldGroup label="Numero locali" error={errors.locali?.message}>
                  <select className="vl-select" {...register('locali')}>
                    <option value="locale1">1 locale</option>
                    <option value="locali2">2 locali</option>
                    <option value="locali3">3 locali</option>
                    <option value="locali4">4 locali</option>
                    <option value="locali5">5 locali</option>
                    <option value="locali6">6 locali</option>
                    <option value="locali7Plus">7 o più locali</option>
                  </select>
                </FieldGroup>
                <FieldGroup label="Numero bagni" error={errors.bagni?.message}>
                  <select className="vl-select" {...register('bagni')}>
                    <option value="bagno1">1 bagno</option>
                    <option value="bagni2">2 bagni</option>
                    <option value="bagni3">3 bagni</option>
                    <option value="bagni4">4 bagni</option>
                    <option value="bagni5Plus">5 o più bagni</option>
                  </select>
                </FieldGroup>
              </div>
            </div>
          </VLCard>

          {process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY && (
            <div className="recaptcha-wrap">
              <ReCAPTCHA
                sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}
                onChange={onRecaptchaChange}
                onExpired={() => onRecaptchaChange(null)}
              />
            </div>
          )}

          <PrimaryButton disabled={isLoading}>
            {isLoading ? 'Elaborazione…' : 'Calcola valutazione →'}
          </PrimaryButton>
        </form>
      </div>
    </PageShell>
  );
}