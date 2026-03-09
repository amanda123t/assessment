'use client';

import { useRouter } from 'next/navigation';
import { Activity, PlayCircle } from 'lucide-react';

export default function ModeSelector() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-6 py-4 shadow-sm">
        <div className="max-w-5xl mx-auto flex items-center gap-2">
          <Activity size={16} className="text-blue-600" strokeWidth={1.75} />
          <div>
            <h1 className="text-base font-bold text-gray-900 leading-none">OEA</h1>
            <p className="text-xs text-gray-500">Operational Efficiency Assessment</p>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <div className="max-w-xl w-full text-center">
          <span className="inline-block bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full mb-6 uppercase tracking-wide">
            Consultoria de Eficiência
          </span>
          <h2 className="text-3xl font-extrabold text-gray-900 mb-3 leading-tight">
            Diagnóstico de Eficiência Operacional
          </h2>
          <p className="text-base text-gray-500 mb-10">
            Avalie os subprocessos da sua empresa e identifique oportunidades de automação.
          </p>

          <button
            onClick={() => router.push('/assessment')}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3.5 rounded-xl text-base transition-colors shadow-sm"
          >
            <PlayCircle size={20} strokeWidth={1.75} />
            Iniciar diagnóstico
          </button>
        </div>
      </main>
    </div>
  );
}
