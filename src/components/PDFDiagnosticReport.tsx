'use client';

import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { SubprocessAssessment, AssessmentIdentification } from '@/types';
import { RankedAssessment } from '@/lib/ranking';
import { RoadmapItem, RoadmapCategory } from '@/lib/automationRoadmap';

interface Props {
  assessments: SubprocessAssessment[];
  ranked: RankedAssessment[];
  roadmap: RoadmapItem[];
  insights?: string[];
  identification?: AssessmentIdentification;
  generatedAt?: string;
}

const CATEGORY_LABELS: Record<RoadmapCategory, string> = {
  'quick-wins':     'Quick Win',
  'strategic':      'Iniciativa Estratégica',
  'transformation': 'Transformação Operacional',
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
    backgroundColor: '#f9fafb',
  },

  // ── Header ────────────────────────────────────────────────────────────────
  header: {
    backgroundColor: '#1e40af',
    borderRadius: 6,
    padding: 20,
    marginBottom: 16,
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
  headerMeta: {
    fontSize: 9,
    color: '#93c5fd',
    marginTop: 1,
  },

  // ── Section card ──────────────────────────────────────────────────────────
  sectionCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderStyle: 'solid',
    borderRadius: 6,
    padding: 14,
    marginBottom: 14,
  },
  sectionCardTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
    marginBottom: 10,
  },

  // ── 1. Diagnóstico card (blue) ─────────────────────────────────────────────
  diagnosticoCard: {
    backgroundColor: '#1e40af',
    borderRadius: 6,
    padding: 14,
    marginBottom: 14,
  },
  diagnosticoTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
    marginBottom: 10,
  },
  metricsRow: {
    flexDirection: 'row',
  },
  metricBox: {
    flex: 1,
    backgroundColor: '#2563eb',
    borderRadius: 4,
    padding: 8,
    marginRight: 6,
  },
  metricBoxLast: {
    marginRight: 0,
  },
  metricValue: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
    marginBottom: 2,
  },
  metricLabel: {
    fontSize: 7,
    color: '#bfdbfe',
  },

  // ── 2. Distribuição de Prioridades ─────────────────────────────────────────
  priorityRow: {
    flexDirection: 'row',
  },
  priorityBox: {
    flex: 1,
    borderWidth: 1,
    borderStyle: 'solid',
    borderRadius: 4,
    padding: 10,
    marginRight: 6,
    alignItems: 'center',
  },
  priorityBoxLast: {
    marginRight: 0,
  },
  priorityCount: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 2,
  },
  priorityLabel: {
    fontSize: 8,
    color: '#6b7280',
  },

  // ── Table ─────────────────────────────────────────────────────────────────
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    borderBottomStyle: 'solid',
    paddingVertical: 5,
    borderRadius: 2,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
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

  // ── Matrix ────────────────────────────────────────────────────────────────
  matrixGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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

  // ── Roadmap flat list ──────────────────────────────────────────────────────
  roadmapStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#f3f4f6',
    borderStyle: 'solid',
    borderRadius: 6,
    padding: 10,
    marginBottom: 6,
  },
  roadmapStepCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    flexShrink: 0,
  },
  roadmapStepNumber: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
    textAlign: 'center',
  },
  roadmapStepContent: {
    flex: 1,
  },
  roadmapStepTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
    marginBottom: 2,
  },
  roadmapStepDesc: {
    fontSize: 8,
    color: '#6b7280',
  },

  // ── Insights ───────────────────────────────────────────────────────────────
  insightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  insightBullet: {
    fontSize: 10,
    color: '#f59e0b',
    marginRight: 6,
  },
  insightText: {
    fontSize: 9,
    color: '#374151',
    flex: 1,
    lineHeight: 1.4,
  },

  // ── CTA ───────────────────────────────────────────────────────────────────
  ctaBox: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderStyle: 'solid',
    borderRadius: 6,
    padding: 16,
    marginBottom: 16,
  },
  ctaTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#1e3a5f',
    marginBottom: 6,
  },
  ctaText: {
    fontSize: 9,
    color: '#374151',
    marginBottom: 2,
  },
  ctaBullet: {
    fontSize: 9,
    color: '#374151',
    marginBottom: 3,
    marginLeft: 8,
  },

  // ── Footer ────────────────────────────────────────────────────────────────
  footer: {
    marginTop: 16,
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

export default function PDFDiagnosticReport({
  assessments,
  ranked,
  roadmap,
  insights,
  identification,
  generatedAt,
}: Props) {
  const summary = {
    alta:  ranked.filter(r => r.priority === 'Alta').length,
    media: ranked.filter(r => r.priority === 'Média').length,
    baixa: ranked.filter(r => r.priority === 'Baixa').length,
  };

  const totalAnnualHours     = assessments.reduce((acc, a) => acc + a.annualHours, 0);
  const totalSavingsHours    = assessments.reduce((acc, a) => acc + a.automationSavingsHours, 0);
  const totalFinancialImpact = assessments.reduce((acc, a) => acc + a.financialImpact, 0);

  return (
    <Document>
      <Page size="A4" style={s.page}>

        {/* ── Header ──────────────────────────────────────────────────── */}
        <View style={s.header}>
          <Text style={s.headerTitle}>Diagnóstico de Automação Operacional</Text>
          <Text style={s.headerSubtitle}>Relatório de Oportunidades de Automação</Text>
          {identification && (
            <>
              <Text style={s.headerMeta}>
                Empresa: {identification.company}  ·  Área: {identification.area}
              </Text>
              <Text style={s.headerMeta}>
                Respondente: {identification.respondentName}
              </Text>
            </>
          )}
          {generatedAt && (
            <Text style={s.headerMeta}>Gerado em: {generatedAt}</Text>
          )}
        </View>

        {/* ── 1. Diagnóstico ──────────────────────────────────────────── */}
        <View style={s.diagnosticoCard}>
          <Text style={s.diagnosticoTitle}>Diagnóstico de Eficiência Operacional</Text>
          <View style={s.metricsRow}>
            {([
              { label: 'Subprocessos avaliados',       value: String(assessments.length) },
              { label: 'Esforço operacional (h/ano)',   value: fmt(totalAnnualHours) },
              { label: 'Oportunidade automação (h/ano)',value: fmt(totalSavingsHours) },
              { label: 'Economia estimada (R$/ano)',    value: fmtCurrency(totalFinancialImpact) },
            ] as const).map(({ label, value }, i, arr) => (
              <View key={label} style={[s.metricBox, i === arr.length - 1 ? s.metricBoxLast : {}]}>
                <Text style={s.metricValue}>{value}</Text>
                <Text style={s.metricLabel}>{label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── 2. Distribuição de Prioridades ──────────────────────────── */}
        <View style={s.sectionCard}>
          <Text style={s.sectionCardTitle}>Distribuição de Prioridades</Text>
          <View style={s.priorityRow}>
            {([
              { label: 'Alta Prioridade',  count: summary.alta,  color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
              { label: 'Média Prioridade', count: summary.media, color: '#d97706', bg: '#fff7ed', border: '#fed7aa' },
              { label: 'Baixa Prioridade', count: summary.baixa, color: '#6b7280', bg: '#f9fafb', border: '#e5e7eb' },
            ] as const).map(({ label, count, color, bg, border }, i, arr) => (
              <View
                key={label}
                style={[
                  s.priorityBox,
                  { backgroundColor: bg, borderColor: border },
                  i === arr.length - 1 ? s.priorityBoxLast : {},
                ]}
              >
                <Text style={[s.priorityCount, { color }]}>{count}</Text>
                <Text style={s.priorityLabel}>{label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── 3. Ranking de Potencial de Automação ────────────────────── */}
        <View style={s.sectionCard}>
          <Text style={s.sectionCardTitle}>Ranking de Potencial de Automação</Text>
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
                <Text style={[s.td, { width: '20%', textAlign: 'center', fontFamily: 'Helvetica-Bold', color: potential.color }]}>
                  {potential.label}
                </Text>
              </View>
            );
          })}
        </View>

        {/* ── 4. Matriz de Priorização de Automação ───────────────────── */}
        <View style={s.sectionCard}>
          <Text style={s.sectionCardTitle}>Matriz de Priorização de Automação</Text>
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
        </View>

        {/* ── 5. Roadmap de Automação Sugerido ────────────────────────── */}
        {roadmap.length > 0 && (
          <View style={s.sectionCard}>
            <Text style={s.sectionCardTitle}>Roadmap de Automação Sugerido</Text>
            {roadmap.map((item, i) => (
              <View key={item.subprocessId} style={s.roadmapStep}>
                <View style={s.roadmapStepCircle}>
                  <Text style={s.roadmapStepNumber}>{i + 1}</Text>
                </View>
                <View style={s.roadmapStepContent}>
                  <Text style={s.roadmapStepTitle}>{item.subprocessName}</Text>
                  <Text style={s.roadmapStepDesc}>
                    {CATEGORY_LABELS[item.roadmapCategory]} · {item.timeline} · Economia est.: {fmtCurrency(item.estimatedSavings)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ── 6. Insights do Diagnóstico ──────────────────────────────── */}
        {insights && insights.length > 0 && (
          <View style={[s.sectionCard, { borderColor: '#fde68a' }]}>
            <Text style={s.sectionCardTitle}>Insights do Diagnóstico</Text>
            {insights.map((insight, i) => (
              <View key={i} style={s.insightItem}>
                <Text style={s.insightBullet}>•</Text>
                <Text style={s.insightText}>{insight}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Próximos Passos (CTA) ────────────────────────────────────── */}
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
        </View>

        {/* ── Footer ──────────────────────────────────────────────────── */}
        <View style={s.footer}>
          <Text style={s.footerText}>
            Relatório gerado automaticamente — Diagnóstico de Automação Operacional — meta.com.br/contato
          </Text>
        </View>

      </Page>
    </Document>
  );
}
