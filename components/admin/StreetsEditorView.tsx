'use client';

import { useRef } from 'react';

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
  onCityChange,
  onRowChange,
  onDeleteRow,
  onAddRow,
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

      {/* Prezzi per via */}
      <div className="bg-zinc-800 rounded-2xl border border-zinc-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-zinc-200">Prezzi per via</h2>
          <button onClick={onAddRow} className="px-3 py-1.5 bg-blue-700 text-white rounded-lg hover:bg-blue-600 transition text-sm font-semibold">
            + Aggiungi via
          </button>
        </div>
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
                {rows.map((row, i) => (
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
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-700">
                  <th className="text-left py-2 px-3 text-zinc-400 font-semibold">Via</th>
                  <th className="text-left py-2 px-3 text-zinc-400 font-semibold">Civico</th>
                  <th className="text-right py-2 px-3 text-zinc-400 font-semibold">€/mq</th>
                  <th className="w-12"></th>
                </tr>
              </thead>
              <tbody>
                {civicRows.map((row, i) => (
                  <tr key={i} className="border-b border-zinc-700 hover:bg-zinc-700">
                    <td className="py-1.5 px-3">
                      <input
                        type="text"
                        value={row.street}
                        onChange={(e) => onCivicRowChange(i, 'street', e.target.value)}
                        className="w-full px-2 py-1 bg-zinc-700 border border-zinc-700 text-zinc-200 rounded focus:ring-1 focus:ring-purple-600 focus:outline-none text-sm"
                      />
                    </td>
                    <td className="py-1.5 px-3">
                      <input
                        type="text"
                        value={row.civic}
                        onChange={(e) => onCivicRowChange(i, 'civic', e.target.value)}
                        className="w-20 px-2 py-1 bg-zinc-700 border border-zinc-700 text-zinc-200 rounded focus:ring-1 focus:ring-purple-600 focus:outline-none text-sm"
                      />
                    </td>
                    <td className="py-1.5 px-3">
                      <input
                        type="number"
                        value={row.price}
                        onChange={(e) => onCivicRowChange(i, 'price', parseFloat(e.target.value) || 0)}
                        className="w-28 px-2 py-1 bg-zinc-700 border border-zinc-700 text-zinc-200 rounded text-right focus:ring-1 focus:ring-purple-600 focus:outline-none text-sm"
                        step={50} min={100}
                      />
                    </td>
                    <td className="py-1.5 px-3 text-center">
                      <button onClick={() => onDeleteCivic(i)} className="text-red-500 hover:text-red-300 transition" title="Elimina">✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
