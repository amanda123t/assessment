'use client';

import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
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

export default function PDFDiagnosticReport({ assessments, ranked, roadmap }: Props) {
  const summary = {
    alta:  ranked.filter(r => r.priority === 'Alta').length,
    media: ranked.filter(r => r.priority === 'Média').length,
    baixa: ranked.filter(r => r.priority === 'Baixa').length,
  };

  const totalAnnualHours     = assessments.reduce((acc, a) => acc + a.annualHours, 0);
  const totalSavingsHours    = assessments.reduce((acc, a) => acc + a.automationSavingsHours, 0);
  const totalFinancialImpact = assessments.reduce((acc, a) => acc + a.financialImpact, 0);

  const generatedAt = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

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
          <Text style={s.headerDate}>Gerado em: {generatedAt}</Text>
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
