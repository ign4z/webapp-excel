'use client';

import { useState, useEffect, useRef } from 'react';
import { ALLOWED_CITIES } from '@/lib/cities';
import { StreetsEditorView } from './StreetsEditorView';

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

  function handleRowChange(i: number, field: 'key' | 'value', val: string | number) {
    setStreetRows(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: val } : r));
  }

  function handleAddCivic() {
    if (!newCivic.street || !newCivic.civic || newCivic.price <= 0) return;
    setCivicRows(prev => [...prev, { ...newCivic }]);
    setNewCivic({ street: streetRows[0]?.key ?? '', civic: '', price: 0 });
    setShowNewCivic(false);
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
      onCityChange={setCity}
      onRowChange={handleRowChange}
      onDeleteRow={(i) => setStreetRows(prev => prev.filter((_, idx) => idx !== i))}
      onAddRow={() => setStreetRows(prev => [...prev, { key: '', value: 0 }])}
      onAddCivic={handleAddCivic}
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
