'use client';

import { useState, useEffect, useRef } from 'react';
import { ALLOWED_CITIES } from '@/lib/cities';

interface StreetRow {
  key: string;
  value: number;
}

interface CivicRow {
  street: string;
  civic: string;
  price: number;
}

interface NewCivicForm {
  street: string;
  civic: string;
  price: number;
}

interface StreetsEditorProps {
  token: string;
}

export default function StreetsEditor({ token }: StreetsEditorProps) {
  const [city, setCity] = useState(ALLOWED_CITIES[0].toLowerCase().replace(/\s+/g, '-'));
  const [streetRows, setStreetRows] = useState<StreetRow[]>([]);
  const [civicRows, setCivicRows] = useState<CivicRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [importMsg, setImportMsg] = useState('');
  const [showNewCivic, setShowNewCivic] = useState(false);
  const [newCivic, setNewCivic] = useState<NewCivicForm>({ street: '', civic: '', price: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadStreets();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city]);

  async function loadStreets() {
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch(`/api/admin/streets?token=${token}&city=${city}`);
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
      const res = await fetch(`/api/admin/streets?token=${token}&city=${city}`, {
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
      const res = await fetch(`/api/admin/streets/template?token=${token}&city=${city}`);
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
      const res = await fetch(`/api/admin/streets/import?token=${token}&city=${city}`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setImportMsg(`✅ Importate ${data.imported} vie`);
        await loadStreets();
      } else {
        setImportMsg(`❌ ${data.error ?? 'Errore importazione'}`);
      }
    } catch {
      setImportMsg('❌ Errore di rete');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
      setTimeout(() => setImportMsg(''), 5000);
    }
  }

  function updateStreetRow(i: number, field: 'key' | 'value', val: string | number) {
    setStreetRows(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: val } : r));
  }

  function deleteStreetRow(i: number) {
    setStreetRows(prev => prev.filter((_, idx) => idx !== i));
  }

  function addStreetRow() {
    setStreetRows(prev => [...prev, { key: '', value: 0 }]);
  }

  function deleteCivicRow(i: number) {
    setCivicRows(prev => prev.filter((_, idx) => idx !== i));
  }

  function addCivicRow() {
    if (!newCivic.street || !newCivic.civic || newCivic.price <= 0) return;
    setCivicRows(prev => [...prev, { ...newCivic }]);
    setNewCivic({ street: streetRows[0]?.key ?? '', civic: '', price: 0 });
    setShowNewCivic(false);
  }

  const streetNames = streetRows.map(r => r.key).filter(k => k.trim());

  return (
    <div className="space-y-6">
      {/* City selector */}
      <div className="bg-white rounded-2xl shadow-xl p-6">
        <label className="block text-sm font-semibold text-slate-600 mb-2">Comune</label>
        <select
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          {ALLOWED_CITIES.map(c => {
            const slug = c.toLowerCase().replace(/\s+/g, '-');
            return <option key={slug} value={slug}>{c}</option>;
          })}
        </select>
      </div>

      {/* Import/Export */}
      <div className="bg-white rounded-2xl shadow-xl p-6 space-y-3">
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={handleDownloadTemplate}
            className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition font-semibold text-sm"
          >
            📥 Scarica template
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition font-semibold text-sm"
          >
            📤 Importa da Excel
          </button>
          <input ref={fileInputRef} type="file" accept=".xlsx" className="hidden" onChange={handleImport} />
        </div>
        {importMsg && (
          <p className={`text-sm font-semibold ${importMsg.startsWith('✅') ? 'text-green-700' : importMsg.startsWith('⏳') ? 'text-blue-600' : 'text-red-700'}`}>
            {importMsg}
          </p>
        )}
      </div>

      {/* Prezzi per via */}
      <div className="bg-white rounded-2xl shadow-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-700">Prezzi per via</h2>
          <button onClick={addStreetRow} className="px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition text-sm font-semibold">
            + Aggiungi via
          </button>
        </div>
        {loading ? (
          <p className="text-slate-500 text-center py-8">Caricamento...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 px-3 text-slate-600 font-semibold">Via</th>
                  <th className="text-right py-2 px-3 text-slate-600 font-semibold">€/mq</th>
                  <th className="w-12"></th>
                </tr>
              </thead>
              <tbody>
                {streetRows.map((row, i) => (
                  <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-1.5 px-3">
                      <input
                        type="text"
                        value={row.key}
                        onChange={(e) => updateStreetRow(i, 'key', e.target.value)}
                        className="w-full px-2 py-1 border border-slate-200 rounded focus:ring-1 focus:ring-blue-400"
                      />
                    </td>
                    <td className="py-1.5 px-3">
                      <input
                        type="number"
                        value={row.value}
                        onChange={(e) => updateStreetRow(i, 'value', parseFloat(e.target.value) || 0)}
                        className="w-28 px-2 py-1 border border-slate-200 rounded text-right focus:ring-1 focus:ring-blue-400"
                        step={50} min={100}
                      />
                    </td>
                    <td className="py-1.5 px-3 text-center">
                      <button onClick={() => deleteStreetRow(i)} className="text-red-400 hover:text-red-600 transition" title="Elimina">✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Prezzi per civico */}
      <div className="bg-white rounded-2xl shadow-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-700">Prezzi per civico</h2>
          <button
            onClick={() => { setShowNewCivic(true); setNewCivic({ street: streetNames[0] ?? '', civic: '', price: 0 }); }}
            className="px-3 py-1.5 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition text-sm font-semibold"
          >
            + Aggiungi prezzo civico
          </button>
        </div>

        {civicRows.length === 0 && !showNewCivic ? (
          <p className="text-slate-400 text-sm">Nessun prezzo civico</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 px-3 text-slate-600 font-semibold">Via</th>
                  <th className="text-left py-2 px-3 text-slate-600 font-semibold">Civico</th>
                  <th className="text-right py-2 px-3 text-slate-600 font-semibold">€/mq</th>
                  <th className="w-12"></th>
                </tr>
              </thead>
              <tbody>
                {civicRows.map((row, i) => (
                  <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-1.5 px-3 text-slate-700">{row.street}</td>
                    <td className="py-1.5 px-3 text-slate-700">{row.civic}</td>
                    <td className="py-1.5 px-3 text-right text-slate-700">{row.price}</td>
                    <td className="py-1.5 px-3 text-center">
                      <button onClick={() => deleteCivicRow(i)} className="text-red-400 hover:text-red-600 transition" title="Elimina">✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Inline form for new civic */}
        {showNewCivic && (
          <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <p className="text-sm font-semibold text-slate-600">Nuovo prezzo civico</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Via</label>
                <select
                  value={newCivic.street}
                  onChange={(e) => setNewCivic(p => ({ ...p, street: e.target.value }))}
                  className="w-full px-2 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-purple-400 text-sm"
                >
                  {streetNames.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Civico</label>
                <input
                  type="text"
                  value={newCivic.civic}
                  onChange={(e) => setNewCivic(p => ({ ...p, civic: e.target.value }))}
                  placeholder="es. 15"
                  className="w-full px-2 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-purple-400 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Prezzo €/mq</label>
                <input
                  type="number"
                  value={newCivic.price || ''}
                  onChange={(e) => setNewCivic(p => ({ ...p, price: parseFloat(e.target.value) || 0 }))}
                  placeholder="es. 2100"
                  className="w-full px-2 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-purple-400 text-sm"
                  step={50} min={100}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={addCivicRow} className="px-4 py-1.5 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition text-sm font-semibold">
                Aggiungi
              </button>
              <button onClick={() => setShowNewCivic(false)} className="px-4 py-1.5 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition text-sm">
                Annulla
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Save */}
      <div className="bg-white rounded-2xl shadow-xl p-6">
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white font-bold py-4 px-6 rounded-xl hover:from-green-600 hover:to-green-700 disabled:opacity-50 transition"
        >
          {saving ? '💾 Salvataggio...' : '💾 Salva prezzi strade'}
        </button>
        {message && (
          <p className={`mt-3 text-center font-semibold ${message.startsWith('✅') ? 'text-green-700' : 'text-red-700'}`}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
