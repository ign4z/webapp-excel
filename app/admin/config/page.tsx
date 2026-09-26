'use client';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import ConfigEditor from '@/components/admin/ConfigEditor';
import Link from 'next/link';

function ConfigPageContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-900">
        <div className="bg-zinc-900 border border-zinc-700 p-8 rounded-lg text-center">
          <h1 className="text-2xl font-bold text-red-500 mb-4">❌ Accesso Negato</h1>
          <p className="text-zinc-400">Token di accesso mancante</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-900 py-12 px-4">
      <div className="max-w-4xl mx-auto">

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-zinc-200 mb-2">
            🔧 Admin - Configurazione
          </h1>
          <p className="text-zinc-400">
            Gestisci i parametri di calcolo dei preventivi
          </p>
        </div>

        <div className="mb-6 flex gap-4">
          <Link
            href={`/admin/files?token=${token}`}
            className="px-4 py-2 bg-zinc-800 text-zinc-200 rounded-lg border border-zinc-700 hover:bg-zinc-700 transition"
          >
            📂 Gestione File
          </Link>
          <Link
            href={`/admin/streets?token=${token}`}
            className="px-4 py-2 bg-zinc-800 text-zinc-200 rounded-lg border border-zinc-700 hover:bg-zinc-700 transition"
          >
            🗺️ Prezzi per Via
          </Link>
          <Link
            href="/"
            className="px-4 py-2 bg-zinc-800 text-zinc-200 rounded-lg border border-zinc-700 hover:bg-zinc-700 transition"
          >
            🏠 Home
          </Link>
        </div>

        <ConfigEditor token={token} />

      </div>
    </div>
  );
}

export default function ConfigPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-zinc-900 text-zinc-400">Caricamento...</div>}>
      <ConfigPageContent />
    </Suspense>
  );
}
