'use client';

import { SubprocessAssessment } from '@/types';
import { RankedAssessment } from '@/lib/ranking';
import { RoadmapItem, RoadmapCategory } from '@/lib/automationRoadmap';

interface Props {
  assessments: SubprocessAssessment[];
  ranked: RankedAssessment[];
  roadmap: RoadmapItem[];
}

const CATEGORY_LABELS: Record<RoadmapCategory, string> = {
  'quick-wins':     'Quick Wins — 0 a 3 meses',
  'strategic':      'Iniciativas Estratégicas — 3 a 6 meses',
  'transformation': 'Transformação Operacional — 6 a 12 meses',
};

const CATEGORY_COLORS: Record<RoadmapCategory, { bg: string; border: string; text: string }> = {
  'quick-wins':     { bg: '#f0fdf4', border: '#86efac', text: '#166534' },
  'strategic':      { bg: '#eff6ff', border: '#93c5fd', text: '#1e40af' },
  'transformation': { bg: '#f5f3ff', border: '#c4b5fd', text: '#5b21b6' },
};

const PRIORITY_COLOR: Record<string, string> = {
  Alta:  '#dc2626',
  Média: '#d97706',
  Baixa: '#6b7280',
};

function fmt(n: number): string {
  return n.toLocaleString('pt-BR');
}

function fmtCurrency(n: number): string {
  return `R$ ${n.toLocaleString('pt-BR')}`;
}

