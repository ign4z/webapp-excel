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
      <Card className="bg-zinc-800 border-zinc-700">
        <CardContent className="py-12 text-center">
          <p className="text-zinc-400">Caricamento file...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-zinc-800 border-zinc-700">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-zinc-200">📂 File Excel Generati</CardTitle>
            <CardDescription className="text-zinc-400">Totale file: {files.length}</CardDescription>
          </div>
          <Button onClick={onRefresh} variant="outline" size="sm" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
            🔄 Aggiorna
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {files.length === 0 ? (
          <div className="text-center py-12 text-zinc-500">
            <p className="text-lg">Nessun file presente</p>
            <p className="text-sm mt-2">I file Excel generati appariranno qui</p>
          </div>
        ) : (
          <div className="rounded-md border border-zinc-700 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-700 hover:bg-zinc-800">
                  <TableHead className="w-[50%] text-zinc-400">Nome File</TableHead>
                  <TableHead className="text-zinc-400">Dimensione</TableHead>
                  <TableHead className="text-zinc-400">Data Creazione</TableHead>
                  <TableHead className="text-right text-zinc-400">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {files.map((file) => (
                  <TableRow key={file.url} className="border-zinc-800 hover:bg-zinc-800">
                    <TableCell className="font-medium text-zinc-200">
                      <div className="flex items-center gap-2">
                        <span className="text-green-400">📊</span>
                        <span className="truncate max-w-xs">{file.filename}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-zinc-300">{formatFileSize(file.size)}</TableCell>
                    <TableCell className="text-zinc-300">{formatDate(file.uploadedAt)}</TableCell>
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
