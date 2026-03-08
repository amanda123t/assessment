'use client';

interface Props {
  onStart: () => void;
}

export default function StartScreen({ onStart }: Props) {
  const features = [
    { title: 'Avaliação Estruturada', desc: 'Avalie subprocessos com 6 critérios objetivos' },
    { title: 'Ranking de Oportunidades', desc: 'Identifique onde estão os maiores ganhos de eficiência' },
    { title: 'Visualização Gráfica', desc: 'Gráficos interativos para facilitar a tomada de decisão' },
    { title: 'Exportação Excel', desc: 'Exporte o relatório completo para apresentações' },
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
        <div className="max-w-5xl mx-auto">
          <h1 className="text-base font-bold text-gray-900">OEA</h1>
          <p className="text-xs text-gray-500">Operational Efficiency Assessment</p>
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
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-4 rounded-xl text-base shadow-lg hover:shadow-xl transition-all duration-200"
          >
            Iniciar Avaliação
          </button>
        </div>

        {/* Features */}
        <div className="max-w-4xl w-full mt-16 grid grid-cols-2 md:grid-cols-4 gap-4">
          {features.map((f) => (
            <div key={f.title} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
              <h3 className="font-semibold text-gray-800 text-sm mb-1">{f.title}</h3>
              <p className="text-xs text-gray-500">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Criteria */}
        <div className="max-w-4xl w-full mt-8 bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">
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
