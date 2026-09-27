'use client';

import { useRef } from 'react';
import { AlertTriangle, Download, Home, Import, Loader2, Pencil, Plus, Save, Search, Trash2, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { StatusMessage } from './StatusMessage';
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
      {/* Comune + import/export Excel */}
      <Card>
        <CardContent className="space-y-4">
          <div>
            <label htmlFor="streets-city" className="mb-1.5 block text-sm font-medium text-foreground">Comune</label>
            <select
              id="streets-city"
              value={city}
              onChange={(e) => onCityChange(e.target.value)}
              className={SELECT_CLASS}
            >
              {cities.map(c => {
                const slug = c.toLowerCase().replace(/\s+/g, '-');
                return <option key={slug} value={slug}>{c}</option>;
              })}
            </select>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={onDownloadTemplate}>
              <Download />
              Scarica template
            </Button>
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
              <Upload />
              Importa da Excel
            </Button>
            <input ref={fileInputRef} type="file" accept=".xlsx" className="hidden" onChange={onImport} />
          </div>
          <StatusMessage message={importMsg} />
        </CardContent>
      </Card>

      {/* Vie ufficiali ANNCSU + Google */}
      <Card>
        <CardHeader>
          <CardTitle>Vie e civici ufficiali</CardTitle>
          <CardDescription>
            Da ANNCSU (Agenzia Entrate / Istat), con i nomi allineati a Google Maps. Le modifiche restano in bozza fino al salvataggio.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={onOfficialImport}
              disabled={officialBusy !== null || loading}
              title="Sostituisce la lista vie con tutte le vie ufficiali del comune (anteprima prima di applicare)"
            >
              {officialBusy === 'import' ? <Loader2 className="animate-spin" /> : <Import />}
              {officialBusy === 'import' ? 'Carico le vie…' : 'Importa tutte le vie'}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={onExpandCivics}
              disabled={officialBusy !== null || loading || rows.length === 0}
              title="Aggiunge a ogni via tutti i civici ufficiali mancanti, con il prezzo €/mq della via"
            >
              {officialBusy === 'expand' ? <Loader2 className="animate-spin" /> : <Home />}
              {officialBusy === 'expand' ? 'Espando i civici…' : 'Espandi civici'}
            </Button>
          </div>
          <StatusMessage message={officialMsg} fallback="info" />
          {importPreview && (
            <div className="space-y-3 rounded-lg border border-emerald-800/60 bg-emerald-950/20 p-4 text-sm">
              <p className="font-medium text-foreground">
                Anteprima: {importPreview.streetRows.length} vie ufficiali
              </p>
              <ul className="space-y-1 text-muted-foreground">
                <li>{importPreview.added.length} nuove (prezzo di default del comune)</li>
                <li>{importPreview.renamed.length} rinominate col nome Google (prezzo mantenuto, civici inclusi)</li>
                <li>{importPreview.kept.length} già presenti con lo stesso nome</li>
                <li className={importPreview.removed.length > 0 ? 'text-red-300' : undefined}>
                  {importPreview.removed.length} vie in lista che non esistono tra quelle ufficiali: verranno rimosse con i loro civici
                </li>
                <li className={importPreview.unconfirmed.length > 0 ? 'text-amber-300' : undefined}>
                  {importPreview.unconfirmed.length} senza conferma da Google (useranno il nome ANNCSU)
                </li>
              </ul>
              {importPreview.removed.length > 0 && (
                <details>
                  <summary className="cursor-pointer text-xs text-muted-foreground">Vie da rimuovere</summary>
                  <p className="mt-1 font-mono text-xs text-red-300">{importPreview.removed.join(' · ')}</p>
                </details>
              )}
              {importPreview.unconfirmed.length > 0 && (
                <details>
                  <summary className="cursor-pointer text-xs text-muted-foreground">Vie senza conferma Google</summary>
                  <ul className="mt-1 space-y-0.5 font-mono text-xs text-amber-300">
                    {importPreview.unconfirmed.map((u) => (
                      <li key={u.name}>{u.name}{u.suggestion && <span className="text-muted-foreground"> (Google propone: {u.suggestion})</span>}</li>
                    ))}
                  </ul>
                </details>
              )}
              <div className="flex gap-2">
                <Button size="sm" onClick={onApplyImport}>Applica</Button>
                <Button size="sm" variant="ghost" onClick={onCancelImport}>Annulla</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filtro */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={filter}
          onChange={(e) => onFilterChange(e.target.value)}
          placeholder="Filtra vie e civici per nome della via…"
          className="h-10 pl-9"
          aria-label="Filtra vie e civici"
        />
      </div>

      {/* Prezzi per via */}
      <Card>
        <CardHeader>
          <CardTitle>Prezzi per via</CardTitle>
          <CardDescription>{rows.length} vie{filterText && ` · ${visibleRows.length} corrispondono al filtro`}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onVerify}
              disabled={verifyProgress !== null || loading}
              title="Confronta i nomi in lista con quelli ufficiali di Google Maps"
            >
              {verifyProgress ? <Loader2 className="animate-spin" /> : <Search />}
              {verifyProgress ? `Verifica ${verifyProgress.done}/${verifyProgress.total}…` : 'Verifica con Google'}
            </Button>
            <Button size="sm" onClick={() => onShowNewStreet(true)}>
              <Plus />
              Aggiungi via
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onAddRow}
              title="Riga vuota da compilare a mano (per vie che Google non conosce)"
            >
              <Pencil />
              A mano
            </Button>
          </div>

          {showNewStreet && (
            <div className="space-y-3 rounded-lg border bg-muted/40 p-4">
              <p className="text-sm font-medium text-foreground">Nuova via da Google Maps</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_9rem]">
                <div>
                  <label className={LABEL_CLASS}>Via ({cityName})</label>
                  <StreetAutocomplete city={cityName} onSelect={(street) => onNewStreetChange({ ...newStreet, street })} />
                </div>
                <div>
                  <label className={LABEL_CLASS}>Prezzo €/mq</label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={newStreet.price || ''}
                    onChange={(e) => onNewStreetChange({ ...newStreet, price: parseFloat(e.target.value) || 0 })}
                    placeholder="es. 2000"
                    className="text-right"
                    step={50} min={100}
                  />
                </div>
              </div>
              {newStreet.street && (
                <p className="text-xs text-muted-foreground">Verrà salvata come <span className="font-mono text-foreground">{newStreet.street}</span></p>
              )}
              <StatusMessage message={newStreetMsg} className="text-xs" />
              <div className="flex gap-2">
                <Button size="sm" onClick={onAddStreet}>Aggiungi</Button>
                <Button size="sm" variant="ghost" onClick={() => onShowNewStreet(false)}>Annulla</Button>
              </div>
            </div>
          )}

          {(verifyResults || verifyMsg) && (
            <div className="space-y-3 rounded-lg border border-amber-800/60 bg-amber-950/20 p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium text-foreground">
                  Verifica con Google
                  {verifyResults && (
                    <span className="block font-normal text-muted-foreground sm:ml-2 sm:inline">
                      {verifyResults.filter((r) => r.status === 'ok').length} coincidono · {renames.length} da rinominare · {notFound} non trovate
                    </span>
                  )}
                </p>
                <div className="flex shrink-0 gap-1">
                  {renames.length > 1 && (
                    <Button size="xs" onClick={() => onApplyRenames(renames.map(toRename))}>
                      Applica tutte
                    </Button>
                  )}
                  <Button size="icon-xs" variant="ghost" onClick={onCloseVerify} aria-label="Chiudi verifica">
                    <X />
                  </Button>
                </div>
              </div>
              <StatusMessage message={verifyMsg} className="text-xs" />
              {verifyResults?.some((r) => r.status !== 'ok') && (
                <ul className="space-y-1.5 text-sm">
                  {verifyResults.filter((r) => r.status !== 'ok').map((r) => (
                    <li key={r.street} className="flex items-center justify-between gap-3 border-b py-1.5 last:border-0">
                      {r.status === 'rename' ? (
                        <>
                          <span className="min-w-0 text-foreground/90">
                            <span className="font-mono">{r.street}</span> → <span className="font-mono text-amber-300">{r.suggestion}</span>
                            {r.partial && <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">da verificare</span>}
                            {r.conflict && <span className="ml-2 text-xs text-red-400">già in lista</span>}
                          </span>
                          {!r.conflict && (
                            <Button size="xs" variant="secondary" onClick={() => onApplyRenames([toRename(r)])}>
                              Applica
                            </Button>
                          )}
                        </>
                      ) : (
                        <span className="flex items-start gap-2 text-muted-foreground">
                          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-400" />
                          <span>
                            <span className="font-mono">{r.street}</span>{' '}
                            {r.status === 'error' ? '— errore Google, riprova' : '— non trovata su Google, controlla a mano'}
                          </span>
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-8 text-muted-foreground">
              <Loader2 className="size-6 animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Via</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">€/mq</th>
                    <th className="w-12"><span className="sr-only">Azioni</span></th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map(({ row, i }) => (
                    <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-2 py-1.5">
                        <Input
                          type="text"
                          value={row.key}
                          onChange={(e) => onRowChange(i, 'key', e.target.value)}
                          className="h-8 min-w-[12rem]"
                          aria-label="Nome via"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <Input
                          type="number"
                          inputMode="numeric"
                          value={row.value}
                          onChange={(e) => onRowChange(i, 'value', parseFloat(e.target.value) || 0)}
                          className="ml-auto h-8 w-24 text-right"
                          step={50} min={100}
                          aria-label={`€/mq ${row.key}`}
                        />
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <Button size="icon-sm" variant="ghost" onClick={() => onDeleteRow(i)} aria-label={`Elimina ${row.key || 'riga'}`} className="text-red-400 hover:text-red-300">
                          <Trash2 />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Prezzi per civico */}
      <Card>
        <CardHeader>
          <CardTitle>Prezzi per civico</CardTitle>
          <CardDescription>
            {civicRows.length === 0
              ? 'Nessun prezzo civico'
              : `${civicRows.length} civici su ${civicGroups.length} vie${filterText ? ` · ${visibleCivicCount} corrispondono al filtro` : ''}`}
          </CardDescription>
          <CardAction>
            <Button size="sm" onClick={() => onShowNewCivic(true)}>
              <Plus />
              <span className="hidden sm:inline">Aggiungi prezzo civico</span>
              <span className="sm:hidden">Civico</span>
            </Button>
          </CardAction>
        </CardHeader>

        <CardContent className="space-y-2">
          {civicGroups.map(({ street, items, hidden }) => (
            <details key={street} className="overflow-hidden rounded-lg border" open={!!filterText}>
              <summary className="cursor-pointer select-none px-3 py-2.5 text-sm text-foreground/90 hover:bg-muted/30">
                <span className="font-mono">{street}</span>
                <span className="ml-2 text-xs text-muted-foreground">{items.length + hidden} civici</span>
              </summary>
              <table className="w-full text-sm">
                <tbody>
                  {items.map(({ row, i }) => (
                    <tr key={i} className="border-t hover:bg-muted/30">
                      <td className="w-24 px-2 py-1">
                        <Input
                          type="text"
                          value={row.civic}
                          onChange={(e) => onCivicRowChange(i, 'civic', e.target.value)}
                          className="h-8 w-20"
                          aria-label={`Civico di ${street}`}
                        />
                      </td>
                      <td className="px-2 py-1">
                        <div className="flex items-center gap-1.5">
                          <Input
                            type="number"
                            inputMode="numeric"
                            value={row.price}
                            onChange={(e) => onCivicRowChange(i, 'price', parseFloat(e.target.value) || 0)}
                            className="h-8 w-24 text-right"
                            step={50} min={100}
                            aria-label={`€/mq ${street} ${row.civic}`}
                          />
                          <span className="text-xs text-muted-foreground">€/mq</span>
                        </div>
                      </td>
                      <td className="w-12 px-2 py-1 text-right">
                        <Button size="icon-sm" variant="ghost" onClick={() => onDeleteCivic(i)} aria-label={`Elimina civico ${row.civic}`} className="text-red-400 hover:text-red-300">
                          <Trash2 />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {hidden > 0 && (
                    <tr className="border-t">
                      <td colSpan={3} className="px-3 py-1.5 text-xs text-muted-foreground">
                        Altri {hidden} civici non mostrati: filtra per il nome della via per modificarli
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </details>
          ))}

          {showNewCivic && (
            <div className="mt-2 space-y-3 rounded-lg border bg-muted/40 p-4">
              <p className="text-sm font-medium text-foreground">Nuovo prezzo civico</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className={LABEL_CLASS}>Via</label>
                  <select
                    value={newCivic.street}
                    onChange={(e) => onNewCivicChange({ ...newCivic, street: e.target.value })}
                    className={SELECT_CLASS}
                  >
                    {streetNames.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className={LABEL_CLASS}>Civico</label>
                  <Input
                    type="text"
                    value={newCivic.civic}
                    onChange={(e) => onNewCivicChange({ ...newCivic, civic: e.target.value })}
                    placeholder="es. 15"
                  />
                </div>
                <div>
                  <label className={LABEL_CLASS}>Prezzo €/mq</label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={newCivic.price || ''}
                    onChange={(e) => onNewCivicChange({ ...newCivic, price: parseFloat(e.target.value) || 0 })}
                    placeholder="es. 2100"
                    step={50} min={100}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={onAddCivic}>Aggiungi</Button>
                <Button size="sm" variant="ghost" onClick={() => onShowNewCivic(false)}>Annulla</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Salva: barra fissa in basso, sempre raggiungibile */}
      <div className="sticky bottom-3 z-20 rounded-xl border bg-card/95 p-3 shadow-lg backdrop-blur">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <StatusMessage message={message} className="sm:flex-1" />
          <Button onClick={onSave} disabled={saving} size="lg" className="sm:ml-auto">
            {saving ? <Loader2 className="animate-spin" /> : <Save />}
            {saving ? 'Salvataggio…' : 'Salva prezzi strade'}
          </Button>
        </div>
      </div>
    </div>
  );
}

const LABEL_CLASS = 'mb-1 block text-xs text-muted-foreground';
const SELECT_CLASS =
  'h-9 w-full rounded-md border border-input bg-background px-3 text-base text-foreground shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 md:text-sm';
