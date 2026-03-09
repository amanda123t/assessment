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
        <img src="/assets/meta-logo.png" alt="Meta logo" style={{ height: '32px', width: 'auto', marginBottom: '12px', display: 'block' }} />
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

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <div style={{ borderTop: '1px solid #e5e7eb', padding: '12px 32px', textAlign: 'center' }}>
        <span style={{ fontSize: '10px', color: '#9ca3af' }}>
          Relatório gerado automaticamente — Diagnóstico de Automação Operacional
        </span>
      </div>

    </div>
  );
}
