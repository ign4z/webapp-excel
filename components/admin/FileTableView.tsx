'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export interface ExcelFile {
  url: string;
  filename: string;
  size: number;
  uploadedAt: string;
}

interface FileTableViewProps {
  files: ExcelFile[];
  loading: boolean;
  deletingUrl: string | null;
  onDelete: (url: string, filename: string) => void;
  onRefresh: () => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function FileTableView({ files, loading, deletingUrl, onDelete, onRefresh }: FileTableViewProps) {
  if (loading) {
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
            <CardDescription>Totale file: {files.length}</CardDescription>
          </div>
          <Button onClick={onRefresh} variant="outline" size="sm">
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
                          onClick={() => onDelete(file.url, file.filename)}
                          disabled={deletingUrl === file.url}
                        >
                          {deletingUrl === file.url ? '...' : '🗑️ Elimina'}
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
