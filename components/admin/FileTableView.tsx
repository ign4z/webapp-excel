'use client';

import { Download, FileSpreadsheet, Loader2, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  onDelete: (file: ExcelFile) => void;
  onDownload: (file: ExcelFile) => void;
  onRefresh: () => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

/** Nome del file senza la cartella (valutazioni/) */
function displayName(pathname: string): string {
  return pathname.slice(pathname.lastIndexOf('/') + 1);
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

export function FileTableView({ files, loading, deletingUrl, onDelete, onDownload, onRefresh }: FileTableViewProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Report Excel</CardTitle>
        <CardDescription>{loading ? 'Caricamento…' : `${files.length} file`}</CardDescription>
        <CardAction>
          <Button onClick={onRefresh} variant="outline" size="sm" disabled={loading}>
            <RefreshCw className={loading ? 'animate-spin' : undefined} />
            Aggiorna
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="flex justify-center py-12 text-muted-foreground">
            <Loader2 className="size-6 animate-spin" />
          </div>
        ) : files.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <FileSpreadsheet className="mx-auto mb-3 size-8 opacity-50" />
            <p>Nessun report presente</p>
            <p className="mt-1 text-sm">I report generati dallo Step 2 appariranno qui</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File</TableHead>
                  <TableHead className="hidden sm:table-cell">Dimensione</TableHead>
                  <TableHead className="hidden sm:table-cell">Data</TableHead>
                  <TableHead className="text-right">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {files.map((file) => (
                  <TableRow key={file.url}>
                    <TableCell className="max-w-[12rem] sm:max-w-xs">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="size-4 shrink-0 text-emerald-400" />
                        <div className="min-w-0">
                          <p className="truncate" title={file.filename}>{displayName(file.filename)}</p>
                          <p className="text-xs text-muted-foreground sm:hidden">{formatDate(file.uploadedAt)}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground sm:table-cell">{formatFileSize(file.size)}</TableCell>
                    <TableCell className="hidden text-muted-foreground sm:table-cell">{formatDate(file.uploadedAt)}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => onDownload(file)} aria-label={`Scarica ${file.filename}`}>
                          <Download />
                          <span className="hidden sm:inline">Scarica</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => onDelete(file)}
                          disabled={deletingUrl === file.url}
                          aria-label={`Elimina ${file.filename}`}
                        >
                          {deletingUrl === file.url ? <Loader2 className="animate-spin" /> : <Trash2 />}
                          <span className="hidden sm:inline">Elimina</span>
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
