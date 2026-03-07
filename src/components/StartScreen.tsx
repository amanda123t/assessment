'use client';

interface Props {
  onStart: () => void;
}

export default function StartScreen({ onStart }: Props) {
  const features = [
    { icon: '🔍', title: 'Avaliação Estruturada', desc: 'Avalie subprocessos com 6 critérios objetivos' },
    { icon: '📊', title: 'Ranking de Oportunidades', desc: 'Identifique onde estão os maiores ganhos de eficiência' },
    { icon: '📈', title: 'Visualização Gráfica', desc: 'Gráficos interativos para facilitar a tomada de decisão' },
    { icon: '📥', title: 'Exportação Excel', desc: 'Exporte o relatório completo para apresentações' },
  ];

  const criteria = [
    'Volume Operacional',
    'Pessoas Envolvidas',
    'Tempo de Execução',
    'Retrabalho / Erros',
    'Uso de Sistemas / Planilhas',
    'Integrações entre Sistemas',
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-6 py-4 shadow-sm">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-base font-bold text-gray-900">OEA</h1>
            <p className="text-xs text-gray-500">Operational Efficiency Assessment</p>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <div className="max-w-3xl w-full text-center">
          <span className="inline-block bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full mb-6 uppercase tracking-wide">
            Consultoria de Eficiência
          </span>
          <h2 className="text-4xl font-extrabold text-gray-900 mb-4 leading-tight">
            Avaliação de{' '}
            <span className="text-blue-600">Eficiência Operacional</span>
          </h2>
          <p className="text-lg text-gray-500 mb-10 max-w-xl mx-auto">
            Identifique subprocessos com alto potencial de melhoria e priorize iniciativas
            de transformação com base em dados objetivos.
          </p>

          <button
            onClick={onStart}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-4 rounded-xl text-base shadow-lg hover:shadow-xl transition-all duration-200 group"
          >
            Iniciar Avaliação
            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
        </div>

        {/* Features */}
        <div className="max-w-4xl w-full mt-16 grid grid-cols-2 md:grid-cols-4 gap-4">
          {features.map((f) => (
            <div key={f.title} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="text-2xl mb-2">{f.icon}</div>
              <h3 className="font-semibold text-gray-800 text-sm mb-1">{f.title}</h3>
              <p className="text-xs text-gray-500">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Criteria */}
        <div className="max-w-4xl w-full mt-8 bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <span className="w-5 h-5 bg-blue-600 rounded text-white flex items-center justify-center text-xs">✓</span>
            Critérios de Avaliação (pontuados de 1 a 5)
          </h3>
          <div className="flex flex-wrap gap-2">
            {criteria.map((c) => (
              <span key={c} className="bg-blue-50 text-blue-700 text-xs font-medium px-3 py-1.5 rounded-lg border border-blue-100">
                {c}
              </span>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
