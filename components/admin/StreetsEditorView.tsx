'use client';

import { useRef } from 'react';
import StreetAutocomplete from './StreetAutocomplete';
import type { StreetRow, CivicRow, StreetRename } from '@/lib/street-rename';
import type { OfficialImportResult } from '@/lib/street-import';

/** Esito della verifica di una via su Google */
export interface VerifyResult {
  street: string;
  status: 'ok' | 'rename' | 'not_found' | 'error';
  /** Nome Google (minuscolo) proposto quando status = 'rename' */
  suggestion?: string;
  /** Match approssimato di Google: da ricontrollare prima di applicare */
  partial?: boolean;
  /** Rinomina bloccata perché il nome Google è già in lista */
  conflict?: boolean;
}

export interface VerifyProgress {
  done: number;
  total: number;
}

// Oltre questo numero di civici renderizzati si chiede di filtrare: un comune con i civici espansi ne ha ~2500
const MAX_CIVICS_SHOWN = 300;

interface CivicGroup {
  street: string;
  items: { row: CivicRow; i: number }[];
  /** Civici della via non renderizzati perché oltre MAX_CIVICS_SHOWN */
  hidden: number;
}

/** Civici filtrati e raggruppati per via (ordine alfabetico); gli indici restano quelli dell'array originale. */
function groupCivics(civicRows: CivicRow[], matches: (street: string) => boolean): { civicGroups: CivicGroup[]; visibleCivicCount: number } {
  const byStreet = new Map<string, { row: CivicRow; i: number }[]>();
  civicRows.forEach((row, i) => {
    if (!matches(row.street)) return;
    const key = row.street.trim().toLowerCase();
    if (!byStreet.has(key)) byStreet.set(key, []);
    byStreet.get(key)!.push({ row, i });
  });
  const civicGroups: CivicGroup[] = [];
  let shown = 0;
  let visibleCivicCount = 0;
  for (const [street, all] of [...byStreet.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const items = all.slice(0, Math.max(0, MAX_CIVICS_SHOWN - shown));
    shown += items.length;
    visibleCivicCount += all.length;
    civicGroups.push({ street, items, hidden: all.length - items.length });
  }
  return { civicGroups, visibleCivicCount };
}

interface NewCivicForm {
  street: string;
  civic: string;
  price: number;
}

export interface StreetsEditorViewProps {
  city: string;
  cities: string[];
  rows: StreetRow[];
  civicRows: CivicRow[];
  loading: boolean;
  saving: boolean;
  message: string;
  importMsg: string;
  showNewCivic: boolean;
  newCivic: NewCivicForm;
  streetNames: string[];
  cityName: string;
  showNewStreet: boolean;
  newStreet: { street: string; price: number };
  newStreetMsg: string;
  verifyProgress: VerifyProgress | null;
  verifyResults: VerifyResult[] | null;
  verifyMsg: string;
  onCityChange: (city: string) => void;
  onRowChange: (index: number, field: 'key' | 'value', value: string | number) => void;
  onDeleteRow: (index: number) => void;
  onAddRow: () => void;
  onShowNewStreet: (show: boolean) => void;
  onNewStreetChange: (value: { street: string; price: number }) => void;
  onAddStreet: () => void;
  onVerify: () => void;
  onApplyRenames: (renames: StreetRename[]) => void;
  onCloseVerify: () => void;
  officialBusy: 'import' | 'expand' | null;
  importPreview: OfficialImportResult | null;
  officialMsg: string;
  filter: string;
  onOfficialImport: () => void;
  onApplyImport: () => void;
  onCancelImport: () => void;
  onExpandCivics: () => void;
  onFilterChange: (value: string) => void;
  onAddCivic: () => void;
  onCivicRowChange: (index: number, field: keyof CivicRow, value: string | number) => void;
  onDeleteCivic: (index: number) => void;
  onNewCivicChange: (form: NewCivicForm) => void;
  onShowNewCivic: (show: boolean) => void;
  onSave: () => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDownloadTemplate: () => void;
}

export function StreetsEditorView({
  city,
  cities,
  rows,
  civicRows,
  loading,
  saving,
  message,
  importMsg,
  showNewCivic,
  newCivic,
  streetNames,
  cityName,
  showNewStreet,
  newStreet,
  newStreetMsg,
  verifyProgress,
  verifyResults,
  verifyMsg,
  onCityChange,
  onRowChange,
  onDeleteRow,
  onAddRow,
  onShowNewStreet,
  onNewStreetChange,
  onAddStreet,
  onVerify,
  onApplyRenames,
  onCloseVerify,
  officialBusy,
  importPreview,
  officialMsg,
  filter,
  onOfficialImport,
  onApplyImport,
  onCancelImport,
  onExpandCivics,
  onFilterChange,
  onAddCivic,
  onCivicRowChange,
  onDeleteCivic,
  onNewCivicChange,
  onShowNewCivic,
  onSave,
  onImport,
  onDownloadTemplate,
}: StreetsEditorViewProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const renames = verifyResults?.filter((r) => r.status === 'rename' && !r.conflict) ?? [];
  const toRename = (r: VerifyResult): StreetRename => ({ from: r.street, to: r.suggestion! });
  const notFound = verifyResults?.filter((r) => r.status === 'not_found' || r.status === 'error').length ?? 0;

  // Filtro testuale su entrambe le tabelle; gli indici restano quelli degli array originali per gli handler
  const filterText = filter.trim().toLowerCase();
  const matches = (street: string) => !filterText || street.toLowerCase().includes(filterText);
  const visibleRows = rows.map((row, i) => ({ row, i })).filter(({ row }) => !row.key || matches(row.key));
  const { civicGroups, visibleCivicCount } = groupCivics(civicRows, matches);

  return (
    <div className="space-y-6">
      {/* City selector */}
      <div className="bg-zinc-800 rounded-2xl border border-zinc-700 p-6">
        <label className="block text-sm font-semibold text-zinc-300 mb-2">Comune</label>
        <select
          value={city}
          onChange={(e) => onCityChange(e.target.value)}
          className="w-full px-3 py-2 bg-zinc-700 border border-zinc-700 text-zinc-200 rounded-lg focus:ring-2 focus:ring-red-700 focus:outline-none"
        >
          {cities.map(c => {
            const slug = c.toLowerCase().replace(/\s+/g, '-');
            return <option key={slug} value={slug}>{c}</option>;
          })}
        </select>
      </div>

      {/* Import/Export */}
      <div className="bg-zinc-800 rounded-2xl border border-zinc-700 p-6 space-y-3">
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={onDownloadTemplate}
            className="px-4 py-2 bg-indigo-700 text-white rounded-lg hover:bg-indigo-600 transition font-semibold text-sm"
          >
            📥 Scarica template
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-teal-700 text-white rounded-lg hover:bg-teal-600 transition font-semibold text-sm"
          >
            📤 Importa da Excel
          </button>
          <input ref={fileInputRef} type="file" accept=".xlsx" className="hidden" onChange={onImport} />
        </div>
        {importMsg && (
          <p className={`text-sm font-semibold ${importMsg.startsWith('✅') ? 'text-green-400' : importMsg.startsWith('⏳') ? 'text-blue-400' : 'text-red-400'}`}>
            {importMsg}
          </p>
        )}
      </div>

      {/* Vie ufficiali ANNCSU + Google */}
      <div className="bg-zinc-800 rounded-2xl border border-zinc-700 p-6 space-y-3">
        <div>
          <h2 className="text-lg font-bold text-zinc-200">Vie e civici ufficiali</h2>
          <p className="text-xs text-zinc-500 mt-1">
            Da ANNCSU (Agenzia Entrate / Istat), con i nomi allineati a Google Maps. Le modifiche restano in bozza fino al salvataggio.
          </p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={onOfficialImport}
            disabled={officialBusy !== null || loading}
            className="px-4 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50 transition font-semibold text-sm"
            title="Sostituisce la lista vie con tutte le vie ufficiali del comune (anteprima prima di applicare)"
          >
            {officialBusy === 'import' ? '⏳ Carico le vie…' : '📥 Importa tutte le vie'}
          </button>
          <button
            onClick={onExpandCivics}
            disabled={officialBusy !== null || loading || rows.length === 0}
            className="px-4 py-2 bg-purple-700 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 transition font-semibold text-sm"
            title="Aggiunge a ogni via tutti i civici ufficiali mancanti, con il prezzo €/mq della via"
          >
            {officialBusy === 'expand' ? '⏳ Espando i civici…' : '🏠 Espandi civici'}
          </button>
        </div>
        {officialMsg && (
          <p className={`text-sm font-semibold ${officialMsg.startsWith('✅') ? 'text-green-400' : officialMsg.startsWith('❌') ? 'text-red-400' : 'text-zinc-400'}`}>
            {officialMsg}
          </p>
        )}
        {importPreview && (
          <div className="p-4 bg-zinc-900/60 rounded-xl border border-emerald-800/60 space-y-3 text-sm">
            <p className="font-semibold text-zinc-200">
              Anteprima: {importPreview.streetRows.length} vie ufficiali
            </p>
            <ul className="text-zinc-400 space-y-1">
              <li>➕ {importPreview.added.length} nuove (prezzo di default del comune)</li>
              <li>✏️ {importPreview.renamed.length} rinominate col nome Google (prezzo mantenuto, civici inclusi)</li>
              <li>✔️ {importPreview.kept.length} già presenti con lo stesso nome</li>
              <li>🗑️ {importPreview.removed.length} vie in lista che non esistono tra quelle ufficiali: verranno rimosse con i loro civici</li>
              <li>⚠️ {importPreview.unconfirmed.length} senza conferma da Google (useranno il nome ANNCSU)</li>
            </ul>
            {importPreview.removed.length > 0 && (
              <details>
                <summary className="cursor-pointer text-xs text-zinc-400">Vie da rimuovere</summary>
                <p className="mt-1 text-xs font-mono text-red-300">{importPreview.removed.join(' · ')}</p>
              </details>
            )}
            {importPreview.unconfirmed.length > 0 && (
              <details>
                <summary className="cursor-pointer text-xs text-zinc-400">Vie senza conferma Google</summary>
                <ul className="mt-1 text-xs font-mono text-amber-300 space-y-0.5">
                  {importPreview.unconfirmed.map((u) => (
                    <li key={u.name}>{u.name}{u.suggestion && <span className="text-zinc-500"> (Google propone: {u.suggestion})</span>}</li>
                  ))}
                </ul>
              </details>
            )}
            <div className="flex gap-2">
              <button onClick={onApplyImport} className="px-4 py-1.5 bg-emerald-700 text-white rounded-lg hover:bg-emerald-600 transition text-sm font-semibold">
                Applica
              </button>
              <button onClick={onCancelImport} className="px-4 py-1.5 bg-zinc-700 text-zinc-300 rounded-lg hover:bg-zinc-600 transition text-sm">
                Annulla
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Filtro */}
      <input
        type="search"
        value={filter}
        onChange={(e) => onFilterChange(e.target.value)}
        placeholder="🔍 Filtra vie e civici per nome della via…"
        className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 text-zinc-200 rounded-xl focus:ring-2 focus:ring-red-700 focus:outline-none text-sm"
      />

      {/* Prezzi per via */}
      <div className="bg-zinc-800 rounded-2xl border border-zinc-700 p-6">
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <h2 className="text-lg font-bold text-zinc-200">Prezzi per via</h2>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={onVerify}
              disabled={verifyProgress !== null || loading}
              className="px-3 py-1.5 bg-amber-700 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 transition text-sm font-semibold"
              title="Confronta i nomi in lista con quelli ufficiali di Google Maps"
            >
              {verifyProgress ? `🔎 Verifica ${verifyProgress.done}/${verifyProgress.total}…` : '🔎 Verifica con Google'}
            </button>
            <button onClick={() => onShowNewStreet(true)} className="px-3 py-1.5 bg-blue-700 text-white rounded-lg hover:bg-blue-600 transition text-sm font-semibold">
              + Aggiungi via
            </button>
            <button
              onClick={onAddRow}
              className="px-3 py-1.5 bg-zinc-700 text-zinc-300 rounded-lg hover:bg-zinc-600 transition text-sm"
              title="Riga vuota da compilare a mano (per vie che Google non conosce)"
            >
              + a mano
            </button>
          </div>
        </div>

        {showNewStreet && (
          <div className="mb-4 p-4 bg-zinc-700/50 rounded-xl border border-zinc-600 space-y-3">
            <p className="text-sm font-semibold text-zinc-300">Nuova via da Google Maps</p>
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_9rem] gap-3">
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Via ({cityName})</label>
                <StreetAutocomplete city={cityName} onSelect={(street) => onNewStreetChange({ ...newStreet, street })} />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Prezzo €/mq</label>
                <input
                  type="number"
                  value={newStreet.price || ''}
                  onChange={(e) => onNewStreetChange({ ...newStreet, price: parseFloat(e.target.value) || 0 })}
                  placeholder="es. 2000"
                  className="w-full px-2 py-1.5 bg-zinc-700 border border-zinc-600 text-zinc-200 rounded text-right focus:ring-1 focus:ring-blue-600 focus:outline-none text-sm"
                  step={50} min={100}
                />
              </div>
            </div>
            {newStreet.street && (
              <p className="text-xs text-zinc-400">Verrà salvata come <span className="font-mono text-zinc-200">{newStreet.street}</span></p>
            )}
            {newStreetMsg && <p className="text-xs text-red-400">{newStreetMsg}</p>}
            <div className="flex gap-2">
              <button onClick={onAddStreet} className="px-4 py-1.5 bg-blue-700 text-white rounded-lg hover:bg-blue-600 transition text-sm font-semibold">
                Aggiungi
              </button>
              <button onClick={() => onShowNewStreet(false)} className="px-4 py-1.5 bg-zinc-700 text-zinc-300 rounded-lg hover:bg-zinc-600 transition text-sm">
                Annulla
              </button>
            </div>
          </div>
        )}

        {(verifyResults || verifyMsg) && (
          <div className="mb-4 p-4 bg-zinc-900/60 rounded-xl border border-amber-800/60 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-zinc-200">
                Verifica con Google
                {verifyResults && (
                  <span className="ml-2 font-normal text-zinc-400">
                    {verifyResults.filter((r) => r.status === 'ok').length} coincidono · {renames.length} da rinominare · {notFound} non trovate
                  </span>
                )}
              </p>
              <div className="flex gap-2">
                {renames.length > 1 && (
                  <button
                    onClick={() => onApplyRenames(renames.map(toRename))}
                    className="px-3 py-1 bg-amber-700 text-white rounded-lg hover:bg-amber-600 transition text-xs font-semibold"
                  >
                    Applica tutte
                  </button>
                )}
                <button onClick={onCloseVerify} className="text-zinc-500 hover:text-zinc-300 transition text-sm" title="Chiudi">✕</button>
              </div>
            </div>
            {verifyMsg && (
              <p className={`text-xs font-semibold ${verifyMsg.startsWith('✅') ? 'text-green-400' : verifyMsg.startsWith('⚠️') ? 'text-amber-400' : 'text-red-400'}`}>
                {verifyMsg}
              </p>
            )}
            {verifyResults?.some((r) => r.status !== 'ok') && (
              <ul className="space-y-1.5 text-sm">
                {verifyResults.filter((r) => r.status !== 'ok').map((r) => (
                  <li key={r.street} className="flex items-center justify-between gap-3 py-1 border-b border-zinc-800 last:border-0">
                    {r.status === 'rename' ? (
                      <>
                        <span className="text-zinc-300">
                          ✏️ <span className="font-mono">{r.street}</span> → <span className="font-mono text-amber-300">{r.suggestion}</span>
                          {r.partial && <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-zinc-700 text-zinc-300">da verificare</span>}
                          {r.conflict && <span className="ml-2 text-xs text-red-400">già in lista</span>}
                        </span>
                        {!r.conflict && (
                          <button
                            onClick={() => onApplyRenames([toRename(r)])}
                            className="px-2 py-0.5 bg-zinc-700 text-zinc-200 rounded hover:bg-zinc-600 transition text-xs"
                          >
                            Applica
                          </button>
                        )}
                      </>
                    ) : (
                      <span className="text-zinc-400">
                        ⚠️ <span className="font-mono">{r.street}</span>{' '}
                        {r.status === 'error' ? '— errore Google, riprova' : '— non trovata su Google, controlla a mano'}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        {loading ? (
          <p className="text-zinc-500 text-center py-8">Caricamento...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-700">
                  <th className="text-left py-2 px-3 text-zinc-400 font-semibold">Via</th>
                  <th className="text-right py-2 px-3 text-zinc-400 font-semibold">€/mq</th>
                  <th className="w-12"></th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map(({ row, i }) => (
                  <tr key={i} className="border-b border-zinc-700 hover:bg-zinc-700">
                    <td className="py-1.5 px-3">
                      <input
                        type="text"
                        value={row.key}
                        onChange={(e) => onRowChange(i, 'key', e.target.value)}
                        className="w-full px-2 py-1 bg-zinc-700 border border-zinc-700 text-zinc-200 rounded focus:ring-1 focus:ring-red-700 focus:outline-none"
                      />
                    </td>
                    <td className="py-1.5 px-3">
                      <input
                        type="number"
                        value={row.value}
                        onChange={(e) => onRowChange(i, 'value', parseFloat(e.target.value) || 0)}
                        className="w-28 px-2 py-1 bg-zinc-700 border border-zinc-700 text-zinc-200 rounded text-right focus:ring-1 focus:ring-red-700 focus:outline-none"
                        step={50} min={100}
                      />
                    </td>
                    <td className="py-1.5 px-3 text-center">
                      <button onClick={() => onDeleteRow(i)} className="text-red-500 hover:text-red-300 transition" title="Elimina">✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Prezzi per civico */}
      <div className="bg-zinc-800 rounded-2xl border border-zinc-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-zinc-200">Prezzi per civico</h2>
          <button
            onClick={() => onShowNewCivic(true)}
            className="px-3 py-1.5 bg-purple-700 text-white rounded-lg hover:bg-purple-600 transition text-sm font-semibold"
          >
            + Aggiungi prezzo civico
          </button>
        </div>

        {civicRows.length === 0 && !showNewCivic ? (
          <p className="text-zinc-500 text-sm">Nessun prezzo civico</p>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-zinc-500">
              {civicRows.length} civici su {civicGroups.length} vie{filterText && ` · ${visibleCivicCount} corrispondono al filtro`}
            </p>
            {civicGroups.map(({ street, items, hidden }) => (
              <details key={street} className="rounded-lg border border-zinc-700 bg-zinc-800/60" open={!!filterText}>
                <summary className="cursor-pointer select-none px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700/60">
                  <span className="font-mono">{street}</span>
                  <span className="ml-2 text-xs text-zinc-500">{items.length + hidden} civici</span>
                </summary>
                <table className="w-full text-sm">
                  <tbody>
                    {items.map(({ row, i }) => (
                      <tr key={i} className="border-t border-zinc-700 hover:bg-zinc-700">
                        <td className="py-1 px-3 w-24">
                          <input
                            type="text"
                            value={row.civic}
                            onChange={(e) => onCivicRowChange(i, 'civic', e.target.value)}
                            className="w-20 px-2 py-1 bg-zinc-700 border border-zinc-700 text-zinc-200 rounded focus:ring-1 focus:ring-purple-600 focus:outline-none text-sm"
                            aria-label={`Civico di ${street}`}
                          />
                        </td>
                        <td className="py-1 px-3">
                          <input
                            type="number"
                            value={row.price}
                            onChange={(e) => onCivicRowChange(i, 'price', parseFloat(e.target.value) || 0)}
                            className="w-28 px-2 py-1 bg-zinc-700 border border-zinc-700 text-zinc-200 rounded text-right focus:ring-1 focus:ring-purple-600 focus:outline-none text-sm"
                            step={50} min={100}
                            aria-label={`€/mq ${street} ${row.civic}`}
                          />
                          <span className="ml-1 text-xs text-zinc-500">€/mq</span>
                        </td>
                        <td className="py-1 px-3 text-right w-12">
                          <button onClick={() => onDeleteCivic(i)} className="text-red-500 hover:text-red-300 transition" title="Elimina">✕</button>
                        </td>
                      </tr>
                    ))}
                    {hidden > 0 && (
                      <tr className="border-t border-zinc-700">
                        <td colSpan={3} className="py-1.5 px-3 text-xs text-zinc-500">
                          Altri {hidden} civici non mostrati: filtra per il nome della via per modificarli
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </details>
            ))}
          </div>
        )}

        {showNewCivic && (
          <div className="mt-4 p-4 bg-zinc-700 rounded-xl border border-zinc-700 space-y-3">
            <p className="text-sm font-semibold text-zinc-300">Nuovo prezzo civico</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Via</label>
                <select
                  value={newCivic.street}
                  onChange={(e) => onNewCivicChange({ ...newCivic, street: e.target.value })}
                  className="w-full px-2 py-1.5 bg-zinc-700 border border-zinc-700 text-zinc-200 rounded focus:ring-1 focus:ring-purple-600 focus:outline-none text-sm"
                >
                  {streetNames.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Civico</label>
                <input
                  type="text"
                  value={newCivic.civic}
                  onChange={(e) => onNewCivicChange({ ...newCivic, civic: e.target.value })}
                  placeholder="es. 15"
                  className="w-full px-2 py-1.5 bg-zinc-700 border border-zinc-700 text-zinc-200 rounded focus:ring-1 focus:ring-purple-600 focus:outline-none text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Prezzo €/mq</label>
                <input
                  type="number"
                  value={newCivic.price || ''}
                  onChange={(e) => onNewCivicChange({ ...newCivic, price: parseFloat(e.target.value) || 0 })}
                  placeholder="es. 2100"
                  className="w-full px-2 py-1.5 bg-zinc-700 border border-zinc-700 text-zinc-200 rounded focus:ring-1 focus:ring-purple-600 focus:outline-none text-sm"
                  step={50} min={100}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={onAddCivic} className="px-4 py-1.5 bg-purple-700 text-white rounded-lg hover:bg-purple-600 transition text-sm font-semibold">
                Aggiungi
              </button>
              <button onClick={() => onShowNewCivic(false)} className="px-4 py-1.5 bg-zinc-700 text-zinc-300 rounded-lg hover:bg-zinc-600 transition text-sm">
                Annulla
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Save */}
      <div className="bg-zinc-800 rounded-2xl border border-zinc-700 p-6">
        <button
          onClick={onSave}
          disabled={saving}
          className="w-full bg-gradient-to-r from-green-700 to-green-600 text-white font-bold py-4 px-6 rounded-xl hover:from-green-600 hover:to-green-500 disabled:opacity-50 transition"
        >
          {saving ? '💾 Salvataggio...' : '💾 Salva prezzi strade'}
        </button>
        {message && (
          <p className={`mt-3 text-center font-semibold ${message.startsWith('✅') ? 'text-green-400' : 'text-red-400'}`}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
