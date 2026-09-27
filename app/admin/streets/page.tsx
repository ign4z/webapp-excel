'use client';

import { AdminPage } from '@/components/admin/AdminShell';
import StreetsEditor from '@/components/admin/StreetsEditor';

export default function StreetsPage() {
  return (
    <AdminPage title="Prezzi per via" description="Prezzo al mq per via e per civico nei comuni supportati">
      {(token) => <StreetsEditor token={token} />}
    </AdminPage>
  );
}
