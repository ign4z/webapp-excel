'use client';

import { useState, useEffect } from 'react';
import { FileTableView, ExcelFile } from './FileTableView';
import { adminFetch } from '@/components/admin/adminFetch';

interface FileTableProps {
  token: string;
}

export default function FileTable({ token }: FileTableProps) {
  const [files, setFiles] = useState<ExcelFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingFile, setDeletingFile] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  async function loadFiles() {
    setIsLoading(true);
    try {
      const response = await adminFetch(token, '/api/admin/files');
      const data = await response.json();
      if (response.ok && data.success) {
        setFiles(data.data);
      } else {
        throw new Error(data.error);
      }
    } catch (error: unknown) {
      setMessage(`❌ ${error instanceof Error ? error.message : 'Errore sconosciuto'}`);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadFiles();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const fileQuery = (file: ExcelFile) => `url=${encodeURIComponent(file.url)}`;

  async function handleDownload(file: ExcelFile) {
    try {
      const res = await adminFetch(token, `/api/admin/files/download?${fileQuery(file)}`);
      if (!res.ok) throw new Error('Errore download file');
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement('a');
      a.href = url;
      a.download = file.filename.split('/').pop() ?? 'report.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    } catch (error: unknown) {
      setMessage(`❌ ${error instanceof Error ? error.message : 'Errore sconosciuto'}`);
    }
  }

  async function handleDelete(file: ExcelFile) {
    const { url: fileUrl, filename } = file;
    if (!confirm(`Sei sicuro di voler eliminare il file "${filename}"?`)) return;

    setDeletingFile(fileUrl);
    setMessage('');
    try {
      const response = await adminFetch(token, `/api/admin/files?${fileQuery(file)}`,
        { method: 'DELETE' }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Errore eliminazione file');

      setMessage(`✅ ${filename.split('/').pop()} eliminato`);
      setTimeout(() => setMessage(''), 3000);
      loadFiles();
    } catch (error: unknown) {
      setMessage(`❌ ${error instanceof Error ? error.message : 'Errore sconosciuto'}`);
    } finally {
      setDeletingFile(null);
    }
  }

  return (
    <FileTableView
      files={files}
      loading={isLoading}
      message={message}
      deletingUrl={deletingFile}
      onDelete={handleDelete}
      onDownload={handleDownload}
      onRefresh={loadFiles}
    />
  );
}