export default function PDFReport({ assessments, ranked, roadmap }: Props) {
  const summary = {
    alta:  ranked.filter(r => r.priority === 'Alta').length,
    media: ranked.filter(r => r.priority === 'Média').length,
    baixa: ranked.filter(r => r.priority === 'Baixa').length,
  };

  const totalAnnualHours    = assessments.reduce((s, a) => s + a.annualHours, 0);
  const totalSavingsHours   = assessments.reduce((s, a) => s + a.automationSavingsHours, 0);
  const totalFinancialImpact = assessments.reduce((s, a) => s + a.financialImpact, 0);

  const generatedAt = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  const roadmapByCategory = (['quick-wins', 'strategic', 'transformation'] as RoadmapCategory[])
    .map(cat => ({ cat, items: roadmap.filter(r => r.roadmapCategory === cat) }))
    .filter(g => g.items.length > 0);

  return (
    <div style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '12px', color: '#111827', backgroundColor: '#ffffff', lineHeight: '1.5' }}>

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div style={{ backgroundColor: '#1e40af', color: '#ffffff', padding: '24px 32px 20px' }}>
        <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#ffffff', marginBottom: '4px' }}>
          Diagnóstico de Automação Operacional
        </div>
        <div style={{ fontSize: '12px', color: '#bfdbfe' }}>Relatório de Oportunidades de Automação</div>
        <div style={{ fontSize: '10px', color: '#93c5fd', marginTop: '4px' }}>Gerado em: {generatedAt}</div>
      </div>

      {/* ── Diagnostic Summary ───────────────────────────────────────────── */}
      <div style={{ padding: '20px 32px 0' }}>
        <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#1e40af', borderBottom: '2px solid #e5e7eb', paddingBottom: '6px', marginBottom: '14px' }}>
          Resumo do Diagnóstico
        </div>

        <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
          {[
            { label: 'Prioridade Alta',  value: summary.alta,   color: '#dc2626' },
            { label: 'Prioridade Média', value: summary.media,  color: '#d97706' },
            { label: 'Prioridade Baixa', value: summary.baixa,  color: '#6b7280' },
            { label: 'Total Avaliados',  value: ranked.length,  color: '#111827' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ flex: 1, border: '1px solid #e5e7eb', borderRadius: '6px', padding: '10px', textAlign: 'center' }}>
              <div style={{ fontSize: '22px', fontWeight: 'bold', color }}>{value}</div>
              <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '2px' }}>{label}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
          {[
            { label: 'Horas Anuais Mapeadas',      value: `${fmt(totalAnnualHours)} h`,       color: '#111827' },
            { label: 'Potencial de Economia',       value: `${fmt(totalSavingsHours)} h/ano`,  color: '#059669' },
            { label: 'Impacto Financeiro Estimado', value: fmtCurrency(totalFinancialImpact),  color: '#059669' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ flex: 1, border: '1px solid #e5e7eb', borderRadius: '6px', padding: '10px' }}>
              <div style={{ fontSize: '10px', color: '#6b7280', marginBottom: '3px' }}>{label}</div>
              <div style={{ fontSize: '15px', fontWeight: 'bold', color }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Opportunity Ranking ──────────────────────────────────────────── */}
      <div style={{ padding: '0 32px 20px' }}>
        <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#1e40af', borderBottom: '2px solid #e5e7eb', paddingBottom: '6px', marginBottom: '12px' }}>
          Ranking de Oportunidades
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f3f4f6' }}>
              {['#', 'Subprocesso', 'Macroprocesso', 'Score', 'Prioridade', 'Economia Est.'].map(h => (
                <th key={h} style={{ border: '1px solid #e5e7eb', padding: '7px 10px', textAlign: h === 'Economia Est.' ? 'right' : h === 'Score' || h === 'Prioridade' ? 'center' : 'left', fontWeight: 'bold', color: '#374151' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ranked.map((item, i) => (
              <tr key={item.subprocessId} style={{ backgroundColor: i % 2 === 0 ? '#ffffff' : '#f9fafb' }}>
                <td style={{ border: '1px solid #e5e7eb', padding: '6px 10px', color: '#6b7280', fontWeight: 'bold' }}>{item.rank}</td>
                <td style={{ border: '1px solid #e5e7eb', padding: '6px 10px', color: '#111827' }}>{item.subprocessName}</td>
                <td style={{ border: '1px solid #e5e7eb', padding: '6px 10px', color: '#6b7280' }}>{item.macroprocessName}</td>
                <td style={{ border: '1px solid #e5e7eb', padding: '6px 10px', textAlign: 'center', fontWeight: 'bold', color: PRIORITY_COLOR[item.priority] }}>{item.totalScore}</td>
                <td style={{ border: '1px solid #e5e7eb', padding: '6px 10px', textAlign: 'center', fontWeight: 'bold', color: PRIORITY_COLOR[item.priority] }}>{item.priority}</td>
                <td style={{ border: '1px solid #e5e7eb', padding: '6px 10px', textAlign: 'right', color: '#059669' }}>{fmtCurrency(item.financialImpact)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Automation Roadmap ───────────────────────────────────────────── */}
      <div style={{ padding: '0 32px 24px' }}>
        <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#1e40af', borderBottom: '2px solid #e5e7eb', paddingBottom: '6px', marginBottom: '14px' }}>
          Roadmap de Automação
        </div>
        {roadmapByCategory.map(({ cat, items }) => {
          const cc = CATEGORY_COLORS[cat];
          return (
            <div key={cat} style={{ marginBottom: '16px' }}>
              <div style={{ backgroundColor: cc.bg, border: `1px solid ${cc.border}`, borderRadius: '6px', padding: '7px 12px', marginBottom: '8px' }}>
                <span style={{ fontWeight: 'bold', color: cc.text, fontSize: '12px' }}>{CATEGORY_LABELS[cat]}</span>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f3f4f6' }}>
                    {['Subprocesso', 'Automação', 'Impacto', 'Economia Est.'].map(h => (
                      <th key={h} style={{ border: '1px solid #e5e7eb', padding: '6px 10px', textAlign: h === 'Economia Est.' ? 'right' : h === 'Automação' || h === 'Impacto' ? 'center' : 'left', color: '#374151', fontWeight: 'bold' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, i) => (
                    <tr key={item.subprocessId} style={{ backgroundColor: i % 2 === 0 ? '#ffffff' : '#f9fafb' }}>
                      <td style={{ border: '1px solid #e5e7eb', padding: '6px 10px', color: '#111827' }}>
                        <div>{item.subprocessName}</div>
                        <div style={{ fontSize: '10px', color: '#6b7280' }}>{item.macroprocessName}</div>
                      </td>
                      <td style={{ border: '1px solid #e5e7eb', padding: '6px 10px', textAlign: 'center', color: '#111827' }}>{item.automationScore}%</td>
                      <td style={{ border: '1px solid #e5e7eb', padding: '6px 10px', textAlign: 'center', color: '#111827' }}>{item.impactScore}%</td>
                      <td style={{ border: '1px solid #e5e7eb', padding: '6px 10px', textAlign: 'right', color: '#059669' }}>{fmtCurrency(item.estimatedSavings)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>

      {/* ── Matriz de Priorização de Automação ──────────────────────────── */}
      {(() => {
        const matrixQuadrants = [
          { label: 'Prioridade Imediata',       min: 24, max: Infinity, bg: '#fef2f2', border: '#fecaca', title: '#b91c1c' },
          { label: 'Alta Prioridade',           min: 20, max: 24,       bg: '#fff7ed', border: '#fed7aa', title: '#c2410c' },
          { label: 'Oportunidade de Automação', min: 16, max: 20,       bg: '#eff6ff', border: '#bfdbfe', title: '#1d4ed8' },
          { label: 'Baixa Prioridade',          min: 0,  max: 16,       bg: '#f9fafb', border: '#e5e7eb', title: '#6b7280' },
        ];
        return (
          <div style={{ padding: '20px 32px 0' }}>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#1e40af', borderBottom: '2px solid #e5e7eb', paddingBottom: '6px', marginBottom: '14px' }}>
              Matriz de Priorização de Automação
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {matrixQuadrants.map(({ label, min, max, bg, border, title }) => {
                const items = ranked.filter(r => r.totalScore >= min && r.totalScore < max);
                return (
                  <div key={label} style={{ backgroundColor: bg, border: `1px solid ${border}`, borderRadius: '6px', padding: '12px' }}>
                    <div style={{ fontSize: '10px', fontWeight: 'bold', color: title, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>{label}</div>
                    {items.length === 0 ? (
                      <div style={{ fontSize: '10px', color: '#9ca3af', fontStyle: 'italic' }}>Nenhum processo nesta categoria</div>
                    ) : items.map(r => (
                      <div key={r.subprocessId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontSize: '10px', color: '#111827', flex: 1, paddingRight: '8px' }}>{r.subprocessName}</span>
                        <span style={{ fontSize: '10px', fontWeight: 'bold', color: title }}>{r.totalScore}</span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* ── Ranking de Potencial de Automação ───────────────────────────── */}
      <div style={{ padding: '20px 32px 0' }}>
        <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#1e40af', borderBottom: '2px solid #e5e7eb', paddingBottom: '6px', marginBottom: '14px' }}>
          Ranking de Potencial de Automação
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f3f4f6' }}>
              {['Rank', 'Processo', 'Pontuação', 'Potencial'].map((h) => (
                <th key={h} style={{ border: '1px solid #e5e7eb', padding: '6px 10px', textAlign: h === 'Pontuação' || h === 'Rank' || h === 'Potencial' ? 'center' : 'left', color: '#374151', fontWeight: 'bold' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ranked.slice(0, 10).map((item, i) => {
              const score = item.totalScore;
              const potential = score >= 24 ? 'Muito Alto' : score >= 20 ? 'Alto' : score >= 16 ? 'Médio' : 'Baixo';
              const potentialColor = score >= 24 ? '#dc2626' : score >= 20 ? '#d97706' : score >= 16 ? '#a16207' : '#6b7280';
              return (
                <tr key={item.subprocessId} style={{ backgroundColor: i % 2 === 0 ? '#ffffff' : '#f9fafb' }}>
                  <td style={{ border: '1px solid #e5e7eb', padding: '6px 10px', textAlign: 'center', color: '#9ca3af', fontWeight: 'bold' }}>{item.rank}</td>
                  <td style={{ border: '1px solid #e5e7eb', padding: '6px 10px', color: '#111827' }}>{item.subprocessName}</td>
                  <td style={{ border: '1px solid #e5e7eb', padding: '6px 10px', textAlign: 'center', fontWeight: 'bold', color: '#111827' }}>{item.totalScore}</td>
                  <td style={{ border: '1px solid #e5e7eb', padding: '6px 10px', textAlign: 'center', fontWeight: 'bold', color: potentialColor }}>{potential}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Próximos Passos (CTA) ────────────────────────────────────────── */}
      <div style={{ margin: '24px 32px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '20px 24px' }}>
        <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#1e3a5f', marginBottom: '6px' }}>Próximos Passos</div>
        <div style={{ fontSize: '11px', color: '#374151', marginBottom: '2px' }}>Este diagnóstico identificou processos com alto potencial de automação.</div>
        <div style={{ fontSize: '11px', color: '#374151', marginBottom: '10px' }}>A Meta pode apoiar sua organização nas próximas etapas com:</div>
        {[
          'Análise e redesenho de processos',
          'Automação com RPA e Inteligência Artificial',
          'Implementação de programas de automação',
          'Gestão da mudança para transformação digital',
        ].map((item) => (
          <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '4px' }}>
            <span style={{ color: '#3b82f6', fontSize: '14px', lineHeight: '1.2' }}>•</span>
            <span style={{ fontSize: '11px', color: '#374151' }}>{item}</span>
          </div>
        ))}
        <div style={{ marginTop: '14px' }}>
          <a
            href="https://meta.com.br/contato"
            style={{ display: 'inline-block', backgroundColor: '#2563eb', color: '#ffffff', fontSize: '11px', fontWeight: 'bold', padding: '8px 18px', borderRadius: '6px', textDecoration: 'none' }}
          >
            Falar com a Meta sobre automação
          </a>
        </div>
      </div>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <div style={{ borderTop: '1px solid #e5e7eb', padding: '12px 32px', textAlign: 'center' }}>
        <span style={{ fontSize: '10px', color: '#9ca3af' }}>
          Relatório gerado automaticamente — Diagnóstico de Automação Operacional
        </span>
      </div>

    </div>
  );
}
