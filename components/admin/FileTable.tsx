'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';

interface ExcelFile {
  url: string;
  filename: string;
  size: number;
  uploadedAt: string;
}

interface FileTableProps {
  token: string;
}

export default function FileTable({ token }: FileTableProps) {
  const [files, setFiles] = useState<ExcelFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingFile, setDeletingFile] = useState<string | null>(null);

  // Carica lista file
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
      toast({
        title: 'Errore',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadFiles();
  }, [token]);

  // Elimina file
  async function handleDelete(fileUrl: string, filename: string) {
    if (!confirm(`Sei sicuro di voler eliminare il file "${filename}"?`)) {
      return;
    }

    setDeletingFile(fileUrl);

    try {
      const response = await fetch(`/api/admin/files?token=${token}&url=${encodeURIComponent(fileUrl)}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Errore eliminazione file');
      }

      toast({
        title: '✅ File Eliminato',
        description: `${filename} è stato eliminato con successo`,
      });

      // Ricarica lista
      loadFiles();

    } catch (error: any) {
      toast({
        title: 'Errore',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setDeletingFile(null);
    }
  }

  // Formatta dimensione file
  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }

  // Formatta data
  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-gray-600">Caricamento file...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>📂 File Excel Generati</CardTitle>
            <CardDescription>
              Totale file: {files.length}
            </CardDescription>
          </div>
          <Button onClick={loadFiles} variant="outline" size="sm">
            🔄 Aggiorna
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {files.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg">Nessun file presente</p>
            <p className="text-sm mt-2">I file Excel generati appariranno qui</p>
          </div>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50%]">Nome File</TableHead>
                  <TableHead>Dimensione</TableHead>
                  <TableHead>Data Creazione</TableHead>
                  <TableHead className="text-right">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {files.map((file) => (
                  <TableRow key={file.url}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <span className="text-green-600">📊</span>
                        <span className="truncate max-w-xs">{file.filename}</span>
                      </div>
                    </TableCell>
                    <TableCell>{formatFileSize(file.size)}</TableCell>
                    <TableCell>{formatDate(file.uploadedAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <a
                          href={file.url}
                          download
                          className="inline-flex items-center px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                        >
                          ⬇️ Scarica
                        </a>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(file.url, file.filename)}
                          disabled={deletingFile === file.url}
                        >
                          {deletingFile === file.url ? '...' : '🗑️ Elimina'}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
