'use client';

import { useState, useEffect } from 'react';
import { SettingsEditorView } from './SettingsEditorView';
import { adminFetch } from '@/components/admin/adminFetch';
import { settingsSchema, MAX_NOTIFICATION_EMAILS } from '@/lib/schema';

interface SettingsEditorProps {
  token: string;
}

export default function SettingsEditor({ token }: SettingsEditorProps) {
  const [emails, setEmails] = useState<string[]>([]);
  const [fallbackEmails, setFallbackEmails] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const response = await adminFetch(token, '/api/admin/settings');
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.error);
        setEmails(data.data.notificationEmails);
        setFallbackEmails(data.fallbackEmails ?? []);
      } catch (error) {
        setMessage(`❌ ${error instanceof Error && error.message ? error.message : 'Errore caricamento impostazioni'}`);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [token]);

  async function handleSave() {
    // Righe vuote ignorate: la validazione vera la rifà il server
    const parsed = settingsSchema.safeParse({ notificationEmails: emails.filter((e) => e.trim()) });
    if (!parsed.success) {
      setMessage(`❌ ${parsed.error.issues.map((i) => i.message).join('; ')}`);
      return;
    }

    setSaving(true);
    setMessage('');
    try {
      const response = await adminFetch(token, '/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setEmails(data.data.notificationEmails);
      setMessage('✅ Impostazioni salvate');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage(`❌ ${error instanceof Error && error.message ? error.message : 'Errore nel salvataggio'}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <SettingsEditorView
      emails={emails}
      fallbackEmails={fallbackEmails}
      maxEmails={MAX_NOTIFICATION_EMAILS}
      loading={loading}
      saving={saving}
      message={message}
      onEmailChange={(index, value) => setEmails((prev) => prev.map((e, i) => (i === index ? value : e)))}
      onAddEmail={() => setEmails((prev) => [...prev, ''])}
      onRemoveEmail={(index) => setEmails((prev) => prev.filter((_, i) => i !== index))}
      onSave={handleSave}
    />
  );
}
