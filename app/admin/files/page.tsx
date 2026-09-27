'use client';

import { AdminPage } from '@/components/admin/AdminShell';
import FileTable from '@/components/admin/FileTable';

export default function FilesPage() {
  return (
    <AdminPage title="Report" description="Visualizza, scarica ed elimina i report Excel generati dalle valutazioni">
      {(token) => <FileTable token={token} />}
    </AdminPage>
  );
}
