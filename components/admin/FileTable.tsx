'use client';

import { useState, useEffect } from 'react';
import { toast } from '@/hooks/use-toast';
import { FileTableView, ExcelFile } from './FileTableView';

interface FileTableProps {
  token: string;
}

export default function FileTable({ token }: FileTableProps) {
  const [files, setFiles] = useState<ExcelFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingFile, setDeletingFile] = useState<string | null>(null);

  async function loadFiles() {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/files?token=${token}`);
      const data = await response.json();
      if (response.ok && data.success) {
        setFiles(data.data);
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast({ title: 'Errore', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadFiles();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function handleDelete(fileUrl: string, filename: string) {
    if (!confirm(`Sei sicuro di voler eliminare il file "${filename}"?`)) return;

    setDeletingFile(fileUrl);
    try {
      const response = await fetch(
        `/api/admin/files?token=${token}&url=${encodeURIComponent(fileUrl)}`,
        { method: 'DELETE' }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Errore eliminazione file');

      toast({ title: '✅ File Eliminato', description: `${filename} è stato eliminato con successo` });
      loadFiles();
    } catch (error: any) {
      toast({ title: 'Errore', description: error.message, variant: 'destructive' });
    } finally {
      setDeletingFile(null);
    }
  }

  return (
    <FileTableView
      files={files}
      loading={isLoading}
      deletingUrl={deletingFile}
      onDelete={handleDelete}
      onRefresh={loadFiles}
    />
  );
}
