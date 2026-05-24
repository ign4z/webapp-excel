'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import FileTable from '@/components/admin/FileTable';
import Link from 'next/link';

function FilesPageContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">❌ Accesso Negato</h1>
          <p className="text-gray-600">Token di accesso mancante</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-100 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            📂 Admin - Gestione File
          </h1>
          <p className="text-gray-600">
            Visualizza, scarica ed elimina i file Excel generati
          </p>
        </div>

        {/* Navigation */}
        <div className="mb-6 flex gap-4">
          <Link
            href={`/admin/config?token=${token}`}
            className="px-4 py-2 bg-white rounded-lg shadow hover:shadow-md transition"
          >
            ⚙️ Configurazione
          </Link>
          <Link
            href={`/admin/streets?token=${token}`}
            className="px-4 py-2 bg-white rounded-lg shadow hover:shadow-md transition"
          >
            🗺️ Prezzi per Via
          </Link>
          <Link
            href="/"
            className="px-4 py-2 bg-white rounded-lg shadow hover:shadow-md transition"
          >
            🏠 Home
          </Link>
        </div>

        {/* File Table */}
        <FileTable token={token} />
      </div>
    </div>
  );
}

export default function FilesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Caricamento...</div>}>
      <FilesPageContent />
    </Suspense>
  );
}

