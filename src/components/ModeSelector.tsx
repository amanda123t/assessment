'use client';

import { useRouter } from 'next/navigation';
import { Activity, User, Users } from 'lucide-react';

export default function ModeSelector() {
  const router = useRouter();

  const handleIndividual = () => {
    router.push('/assessment');
  };

  const handleCollaborative = () => {
    const sessionId = crypto.randomUUID();
    router.push('/assessment/session/' + sessionId);
  };

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
            Como você quer realizar o diagnóstico?
          </h2>
          <p className="text-base text-gray-500 mb-10">
            Escolha o modo que melhor se adapta à sua equipe.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Individual */}
            <button
              onClick={handleIndividual}
              className="group flex flex-col items-center bg-white border-2 border-gray-200 hover:border-blue-500 hover:shadow-lg rounded-2xl px-6 py-8 text-left transition-all duration-200"
            >
              <div className="w-12 h-12 rounded-full bg-blue-100 group-hover:bg-blue-200 flex items-center justify-center mb-4 transition-colors">
                <User size={22} className="text-blue-600" strokeWidth={1.75} />
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-2 group-hover:text-blue-700 transition-colors">
                Avaliação individual
              </h3>
              <p className="text-sm text-gray-500 text-center">
                Responda sozinho, sem cadastro. As respostas ficam armazenadas localmente.
              </p>
            </button>

            {/* Collaborative */}
            <button
              onClick={handleCollaborative}
              className="group flex flex-col items-center bg-white border-2 border-gray-200 hover:border-violet-500 hover:shadow-lg rounded-2xl px-6 py-8 text-left transition-all duration-200"
            >
              <div className="w-12 h-12 rounded-full bg-violet-100 group-hover:bg-violet-200 flex items-center justify-center mb-4 transition-colors">
                <Users size={22} className="text-violet-600" strokeWidth={1.75} />
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-2 group-hover:text-violet-700 transition-colors">
                Avaliação colaborativa
              </h3>
              <p className="text-sm text-gray-500 text-center">
                Múltiplos participantes respondem juntos. As respostas ficam salvas na nuvem.
              </p>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
