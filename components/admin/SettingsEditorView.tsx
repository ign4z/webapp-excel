'use client';

import { Loader2, Mail, Plus, Save, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { StatusMessage } from './StatusMessage';

interface SettingsEditorViewProps {
  emails: string[];
  /** Destinatari da ADMIN_EMAIL, usati quando la lista è vuota */
  fallbackEmails: string[];
  maxEmails: number;
  loading: boolean;
  saving: boolean;
  message: string;
  onEmailChange: (index: number, value: string) => void;
  onAddEmail: () => void;
  onRemoveEmail: (index: number) => void;
  onSave: () => void;
}

export function SettingsEditorView({
  emails, fallbackEmails, maxEmails, loading, saving, message,
  onEmailChange, onAddEmail, onRemoveEmail, onSave,
}: SettingsEditorViewProps) {
  if (loading) {
    return (
      <div className="flex justify-center py-12 text-muted-foreground">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );
  }

  const fallbackNote = fallbackEmails.length > 0
    ? `Lista vuota: le notifiche vanno a ${fallbackEmails.join(', ')} (ADMIN_EMAIL).`
    : 'Lista vuota e ADMIN_EMAIL non impostata: le notifiche non vengono inviate.';

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="size-4" />
            Notifiche nuova valutazione
          </CardTitle>
          <CardDescription>
            A ogni valutazione completata questi indirizzi ricevono i contatti del cliente e il valore stimato.
            Il report Excel non viene allegato: si scarica dalla sezione Report.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {emails.length === 0 && <p className="text-sm text-muted-foreground">{fallbackNote}</p>}

          {emails.map((email, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                type="email"
                inputMode="email"
                autoComplete="off"
                placeholder="nome@agenzia.it"
                value={email}
                onChange={(e) => onEmailChange(index, e.target.value)}
                aria-label={`Destinatario ${index + 1}`}
              />
              <Button variant="ghost" size="icon" onClick={() => onRemoveEmail(index)} aria-label={`Rimuovi destinatario ${index + 1}`}>
                <Trash2 />
              </Button>
            </div>
          ))}

          <Button variant="outline" size="sm" onClick={onAddEmail} disabled={emails.length >= maxEmails}>
            <Plus />
            Aggiungi indirizzo
          </Button>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        <StatusMessage message={message} className="w-full sm:w-auto sm:flex-1" />
        <Button onClick={onSave} disabled={saving} size="lg" className="flex-1 sm:ml-auto sm:flex-none">
          {saving ? <Loader2 className="animate-spin" /> : <Save />}
          {saving ? 'Salvataggio…' : 'Salva impostazioni'}
        </Button>
      </div>
    </div>
  );
}
