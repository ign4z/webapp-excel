'use client';

import { useRef } from 'react';
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
  onCityChange: (city: string) => void;
  onRowChange: (index: number, field: 'key' | 'value', value: string | number) => void;
  onDeleteRow: (index: number) => void;
  onAddRow: () => void;
  onAddCivic: () => void;
  onDeleteCivic: (index: number) => void;
  onNewCivicChange: (form: NewCivicForm) => void;
  onShowNewCivic: (show: boolean) => void;
  onSave: () => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDownloadTemplate: () => void;
}

export function StreetsEditorView({
  city,
  rows,
  civicRows,
  loading,
  saving,
  message,
  importMsg,
  showNewCivic,
  newCivic,
  streetNames,
  onCityChange,
  onRowChange,
  onDeleteRow,
  onAddRow,
  onAddCivic,
  onDeleteCivic,
  onNewCivicChange,
  onShowNewCivic,
  onSave,
  onImport,
  onDownloadTemplate,
}: StreetsEditorViewProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-6">
      {/* City selector */}
      <div className="bg-white rounded-2xl shadow-xl p-6">
        <label className="block text-sm font-semibold text-slate-600 mb-2">Comune</label>
        <select
          value={city}
          onChange={(e) => onCityChange(e.target.value)}
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
            onClick={onDownloadTemplate}
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
          <input ref={fileInputRef} type="file" accept=".xlsx" className="hidden" onChange={onImport} />
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
          <button onClick={onAddRow} className="px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition text-sm font-semibold">
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
                        onChange={(e) => onRowChange(i, 'key', e.target.value)}
                        className="w-full px-2 py-1 border border-slate-200 rounded focus:ring-1 focus:ring-blue-400"
                      />
                    </td>
                    <td className="py-1.5 px-3">
                      <input
                        type="number"
                        value={row.value}
                        onChange={(e) => onRowChange(i, 'value', parseFloat(e.target.value) || 0)}
                        className="w-28 px-2 py-1 border border-slate-200 rounded text-right focus:ring-1 focus:ring-blue-400"
                        step={50} min={100}
                      />
                    </td>
                    <td className="py-1.5 px-3 text-center">
                      <button onClick={() => onDeleteRow(i)} className="text-red-400 hover:text-red-600 transition" title="Elimina">✕</button>
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
            onClick={() => onShowNewCivic(true)}
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
                      <button onClick={() => onDeleteCivic(i)} className="text-red-400 hover:text-red-600 transition" title="Elimina">✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {showNewCivic && (
          <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <p className="text-sm font-semibold text-slate-600">Nuovo prezzo civico</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Via</label>
                <select
                  value={newCivic.street}
                  onChange={(e) => onNewCivicChange({ ...newCivic, street: e.target.value })}
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
                  onChange={(e) => onNewCivicChange({ ...newCivic, civic: e.target.value })}
                  placeholder="es. 15"
                  className="w-full px-2 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-purple-400 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Prezzo €/mq</label>
                <input
                  type="number"
                  value={newCivic.price || ''}
                  onChange={(e) => onNewCivicChange({ ...newCivic, price: parseFloat(e.target.value) || 0 })}
                  placeholder="es. 2100"
                  className="w-full px-2 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-purple-400 text-sm"
                  step={50} min={100}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={onAddCivic} className="px-4 py-1.5 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition text-sm font-semibold">
                Aggiungi
              </button>
              <button onClick={() => onShowNewCivic(false)} className="px-4 py-1.5 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition text-sm">
                Annulla
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Save */}
      <div className="bg-white rounded-2xl shadow-xl p-6">
        <button
          onClick={onSave}
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
