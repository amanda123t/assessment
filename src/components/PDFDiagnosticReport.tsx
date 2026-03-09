'use client';

import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { SubprocessAssessment, AssessmentIdentification } from '@/types';
import { RankedAssessment } from '@/lib/ranking';
import { RoadmapItem, RoadmapCategory } from '@/lib/automationRoadmap';

interface Props {
  assessments: SubprocessAssessment[];
  ranked: RankedAssessment[];
  roadmap: RoadmapItem[];
  identification?: AssessmentIdentification;
  generatedAt?: string;
}

const CATEGORY_LABELS: Record<RoadmapCategory, string> = {
  'quick-wins':     'Quick Wins — 0 a 3 meses',
  'strategic':      'Iniciativas Estratégicas — 3 a 6 meses',
  'transformation': 'Transformação Operacional — 6 a 12 meses',
};

const CATEGORY_BG: Record<RoadmapCategory, string> = {
  'quick-wins':     '#f0fdf4',
  'strategic':      '#eff6ff',
  'transformation': '#f5f3ff',
};

const CATEGORY_TEXT: Record<RoadmapCategory, string> = {
  'quick-wins':     '#166534',
  'strategic':      '#1e40af',
  'transformation': '#5b21b6',
};

const PRIORITY_COLOR: Record<string, string> = {
  Alta:  '#dc2626',
  Média: '#d97706',
  Baixa: '#6b7280',
};

function getPotentialLabel(score: number): { label: string; color: string } {
  if (score >= 24) return { label: 'Muito Alto', color: '#dc2626' };
  if (score >= 20) return { label: 'Alto',       color: '#d97706' };
  if (score >= 16) return { label: 'Médio',      color: '#a16207' };
  return               { label: 'Baixo',      color: '#6b7280' };
}

const s = StyleSheet.create({
  page: {
    padding: 32,
    fontSize: 11,
    fontFamily: 'Helvetica',
    color: '#111827',
    backgroundColor: '#ffffff',
  },

  // ── Header ────────────────────────────────────────────────────────────────
  header: {
    backgroundColor: '#1e40af',
    borderRadius: 4,
    padding: 20,
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#bfdbfe',
    marginBottom: 2,
  },
  headerDate: {
    fontSize: 9,
    color: '#93c5fd',
  },

  // ── Section title ─────────────────────────────────────────────────────────
  sectionTitle: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: '#1e40af',
    marginTop: 16,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1.5,
    borderBottomColor: '#e5e7eb',
    borderBottomStyle: 'solid',
  },

  // ── Summary cards row ─────────────────────────────────────────────────────
  cardsRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  card: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderStyle: 'solid',
    borderRadius: 4,
    padding: 8,
    alignItems: 'center',
    marginRight: 6,
  },
  cardLast: {
    marginRight: 0,
  },
  cardValue: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 2,
  },
  cardLabel: {
    fontSize: 8,
    color: '#6b7280',
  },

  // ── Indicator cards ───────────────────────────────────────────────────────
  indicatorCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderStyle: 'solid',
    borderRadius: 4,
    padding: 8,
    marginRight: 6,
  },
  indicatorCardLast: {
    marginRight: 0,
  },
  indicatorLabel: {
    fontSize: 8,
    color: '#6b7280',
    marginBottom: 3,
  },
  indicatorValue: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
  },

  // ── Table ─────────────────────────────────────────────────────────────────
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    borderBottomStyle: 'solid',
    paddingVertical: 5,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    borderBottomStyle: 'solid',
    paddingVertical: 5,
  },
  tableRowAlt: {
    backgroundColor: '#f9fafb',
  },
  th: {
    paddingHorizontal: 5,
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#374151',
  },
  td: {
    paddingHorizontal: 5,
    fontSize: 9,
    color: '#111827',
  },

  // ── Roadmap ───────────────────────────────────────────────────────────────
  categoryBadge: {
    borderRadius: 4,
    paddingVertical: 5,
    paddingHorizontal: 8,
    marginTop: 10,
    marginBottom: 5,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
  },

  // ── Matrix ────────────────────────────────────────────────────────────────
  matrixGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  matrixQuadrant: {
    width: '48%',
    borderWidth: 1,
    borderStyle: 'solid',
    borderRadius: 4,
    padding: 8,
    marginBottom: 8,
    marginRight: '2%',
  },
  matrixQuadrantTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  matrixItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  matrixItemName: {
    fontSize: 8,
    color: '#111827',
    flex: 1,
    paddingRight: 4,
  },
  matrixItemScore: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
  },
  matrixEmpty: {
    fontSize: 8,
    color: '#9ca3af',
  },

  // ── CTA ───────────────────────────────────────────────────────────────────
  ctaBox: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderStyle: 'solid',
    borderRadius: 6,
    padding: 16,
    marginTop: 20,
    marginBottom: 20,
  },
  ctaTitle: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: '#1e3a5f',
    marginBottom: 6,
  },
  ctaText: {
    fontSize: 10,
    color: '#374151',
    marginBottom: 2,
  },
  ctaBullet: {
    fontSize: 10,
    color: '#374151',
    marginBottom: 3,
    marginLeft: 8,
  },
  ctaButton: {
    marginTop: 10,
    backgroundColor: '#2563eb',
    borderRadius: 4,
    paddingVertical: 7,
    paddingHorizontal: 14,
    alignSelf: 'flex-start',
  },
  ctaButtonText: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
  },

  // ── Footer ────────────────────────────────────────────────────────────────
  footer: {
    marginTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    borderTopStyle: 'solid',
    paddingTop: 8,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 8,
    color: '#9ca3af',
  },
});

