'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { AssessmentSession } from '@/types';
import { loadSession, saveSession } from '@/lib/session';
import CollaboratorView from '@/components/CollaboratorView';

export default function CollaboratorSessionPage() {
  const params = useParams();
  const sessionId = typeof params.sessionId === 'string' ? params.sessionId : '';

  const [session, setSession] = useState<AssessmentSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) { setLoading(false); return; }
    const loaded = loadSession(sessionId);
    setSession(loaded);
    setLoading(false);
  }, [sessionId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-gray-400" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={24} className="text-amber-500" strokeWidth={1.75} />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Sessão não encontrada</h2>
          <p className="text-sm text-gray-500 mb-6">
            O link pode ter expirado ou ser inválido. Peça ao organizador que compartilhe o link novamente.
          </p>
          <a
            href="/assessment"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors"
          >
            Iniciar novo diagnóstico
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Minimal header */}
      <header className="bg-white border-b border-gray-100 px-6 py-3 shadow-sm">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-sm font-bold text-gray-900 leading-none">OEA</h1>
            <p className="text-xs text-gray-400">Operational Efficiency Assessment</p>
          </div>
          <span className="text-xs bg-violet-50 text-violet-700 font-medium px-2.5 py-1 rounded-full border border-violet-200">
            Diagnóstico colaborativo
          </span>
        </div>
      </header>

      <CollaboratorView
        initialSession={session}
        onSessionChange={(updated) => {
          setSession(updated);
          saveSession(updated);
        }}
      />
    </div>
  );
}
