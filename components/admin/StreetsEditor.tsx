'use client';

import { useState, useEffect, useRef } from 'react';
import { ALLOWED_CITIES, cityToSlug } from '@/lib/cities';
import { StreetsEditorView, type VerifyResult, type VerifyProgress } from './StreetsEditorView';
import { adminFetch } from '@/components/admin/adminFetch';
import { applyStreetRenames, type StreetRow, type CivicRow, type StreetRename } from '@/lib/street-rename';
import { buildOfficialImport, expandCivics, type OfficialImportResult, type OfficialStreetEntry } from '@/lib/street-import';
import type { GoogleStreetMatch } from '@/lib/address';

// Massimo di vie per richiesta a /api/admin/streets/google (limite della route)
const VERIFY_CHUNK = 300;

interface NewCivicForm {
  street: string;
  civic: string;
  price: number;
}

interface StreetsEditorProps {
  token: string;
}

export default function StreetsEditor({ token }: StreetsEditorProps) {
  const [city, setCity] = useState(cityToSlug(ALLOWED_CITIES[0]));
  const [streetRows, setStreetRows] = useState<StreetRow[]>([]);
  const [civicRows, setCivicRows] = useState<CivicRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [importMsg, setImportMsg] = useState('');
  const [showNewCivic, setShowNewCivic] = useState(false);
  const [newCivic, setNewCivic] = useState<NewCivicForm>({ street: '', civic: '', price: 0 });
  const [showNewStreet, setShowNewStreet] = useState(false);
  const [newStreet, setNewStreet] = useState({ street: '', price: 0 });
  const [newStreetMsg, setNewStreetMsg] = useState('');
  const [verifyProgress, setVerifyProgress] = useState<VerifyProgress | null>(null);
  const [verifyResults, setVerifyResults] = useState<VerifyResult[] | null>(null);
  const [verifyMsg, setVerifyMsg] = useState('');
  const [officialBusy, setOfficialBusy] = useState<'import' | 'expand' | null>(null);
  const [importPreview, setImportPreview] = useState<OfficialImportResult | null>(null);
  const [officialMsg, setOfficialMsg] = useState('');
  const [filter, setFilter] = useState('');
  // Incrementato a ogni cambio comune: una verifica ancora in corso sul comune precedente si interrompe
  const verifyRunRef = useRef(0);

  // Nome del comune come lo scrive Google (serve per autocomplete e geocoding), dallo slug selezionato
  const cityName = ALLOWED_CITIES.find((c) => cityToSlug(c) === city) ?? city;

  useEffect(() => {
    loadStreets();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city]);

  async function loadStreets() {
    setLoading(true);
    setMessage('');
    try {
      const res = await adminFetch(token, `/api/admin/streets?city=${city}`);
      if (res.ok) {
        const { data } = await res.json();
        const allEntries = Object.entries(data as Record<string, number>)
          .sort(([a], [b]) => a.localeCompare(b));

        setStreetRows(
          allEntries
            .filter(([k]) => !k.includes(':'))
            .map(([key, value]) => ({ key, value }))
        );
        setCivicRows(
          allEntries
            .filter(([k]) => k.includes(':'))
            .map(([key, value]) => {
              const [street, civic] = key.split(':');
              return { street, civic, price: value };
            })
        );
      }
    } catch {
      setMessage('❌ Errore caricamento dati');
    } finally {
      setLoading(false);
    }
  }

  function buildSaveBody(): Record<string, number> {
    const body: Record<string, number> = {};
    for (const { key, value } of streetRows) {
      if (key.trim()) body[key.trim().toLowerCase()] = value;
    }
    for (const { street, civic, price } of civicRows) {
      if (street.trim() && civic.trim()) {
        body[`${street.trim().toLowerCase()}:${civic.trim()}`] = price;
      }
    }
    return body;
  }

  async function handleSave() {
    setSaving(true);
    setMessage('');
    try {
      const res = await adminFetch(token, `/api/admin/streets?city=${city}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildSaveBody()),
      });
      if (res.ok) {
        setMessage('✅ Salvato con successo');
        setTimeout(() => setMessage(''), 3000);
      } else {
        const d = await res.json();
        setMessage(`❌ ${d.error ?? 'Errore salvataggio'}`);
      }
    } catch {
      setMessage('❌ Errore di rete');
    } finally {
      setSaving(false);
    }
  }

  async function handleDownloadTemplate() {
    try {
      const res = await adminFetch(token, `/api/admin/streets/template?city=${city}`);
      if (!res.ok) { setImportMsg('❌ Errore download template'); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `strade-${city}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setImportMsg('❌ Errore download template');
    }
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportMsg('⏳ Importazione in corso...');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await adminFetch(token, `/api/admin/streets/import?city=${city}`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const civicPart = data.importedCivics > 0 ? `, ${data.importedCivics} civici` : '';
        setImportMsg(`✅ Importate ${data.importedStreets} vie${civicPart}`);
        await loadStreets();
      } else {
        setImportMsg(`❌ ${data.error ?? 'Errore importazione'}`);
      }
    } catch {
      setImportMsg('❌ Errore di rete');
    } finally {
      e.target.value = '';
      setTimeout(() => setImportMsg(''), 5000);
    }
  }

  function handleRowChange(i: number, field: 'key' | 'value', val: string | number) {
    setStreetRows(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: val } : r));
  }

  function handleAddCivic() {
    if (!newCivic.street || !newCivic.civic || newCivic.price <= 0) return;
    setCivicRows(prev => [...prev, { ...newCivic }]);
    setNewCivic({ street: streetRows[0]?.key ?? '', civic: '', price: 0 });
    setShowNewCivic(false);
  }

  function handleCivicRowChange(i: number, field: keyof CivicRow, val: string | number) {
    setCivicRows(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: val } : r));
  }

  function handleCityChange(slug: string) {
    verifyRunRef.current++;
    setVerifyProgress(null);
    setVerifyResults(null);
    setVerifyMsg('');
    setShowNewStreet(false);
    setImportPreview(null);
    setOfficialMsg('');
    setFilter('');
    setCity(slug);
  }

  function handleAddStreet() {
    const street = newStreet.street.trim().toLowerCase();
    if (!street) { setNewStreetMsg('Seleziona una via dai suggerimenti di Google'); return; }
    if (newStreet.price <= 0) { setNewStreetMsg('Inserisci un prezzo €/mq valido'); return; }
    if (streetRows.some((r) => r.key.trim().toLowerCase() === street)) {
      setNewStreetMsg(`"${street}" è già in lista`);
      return;
    }
    setStreetRows((prev) => [...prev, { key: street, value: newStreet.price }]);
    setShowNewStreet(false);
  }

  async function handleVerify() {
    const run = ++verifyRunRef.current;
    const names = [...new Set(
      [...streetRows.map((r) => r.key), ...civicRows.map((r) => r.street)]
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)
    )].sort((a, b) => a.localeCompare(b));

    setVerifyResults(null);
    setVerifyMsg('');
    if (names.length === 0) return;

    // Il geocoding gira lato server (chiave Google dedicata), a blocchi per restare nei limiti della route
    const results: VerifyResult[] = [];
    try {
      for (let i = 0; i < names.length; i += VERIFY_CHUNK) {
        setVerifyProgress({ done: i, total: names.length });
        const res = await adminFetch(token, '/api/admin/streets/google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ city, streets: names.slice(i, i + VERIFY_CHUNK) }),
        });
        const data = await res.json();
        if (verifyRunRef.current !== run) return; // comune cambiato nel frattempo
        if (!res.ok) throw new Error(data.error ?? 'Errore verifica Google');
        for (const r of data.results as Array<{ street: string } & GoogleStreetMatch>) {
          if (r.status === 'found') {
            const suggestion = r.route.toLowerCase();
            results.push(suggestion === r.street
              ? { street: r.street, status: 'ok' }
              : { street: r.street, status: 'rename', suggestion, partial: r.partial });
          } else {
            results.push({ street: r.street, status: r.status });
          }
        }
      }
      setVerifyResults(results);
    } catch (err) {
      if (verifyRunRef.current === run) setVerifyMsg(`❌ ${err instanceof Error ? err.message : 'Errore verifica Google'}`);
    } finally {
      if (verifyRunRef.current === run) setVerifyProgress(null);
    }
  }

  /** Vie ufficiali ANNCSU del comune con nomi Google e civici (lato server, qualche secondo) */
  async function fetchOfficial(): Promise<{ defaultPrice: number; streets: OfficialStreetEntry[]; date: string }> {
    const res = await adminFetch(token, `/api/admin/streets/official?city=${city}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? 'Errore caricamento vie ufficiali');
    return data;
  }

  async function handleOfficialImport() {
    const run = verifyRunRef.current;
    setOfficialBusy('import');
    setOfficialMsg('');
    setImportPreview(null);
    try {
      const official = await fetchOfficial();
      if (verifyRunRef.current !== run) return;
      setImportPreview(buildOfficialImport(streetRows, civicRows, official.streets, official.defaultPrice));
      setOfficialMsg(`Dati ANNCSU del ${official.date}, prezzo per le vie nuove: ${official.defaultPrice} €/mq`);
    } catch (err) {
      if (verifyRunRef.current === run) setOfficialMsg(`❌ ${err instanceof Error ? err.message : 'Errore'}`);
    } finally {
      if (verifyRunRef.current === run) setOfficialBusy(null);
    }
  }

  function handleApplyImport() {
    if (!importPreview) return;
    setStreetRows(importPreview.streetRows);
    setCivicRows(importPreview.civicRows);
    setOfficialMsg(`✅ Lista sostituita con ${importPreview.streetRows.length} vie ufficiali: ricordati di salvare`);
    setImportPreview(null);
  }

  async function handleExpandCivics() {
    const run = verifyRunRef.current;
    setOfficialBusy('expand');
    setOfficialMsg('');
    try {
      const official = await fetchOfficial();
      if (verifyRunRef.current !== run) return;
      const out = expandCivics(streetRows, civicRows, official.streets);
      setCivicRows(out.civicRows);
      const unmatched = out.unmatchedStreets.length > 0
        ? `; ${out.unmatchedStreets.length} vie senza dati ANNCSU (${out.unmatchedStreets.slice(0, 5).join(', ')}${out.unmatchedStreets.length > 5 ? '…' : ''})`
        : '';
      setOfficialMsg(out.added > 0
        ? `✅ Aggiunti ${out.added} civici su ${out.expandedStreets} vie${unmatched}: ricordati di salvare`
        : `Nessun civico da aggiungere${unmatched}`);
    } catch (err) {
      if (verifyRunRef.current === run) setOfficialMsg(`❌ ${err instanceof Error ? err.message : 'Errore'}`);
    } finally {
      if (verifyRunRef.current === run) setOfficialBusy(null);
    }
  }

  function handleApplyRenames(renames: StreetRename[]) {
    const out = applyStreetRenames(streetRows, civicRows, renames);
    setStreetRows(out.streetRows);
    setCivicRows(out.civicRows);
    const done = new Set(out.applied.map((r) => r.from));
    const blocked = new Set(out.conflicts.map((r) => r.from));
    setVerifyResults((prev) => prev
      ?.filter((r) => !done.has(r.street))
      .map((r) => (blocked.has(r.street) ? { ...r, conflict: true } : r)) ?? null);
    setVerifyMsg(out.conflicts.length > 0
      ? `⚠️ ${out.conflicts.length} rinomine non applicate: il nome Google è già in lista, unisci le righe a mano`
      : `✅ ${out.applied.length} vie rinominate: ricordati di salvare`);
  }

  const streetNames = streetRows.map(r => r.key).filter(k => k.trim());

  return (
    <StreetsEditorView
      city={city}
      cities={ALLOWED_CITIES}
      rows={streetRows}
      civicRows={civicRows}
      loading={loading}
      saving={saving}
      message={message}
      importMsg={importMsg}
      showNewCivic={showNewCivic}
      newCivic={newCivic}
      streetNames={streetNames}
      cityName={cityName}
      showNewStreet={showNewStreet}
      newStreet={newStreet}
      newStreetMsg={newStreetMsg}
      verifyProgress={verifyProgress}
      verifyResults={verifyResults}
      verifyMsg={verifyMsg}
      onCityChange={handleCityChange}
      onRowChange={handleRowChange}
      onDeleteRow={(i) => setStreetRows(prev => prev.filter((_, idx) => idx !== i))}
      onAddRow={() => setStreetRows(prev => [...prev, { key: '', value: 0 }])}
      onShowNewStreet={(show) => {
        setShowNewStreet(show);
        setNewStreet({ street: '', price: 0 });
        setNewStreetMsg('');
      }}
      onNewStreetChange={(value) => { setNewStreet(value); setNewStreetMsg(''); }}
      onAddStreet={handleAddStreet}
      onVerify={handleVerify}
      onApplyRenames={handleApplyRenames}
      onCloseVerify={() => { setVerifyResults(null); setVerifyMsg(''); }}
      officialBusy={officialBusy}
      importPreview={importPreview}
      officialMsg={officialMsg}
      filter={filter}
      onOfficialImport={handleOfficialImport}
      onApplyImport={handleApplyImport}
      onCancelImport={() => { setImportPreview(null); setOfficialMsg(''); }}
      onExpandCivics={handleExpandCivics}
      onFilterChange={setFilter}
      onAddCivic={handleAddCivic}
      onCivicRowChange={handleCivicRowChange}
      onDeleteCivic={(i) => setCivicRows(prev => prev.filter((_, idx) => idx !== i))}
      onNewCivicChange={setNewCivic}
      onShowNewCivic={(show) => {
        setShowNewCivic(show);
        if (show) setNewCivic({ street: streetNames[0] ?? '', civic: '', price: 0 });
      }}
      onSave={handleSave}
      onImport={handleImport}
      onDownloadTemplate={handleDownloadTemplate}
    />
  );
}
