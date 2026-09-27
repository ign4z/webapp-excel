'use client';

import { AdminPage } from '@/components/admin/AdminShell';
import ConfigEditor from '@/components/admin/ConfigEditor';

export default function ConfigPage() {
  return (
    <AdminPage title="Configurazione" description="Prezzi base per comune e coefficienti della formula di valutazione">
      {(token) => <ConfigEditor token={token} />}
    </AdminPage>
  );
}