function fmt(n: number): string {
  return n.toLocaleString('pt-BR');
}

function fmtCurrency(n: number): string {
  return `R$ ${n.toLocaleString('pt-BR')}`;
}

export default function PDFDiagnosticReport({ assessments, ranked, roadmap, identification, generatedAt }: Props) {
  const summary = {
    alta:  ranked.filter(r => r.priority === 'Alta').length,
    media: ranked.filter(r => r.priority === 'Média').length,
    baixa: ranked.filter(r => r.priority === 'Baixa').length,
  };

  const totalAnnualHours     = assessments.reduce((acc, a) => acc + a.annualHours, 0);
  const totalSavingsHours    = assessments.reduce((acc, a) => acc + a.automationSavingsHours, 0);
  const totalFinancialImpact = assessments.reduce((acc, a) => acc + a.financialImpact, 0);


  const roadmapGroups = (['quick-wins', 'strategic', 'transformation'] as RoadmapCategory[])
    .map(cat => ({ cat, items: roadmap.filter(r => r.roadmapCategory === cat) }))
    .filter(g => g.items.length > 0);

  return (
    <Document>
      <Page size="A4" style={s.page}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <View style={s.header}>
          <Text style={s.headerTitle}>Diagnóstico de Automação Operacional</Text>
          <Text style={s.headerSubtitle}>Relatório de Oportunidades de Automação</Text>
          {identification && (
            <>
              <Text style={s.headerDate}>
                Empresa: {identification.company}  ·  Área: {identification.area}
              </Text>
              <Text style={s.headerDate}>
                Respondente: {identification.respondentName}
              </Text>
            </>
          )}
          {generatedAt && (
            <Text style={s.headerDate}>Gerado em: {generatedAt}</Text>
          )}
        </View>

        {/* ── Resumo do Diagnóstico ───────────────────────────────────────── */}
        <Text style={s.sectionTitle}>Resumo do Diagnóstico</Text>
        <View style={s.cardsRow}>
          {([
            { label: 'Prioridade Alta',  value: String(summary.alta),   color: '#dc2626' },
            { label: 'Prioridade Média', value: String(summary.media),  color: '#d97706' },
            { label: 'Prioridade Baixa', value: String(summary.baixa),  color: '#6b7280' },
            { label: 'Total Avaliados',  value: String(ranked.length),  color: '#111827' },
          ] as const).map(({ label, value, color }, i, arr) => (
            <View key={label} style={[s.card, i === arr.length - 1 ? s.cardLast : {}]}>
              <Text style={[s.cardValue, { color }]}>{value}</Text>
              <Text style={s.cardLabel}>{label}</Text>
            </View>
          ))}
        </View>

        {/* ── Indicadores ────────────────────────────────────────────────── */}
        <Text style={s.sectionTitle}>Indicadores</Text>
        <View style={s.cardsRow}>
          {([
            { label: 'Horas Anuais Mapeadas',      value: `${fmt(totalAnnualHours)} h`,      color: '#111827' },
            { label: 'Potencial de Economia',       value: `${fmt(totalSavingsHours)} h/ano`, color: '#059669' },
            { label: 'Impacto Financeiro Estimado', value: fmtCurrency(totalFinancialImpact), color: '#059669' },
          ] as const).map(({ label, value, color }, i, arr) => (
            <View key={label} style={[s.indicatorCard, i === arr.length - 1 ? s.indicatorCardLast : {}]}>
              <Text style={s.indicatorLabel}>{label}</Text>
              <Text style={[s.indicatorValue, { color }]}>{value}</Text>
            </View>
          ))}
        </View>

        {/* ── Ranking de Processos ────────────────────────────────────────── */}
        <Text style={s.sectionTitle}>Ranking de Processos</Text>
        <View style={s.tableHeaderRow}>
          <Text style={[s.th, { width: '5%' }]}>#</Text>
          <Text style={[s.th, { width: '30%' }]}>Processo</Text>
          <Text style={[s.th, { width: '37%' }]}>Subprocesso</Text>
          <Text style={[s.th, { width: '12%', textAlign: 'center' }]}>Score</Text>
          <Text style={[s.th, { width: '16%', textAlign: 'center' }]}>Prioridade</Text>
        </View>
        {ranked.map((item, i) => {
          const prLabel = item.totalScore >= 20 ? 'Alta' : item.totalScore >= 14 ? 'Média' : 'Baixa';
          const prColor = item.totalScore >= 20 ? '#dc2626' : item.totalScore >= 14 ? '#d97706' : '#6b7280';
          return (
            <View key={item.subprocessId} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}>
              <Text style={[s.td, { width: '5%', color: '#6b7280' }]}>{item.rank}</Text>
              <Text style={[s.td, { width: '30%' }]}>{item.processName}</Text>
              <Text style={[s.td, { width: '37%' }]}>{item.subprocessName}</Text>
              <Text style={[s.td, { width: '12%', textAlign: 'center', color: prColor }]}>{item.totalScore}</Text>
              <Text style={[s.td, { width: '16%', textAlign: 'center', color: prColor }]}>{prLabel}</Text>
            </View>
          );
        })}

        {/* ── Ranking de Oportunidades ────────────────────────────────────── */}
        <Text style={s.sectionTitle}>Ranking de Oportunidades</Text>
        <View style={s.tableHeaderRow}>
          <Text style={[s.th, { width: '5%' }]}>#</Text>
          <Text style={[s.th, { width: '33%' }]}>Subprocesso</Text>
          <Text style={[s.th, { width: '24%' }]}>Macroprocesso</Text>
          <Text style={[s.th, { width: '10%', textAlign: 'center' }]}>Score</Text>
          <Text style={[s.th, { width: '12%', textAlign: 'center' }]}>Prioridade</Text>
          <Text style={[s.th, { width: '16%', textAlign: 'right' }]}>Economia Est.</Text>
        </View>
        {ranked.map((item, i) => (
          <View key={item.subprocessId} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}>
            <Text style={[s.td, { width: '5%', color: '#6b7280' }]}>{item.rank}</Text>
            <Text style={[s.td, { width: '33%' }]}>{item.subprocessName}</Text>
            <Text style={[s.td, { width: '24%', color: '#6b7280' }]}>{item.macroprocessName}</Text>
            <Text style={[s.td, { width: '10%', textAlign: 'center', color: PRIORITY_COLOR[item.priority] ?? '#111827' }]}>
              {item.totalScore}
            </Text>
            <Text style={[s.td, { width: '12%', textAlign: 'center', color: PRIORITY_COLOR[item.priority] ?? '#111827' }]}>
              {item.priority}
            </Text>
            <Text style={[s.td, { width: '16%', textAlign: 'right', color: '#059669' }]}>
              {fmtCurrency(item.financialImpact)}
            </Text>
          </View>
        ))}

        {/* ── Roadmap de Automação ────────────────────────────────────────── */}
        <Text style={s.sectionTitle}>Roadmap de Automação</Text>
        {roadmapGroups.map(({ cat, items }) => (
          <View key={cat}>
            <View style={[s.categoryBadge, { backgroundColor: CATEGORY_BG[cat] }]}>
              <Text style={[s.categoryBadgeText, { color: CATEGORY_TEXT[cat] }]}>
                {CATEGORY_LABELS[cat]}
              </Text>
            </View>
            <View style={s.tableHeaderRow}>
              <Text style={[s.th, { width: '42%' }]}>Subprocesso</Text>
              <Text style={[s.th, { width: '16%', textAlign: 'center' }]}>Automação</Text>
              <Text style={[s.th, { width: '16%', textAlign: 'center' }]}>Impacto</Text>
              <Text style={[s.th, { width: '26%', textAlign: 'right' }]}>Economia Est.</Text>
            </View>
            {items.map((item, i) => (
              <View key={item.subprocessId} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}>
                <Text style={[s.td, { width: '42%' }]}>{item.subprocessName}</Text>
                <Text style={[s.td, { width: '16%', textAlign: 'center' }]}>{item.automationScore}%</Text>
                <Text style={[s.td, { width: '16%', textAlign: 'center' }]}>{item.impactScore}%</Text>
                <Text style={[s.td, { width: '26%', textAlign: 'right', color: '#059669' }]}>
                  {fmtCurrency(item.estimatedSavings)}
                </Text>
              </View>
            ))}
          </View>
        ))}

        {/* ── Matriz de Priorização de Automação ──────────────────────────── */}
        <Text style={s.sectionTitle}>Matriz de Priorização de Automação</Text>
        <View style={s.matrixGrid}>
          {([
            { label: 'Prioridade Imediata',       min: 24, max: Infinity, bg: '#fef2f2', border: '#fecaca', color: '#b91c1c' },
            { label: 'Alta Prioridade',           min: 20, max: 24,       bg: '#fff7ed', border: '#fed7aa', color: '#c2410c' },
            { label: 'Oportunidade de Automação', min: 16, max: 20,       bg: '#eff6ff', border: '#bfdbfe', color: '#1d4ed8' },
            { label: 'Baixa Prioridade',          min: 0,  max: 16,       bg: '#f9fafb', border: '#e5e7eb', color: '#6b7280' },
          ] as { label: string; min: number; max: number; bg: string; border: string; color: string }[]).map(({ label, min, max, bg, border, color }) => {
            const items = ranked.filter(r => r.totalScore >= min && r.totalScore < max);
            return (
              <View key={label} style={[s.matrixQuadrant, { backgroundColor: bg, borderColor: border }]}>
                <Text style={[s.matrixQuadrantTitle, { color }]}>{label}</Text>
                {items.length === 0
                  ? <Text style={s.matrixEmpty}>Nenhum processo nesta categoria</Text>
                  : items.map(r => (
                    <View key={r.subprocessId} style={s.matrixItem}>
                      <Text style={s.matrixItemName}>{r.subprocessName}</Text>
                      <Text style={[s.matrixItemScore, { color }]}>{r.totalScore}</Text>
                    </View>
                  ))
                }
              </View>
            );
          })}
        </View>

        {/* ── Ranking de Potencial de Automação ───────────────────────────── */}
        <Text style={s.sectionTitle}>Ranking de Potencial de Automação</Text>
        <View style={s.tableHeaderRow}>
          <Text style={[s.th, { width: '8%', textAlign: 'center' }]}>Rank</Text>
          <Text style={[s.th, { width: '54%' }]}>Processo</Text>
          <Text style={[s.th, { width: '18%', textAlign: 'center' }]}>Pontuação</Text>
          <Text style={[s.th, { width: '20%', textAlign: 'center' }]}>Potencial</Text>
        </View>
        {ranked.slice(0, 10).map((item, i) => {
          const potential = getPotentialLabel(item.totalScore);
          return (
            <View key={item.subprocessId} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}>
              <Text style={[s.td, { width: '8%', textAlign: 'center', color: '#9ca3af' }]}>{item.rank}</Text>
              <Text style={[s.td, { width: '54%' }]}>{item.subprocessName}</Text>
              <Text style={[s.td, { width: '18%', textAlign: 'center', fontFamily: 'Helvetica-Bold' }]}>{item.totalScore}</Text>
              <Text style={[s.td, { width: '20%', textAlign: 'center', fontFamily: 'Helvetica-Bold', color: potential.color }]}>{potential.label}</Text>
            </View>
          );
        })}

        {/* ── Próximos Passos (CTA) ───────────────────────────────────────── */}
        <View style={s.ctaBox}>
          <Text style={s.ctaTitle}>Próximos Passos</Text>
          <Text style={s.ctaText}>Este diagnóstico identificou processos com alto potencial de automação.</Text>
          <Text style={s.ctaText}>A Meta pode apoiar sua organização nas próximas etapas com:</Text>
          {[
            'Análise e redesenho de processos',
            'Automação com RPA e Inteligência Artificial',
            'Implementação de programas de automação',
            'Gestão da mudança para transformação digital',
          ].map((item) => (
            <Text key={item} style={s.ctaBullet}>• {item}</Text>
          ))}
          <View style={s.ctaButton}>
            <Text style={s.ctaButtonText}>Falar com a Meta sobre automação — meta.com.br/contato</Text>
          </View>
        </View>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <View style={s.footer}>
          <Text style={s.footerText}>
            Relatório gerado automaticamente — Diagnóstico de Automação Operacional
          </Text>
        </View>

      </Page>
    </Document>
  );
}
