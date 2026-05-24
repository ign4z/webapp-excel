'use client';

import { useState, useEffect, useRef } from 'react';
import { ALLOWED_CITIES } from '@/lib/cities';

interface StreetRow {
  key: string;
  value: number;
}

interface StreetsEditorProps {
  token: string;
}

export default function StreetsEditor({ token }: StreetsEditorProps) {
  const [city, setCity] = useState(ALLOWED_CITIES[0].toLowerCase().replace(/\s+/g, '-'));
  const [rows, setRows] = useState<StreetRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [importMsg, setImportMsg] = useState('');
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
        const sorted = Object.entries(data as Record<string, number>)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, value]) => ({ key, value }));
        setRows(sorted);
      }
    } catch {
      setMessage('❌ Errore caricamento dati');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setMessage('');
    try {
      const body: Record<string, number> = {};
      for (const { key, value } of rows) {
        if (key.trim()) body[key.trim().toLowerCase()] = value;
      }
      const res = await fetch(`/api/admin/streets?token=${token}&city=${city}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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
      if (!res.ok) {
        setImportMsg('❌ Errore download template');
        return;
      }
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

  function updateRow(index: number, field: 'key' | 'value', val: string | number) {
    setRows(prev => prev.map((r, i) => i === index ? { ...r, [field]: val } : r));
  }

  function deleteRow(index: number) {
    setRows(prev => prev.filter((_, i) => i !== index));
  }

  function addRow() {
    setRows(prev => [...prev, { key: '', value: 0 }]);
  }

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

      {/* Import/Export buttons */}
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
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx"
            className="hidden"
            onChange={handleImport}
          />
        </div>
        {importMsg && (
          <p className={`text-sm font-semibold ${importMsg.startsWith('✅') ? 'text-green-700' : importMsg.startsWith('⏳') ? 'text-blue-600' : 'text-red-700'}`}>
            {importMsg}
          </p>
        )}
      </div>

      {/* Streets table */}
      <div className="bg-white rounded-2xl shadow-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-700">Prezzi per via</h2>
          <button
            onClick={addRow}
            className="px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition text-sm font-semibold"
          >
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
                {rows.map((row, i) => (
                  <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-1.5 px-3">
                      <input
                        type="text"
                        value={row.key}
                        onChange={(e) => updateRow(i, 'key', e.target.value)}
                        className="w-full px-2 py-1 border border-slate-200 rounded focus:ring-1 focus:ring-blue-400"
                      />
                    </td>
                    <td className="py-1.5 px-3">
                      <input
                        type="number"
                        value={row.value}
                        onChange={(e) => updateRow(i, 'value', parseFloat(e.target.value) || 0)}
                        className="w-28 px-2 py-1 border border-slate-200 rounded text-right focus:ring-1 focus:ring-blue-400"
                        step={50}
                        min={100}
                      />
                    </td>
                    <td className="py-1.5 px-3 text-center">
                      <button
                        onClick={() => deleteRow(i)}
                        className="text-red-400 hover:text-red-600 transition"
                        title="Elimina"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
