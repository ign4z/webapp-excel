'use client';

import { AdminPage } from '@/components/admin/AdminShell';
import SettingsEditor from '@/components/admin/SettingsEditor';

export default function SettingsPage() {
  return (
    <AdminPage title="Impostazioni" description="Destinatari delle notifiche di nuova valutazione">
      {(token) => <SettingsEditor token={token} />}
    </AdminPage>
  );
}
