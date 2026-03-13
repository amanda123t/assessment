'use client';

import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { SubprocessAssessment, AssessmentIdentification } from '@/types';
import { RankedAssessment } from '@/lib/ranking';
import { normalizeScore } from '@/lib/scoring';
import { RoadmapItem, RoadmapCategory } from '@/lib/automationRoadmap';
import { FTE_HOURS_YEAR, DEFAULT_HOURLY_COST } from '@/lib/impactCalculator';

interface RefinedImpact {
  annualHours: number; savingsHours: number; fteEquivalent: number;
  capacityGain: number; financialImpact: number; hourlyCost: number;
}

interface Props {
  assessments: SubprocessAssessment[];
  ranked: RankedAssessment[];
  roadmap: RoadmapItem[];
  insights?: string[];
  identification?: AssessmentIdentification;
  generatedAt?: string;
  refinedImpact?: RefinedImpact;
}

// ── Constants ────────────────────────────────────────────────────────────────

const NAVY  = '#1e3a8a';
const BLUE  = '#2563eb';
const LBLUE = '#eff6ff';

const CATEGORY_LABELS: Record<RoadmapCategory, string> = {
  'quick-wins':     'Quick Win',
  'strategic':      'Iniciativa Estratégica',
  'transformation': 'Transformação Operacional',
  'low-priority':   'Baixa Prioridade',
};

function getPotential(score: number): { label: string; color: string } {
  if (score >= 18) return { label: 'Muito Alto', color: '#dc2626' };
  if (score >= 15) return { label: 'Alto',       color: '#d97706' };
  if (score >= 12) return { label: 'Médio',      color: '#a16207' };
  return               { label: 'Baixo',      color: '#6b7280' };
}

// ── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({

  // pages
  coverPage: { padding: 0, fontFamily: 'Helvetica', backgroundColor: '#ffffff' },
  page: {
    paddingHorizontal: 44,
    paddingTop: 36,
    paddingBottom: 50,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#111827',
    backgroundColor: '#ffffff',
  },

  // ── Cover ──────────────────────────────────────────────────────────────────
  coverTop: {
    backgroundColor: NAVY,
    height: 390,
    paddingHorizontal: 48,
    paddingTop: 52,
    paddingBottom: 48,
    justifyContent: 'flex-end',
  },
  coverAccent: { width: 36, height: 3, backgroundColor: '#60a5fa', marginBottom: 18 },
  coverBrand:  { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#93c5fd', marginBottom: 20 },
  coverTitle:  { fontSize: 28, fontFamily: 'Helvetica-Bold', color: '#ffffff', lineHeight: 1.2, marginBottom: 10 },
  coverSub:    { fontSize: 12, color: '#93c5fd', lineHeight: 1.5 },

  coverBottom: { flex: 1, paddingHorizontal: 48, paddingTop: 36, paddingBottom: 36, justifyContent: 'space-between' },
  coverInfoRow: { flexDirection: 'row' },
  coverInfoCol: { flex: 1, marginRight: 24 },
  coverInfoColLast: { flex: 1 },
  coverCaption: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#9ca3af', marginBottom: 4, marginTop: 18 },
  coverVal:     { fontSize: 13, fontFamily: 'Helvetica-Bold', color: '#111827' },
  coverValSub:  { fontSize: 9, color: '#6b7280', marginTop: 2 },
  coverFooter:  { fontSize: 8, color: '#d1d5db', borderTopWidth: 0.5, borderTopColor: '#e5e7eb', borderTopStyle: 'solid', paddingTop: 12 },

  // ── Section header ─────────────────────────────────────────────────────────
  secHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 8,
    marginBottom: 10,
    marginTop: 18,
    borderBottomWidth: 2,
    borderBottomColor: NAVY,
    borderBottomStyle: 'solid',
  },
  secHeaderFirst: {
    marginTop: 0,
  },
  secNum: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: BLUE,
    backgroundColor: LBLUE,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 3,
    marginRight: 10,
  },
  secTitle: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: NAVY },

  subsecTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#374151',
    textTransform: 'uppercase',
    marginTop: 12,
    marginBottom: 6,
  },

  // ── Summary paragraph ──────────────────────────────────────────────────────
  summaryPara: {
    fontSize: 10,
    color: '#374151',
    lineHeight: 1.6,
    backgroundColor: LBLUE,
    borderLeftWidth: 3,
    borderLeftColor: BLUE,
    borderLeftStyle: 'solid',
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
  },

  // ── KPI cards ──────────────────────────────────────────────────────────────
  kpiRow: { flexDirection: 'row', marginBottom: 10 },
  kpiCard: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderTopWidth: 3,
    borderTopColor: BLUE,
    borderTopStyle: 'solid',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderStyle: 'solid',
    borderRadius: 5,
    padding: 8,
    marginRight: 8,
    alignItems: 'center',
  },
  kpiCardLast: { marginRight: 0 },
  kpiVal:   { fontSize: 16, fontFamily: 'Helvetica-Bold', color: NAVY, marginBottom: 3, textAlign: 'center' },
  kpiLabel: { fontSize: 7, color: '#6b7280', textAlign: 'center', lineHeight: 1.4 },

  // ── Top 3 ──────────────────────────────────────────────────────────────────
  top3Row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 5,
    padding: 8,
    marginBottom: 5,
    borderLeftWidth: 3,
    borderLeftStyle: 'solid',
  },
  top3Rank:    { width: 26, fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#d1d5db' },
  top3Content: { flex: 1, paddingRight: 8 },
  top3Name:    { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#111827', marginBottom: 2 },
  top3Meta:    { fontSize: 7, color: '#9ca3af' },
  top3Score:   { fontSize: 16, fontFamily: 'Helvetica-Bold', textAlign: 'center', width: 32 },
  top3Badge:   { fontSize: 7, fontFamily: 'Helvetica-Bold', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3, marginLeft: 8, color: '#ffffff' },

  // ── Overview cards ─────────────────────────────────────────────────────────
  ovRow: { flexDirection: 'row' },
  ovCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderStyle: 'solid',
    borderRadius: 5,
    padding: 10,
    marginRight: 8,
  },
  ovCardLast: { marginRight: 0 },
  ovCardTitle: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#9ca3af', textTransform: 'uppercase', marginBottom: 8 },
  ovDataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: '#f3f4f6',
    borderBottomStyle: 'solid',
  },
  ovDataLabel: { fontSize: 8.5, color: '#6b7280' },
  ovDataVal:   { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#111827' },

  // ── Table ──────────────────────────────────────────────────────────────────
  tblWrap: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderStyle: 'solid',
    borderRadius: 5,
  },
  tblHead: {
    flexDirection: 'row',
    backgroundColor: NAVY,
    paddingVertical: 7,
    paddingHorizontal: 6,
  },
  tblRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: '#f3f4f6',
    borderBottomStyle: 'solid',
  },
  tblRowAlt: { backgroundColor: '#f9fafb' },
  th: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#ffffff', paddingHorizontal: 3 },
  td: { fontSize: 8.5, color: '#111827', paddingHorizontal: 3 },

  // ── Matrix ─────────────────────────────────────────────────────────────────
  matGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  matQuad: {
    width: '48%',
    borderWidth: 1,
    borderStyle: 'solid',
    borderRadius: 5,
    padding: 8,
    marginBottom: 8,
    marginRight: '2%',
  },
  matTitle: { fontSize: 8, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', marginBottom: 6 },
  matItem:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  matName:  { fontSize: 7.5, color: '#374151', flex: 1, paddingRight: 6 },
  matBadge: { fontSize: 7, fontFamily: 'Helvetica-Bold', paddingHorizontal: 4, paddingVertical: 2, borderRadius: 3 },
  matEmpty: { fontSize: 7.5, color: '#9ca3af' },

  // ── Roadmap ────────────────────────────────────────────────────────────────
  rmStep: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  rmCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: NAVY,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 1,
    flexShrink: 0,
  },
  rmNum:     { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#ffffff' },
  rmContent: { flex: 1, borderBottomWidth: 0.5, borderBottomColor: '#f3f4f6', borderBottomStyle: 'solid', paddingBottom: 6 },
  rmTitle:   { fontSize: 9.5, fontFamily: 'Helvetica-Bold', color: '#111827', marginBottom: 2 },
  rmDesc:    { fontSize: 7.5, color: '#6b7280' },

  // ── Insights ───────────────────────────────────────────────────────────────
  insightsBox: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderStyle: 'solid',
    borderRadius: 6,
    padding: 12,
  },
  insRow:  { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  insDot:  { width: 6, height: 6, borderRadius: 3, backgroundColor: '#f59e0b', marginRight: 10, marginTop: 3, flexShrink: 0 },
  insText: { flex: 1, fontSize: 9, color: '#374151', lineHeight: 1.5 },

  // ── Page footer ────────────────────────────────────────────────────────────
  pgFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 0.5,
    borderTopColor: '#e5e7eb',
    borderTopStyle: 'solid',
    paddingTop: 6,
    position: 'absolute',
    bottom: 20,
    left: 44,
    right: 44,
  },
  pgFooterText: { fontSize: 7, color: '#9ca3af' },
});

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) { return n.toLocaleString('pt-BR'); }
function fmtCurrency(n: number) { return `R$ ${n.toLocaleString('pt-BR')}`; }

function SectionHeader({ num, title, first }: { num: string; title: string; first?: boolean }) {
  return (
    <View style={[s.secHeader, first ? s.secHeaderFirst : {}]}>
      <Text style={s.secNum}>{num}</Text>
      <Text style={s.secTitle}>{title}</Text>
    </View>
  );
}

function PageFooter({ company }: { company?: string }) {
  return (
    <View style={s.pgFooter} fixed>
      <Text style={s.pgFooterText}>{company ? `Confidencial · ${company}` : 'Confidencial'}</Text>
      <Text style={s.pgFooterText}>Diagnóstico de Eficiência Operacional</Text>
      <Text style={s.pgFooterText} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
    </View>
  );
}

// ── Component ────────────────────────────────────────────────────────────────

export default function PDFDiagnosticReport({
  assessments,
  ranked,
  roadmap,
  insights,
  identification,
  generatedAt,
  refinedImpact,
}: Props) {
  const summary = {
    alta:  ranked.filter(r => r.priority === 'Alta').length,
    media: ranked.filter(r => r.priority === 'Média').length,
    baixa: ranked.filter(r => r.priority === 'Baixa').length,
  };

  const baseAnnualHours     = assessments.reduce((a, x) => a + x.annualHours, 0);
  const baseSavingsHours    = assessments.reduce((a, x) => a + x.automationSavingsHours, 0);
  const baseFinancialImpact = assessments.reduce((a, x) => a + x.financialImpact, 0);

  const totalAnnualHours     = refinedImpact?.annualHours     ?? baseAnnualHours;
  const totalSavingsHours    = refinedImpact?.savingsHours    ?? baseSavingsHours;
  const totalFinancialImpact = refinedImpact?.financialImpact ?? baseFinancialImpact;
  const effectiveHourlyCost  = refinedImpact?.hourlyCost      ?? DEFAULT_HOURLY_COST;

  const totalFteEquivalent = refinedImpact?.fteEquivalent ?? Math.round((baseSavingsHours / FTE_HOURS_YEAR) * 10) / 10;
  const totalCapacityGain  = refinedImpact?.capacityGain  ?? (baseAnnualHours > 0
    ? Math.round((baseSavingsHours / baseAnnualHours) * 100)
    : 0);

  const top3    = ranked.slice(0, 3);
  const company = identification?.company;

  return (
    <Document>

      {/* ════════════════════════════════════════════════════════════════════
          PAGE 1 — COVER
      ════════════════════════════════════════════════════════════════════ */}
      <Page size="A4" style={s.coverPage}>
        <View style={s.coverTop}>
          <View style={s.coverAccent} />
          <Text style={s.coverBrand}>META</Text>
          <Text style={s.coverTitle}>{'Diagnóstico de\nEficiência Operacional'}</Text>
          <Text style={s.coverSub}>Identificação de oportunidades de automação</Text>
        </View>

        <View style={s.coverBottom}>
          <View style={s.coverInfoRow}>
            {identification && (
              <>
                <View style={s.coverInfoCol}>
                  <Text style={s.coverCaption}>PREPARADO PARA</Text>
                  <Text style={s.coverVal}>{identification.company}</Text>
                  <Text style={s.coverValSub}>{identification.area}</Text>

                  <Text style={s.coverCaption}>RESPONDENTE</Text>
                  <Text style={s.coverVal}>{identification.respondentName}</Text>
                  <Text style={s.coverValSub}>{identification.email}</Text>
                </View>
                <View style={s.coverInfoColLast}>
                  {generatedAt && (
                    <>
                      <Text style={s.coverCaption}>DATA</Text>
                      <Text style={s.coverVal}>{generatedAt}</Text>
                    </>
                  )}
                </View>
              </>
            )}
            {!identification && generatedAt && (
              <View style={s.coverInfoCol}>
                <Text style={s.coverCaption}>DATA</Text>
                <Text style={s.coverVal}>{generatedAt}</Text>
              </View>
            )}
          </View>

          <Text style={s.coverFooter}>Documento Confidencial · Meta Consultoria</Text>
        </View>
      </Page>

      {/* ════════════════════════════════════════════════════════════════════
          CONTENT PAGES — continuous flow
      ════════════════════════════════════════════════════════════════════ */}
      <Page size="A4" style={s.page}>
        <PageFooter company={company} />

        {/* ── 01 Sumário Executivo ─────────────────────────────────────────── */}
        <SectionHeader num="01" title="Sumário Executivo" first />

        <Text style={s.summaryPara}>
          {`O presente diagnóstico avaliou ${assessments.length} subprocesso${assessments.length !== 1 ? 's' : ''} operacional${assessments.length !== 1 ? 'is' : ''}, identificando ${summary.alta} com alta prioridade para automação. O potencial de automação identificado representa ${fmt(totalSavingsHours)} horas operacionais/ano — equivalente a ${totalFteEquivalent.toLocaleString('pt-BR')} FTE — e um ganho de capacidade operacional de +${totalCapacityGain}%.`}
        </Text>

        <View style={s.kpiRow}>
          {([
            { label: 'Subprocessos\navaliados',             value: String(assessments.length) },
            { label: 'Horas automatizáveis\n(estimado)',     value: `${fmt(totalSavingsHours)} h` },
            { label: 'FTE equivalente\n(estimado)',          value: `≈ ${totalFteEquivalent.toLocaleString('pt-BR')} FTE` },
            { label: 'Ganho de\ncapacidade',                 value: `+${totalCapacityGain}%` },
          ] as const).map(({ label, value }, i, arr) => (
            <View key={label} style={[s.kpiCard, i === arr.length - 1 ? s.kpiCardLast : {}]}>
              <Text style={s.kpiVal}>{value}</Text>
              <Text style={s.kpiLabel}>{label}</Text>
            </View>
          ))}
        </View>

        <Text style={s.subsecTitle}>Principais Oportunidades de Automação</Text>
        {top3.map((item, i) => {
          const colors = ['#dc2626', '#d97706', '#6b7280'];
          const c = colors[i] ?? '#6b7280';
          return (
            <View key={item.subprocessId} style={[s.top3Row, { borderLeftColor: c }]}>
              <Text style={s.top3Rank}>#{i + 1}</Text>
              <View style={s.top3Content}>
                <Text style={s.top3Name}>{item.subprocessName}</Text>
                <Text style={s.top3Meta}>{item.macroprocessName} › {item.processName}</Text>
              </View>
              <Text style={[s.top3Score, { color: c }]}>{normalizeScore(item.totalScore)}/100</Text>
              <Text style={[s.top3Badge, { backgroundColor: c }]}>{item.priority}</Text>
            </View>
          );
        })}

        {/* ── 02 Visão Geral ───────────────────────────────────────────────── */}
        <SectionHeader num="02" title="Visão Geral do Diagnóstico" />

        <View style={s.ovRow}>
          <View style={s.ovCard}>
            <Text style={s.ovCardTitle}>Distribuição de Prioridades</Text>
            {([
              { label: 'Alta Prioridade',  value: String(summary.alta),  color: '#dc2626' },
              { label: 'Média Prioridade', value: String(summary.media), color: '#d97706' },
              { label: 'Baixa Prioridade', value: String(summary.baixa), color: '#6b7280' },
            ] as const).map(({ label, value, color }) => (
              <View key={label} style={s.ovDataRow}>
                <Text style={s.ovDataLabel}>{label}</Text>
                <Text style={[s.ovDataVal, { color }]}>{value}</Text>
              </View>
            ))}
          </View>

          <View style={[s.ovCard, s.ovCardLast]}>
            <Text style={s.ovCardTitle}>Indicadores de Impacto Operacional</Text>
            {([
              { label: 'Processos analisados',          value: String(assessments.length) },
              { label: 'Esforço mapeado (h/ano)',        value: `${fmt(totalAnnualHours)} h` },
              { label: 'Horas automatizáveis (h/ano)',   value: `${fmt(totalSavingsHours)} h` },
              { label: 'FTE equivalente',                value: `≈ ${totalFteEquivalent.toLocaleString('pt-BR')} FTE` },
              { label: 'Ganho de capacidade',            value: `+${totalCapacityGain}%` },
              { label: `Impacto financeiro (R$${effectiveHourlyCost}/h)`, value: fmtCurrency(totalFinancialImpact) },
            ] as const).map(({ label, value }) => (
              <View key={label} style={s.ovDataRow}>
                <Text style={s.ovDataLabel}>{label}</Text>
                <Text style={s.ovDataVal}>{value}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── 03 Ranking ───────────────────────────────────────────────────── */}
        <SectionHeader num="03" title="Ranking de Potencial de Automação" />

        <View style={s.tblWrap}>
          <View style={s.tblHead}>
            <Text style={[s.th, { width: '8%',  textAlign: 'center' }]}>Rank</Text>
            <Text style={[s.th, { width: '56%' }]}>Processo</Text>
            <Text style={[s.th, { width: '18%', textAlign: 'center' }]}>Pontuação</Text>
            <Text style={[s.th, { width: '18%', textAlign: 'center' }]}>Potencial</Text>
          </View>
          {ranked.slice(0, 15).map((item, i) => {
            const pt = getPotential(item.totalScore);
            return (
              <View key={item.subprocessId} style={[s.tblRow, i % 2 === 1 ? s.tblRowAlt : {}]}>
                <Text style={[s.td, { width: '8%',  textAlign: 'center', color: '#9ca3af' }]}>{item.rank}</Text>
                <Text style={[s.td, { width: '56%' }]}>{item.subprocessName}</Text>
                <Text style={[s.td, { width: '18%', textAlign: 'center', fontFamily: 'Helvetica-Bold' }]}>{normalizeScore(item.totalScore)}/100</Text>
                <Text style={[s.td, { width: '18%', textAlign: 'center', color: pt.color, fontFamily: 'Helvetica-Bold' }]}>{pt.label}</Text>
              </View>
            );
          })}
        </View>

        {/* ── 04 Matriz de Priorização ─────────────────────────────────────── */}
        <SectionHeader num="04" title="Matriz de Priorização de Automação" />

        {(() => {
          // 2-axis matrix: X = automationScore (≥60 high), Y = impactScore (log(annualHours+1))
          const impactValues = ranked.map(r => r.impactScore);
          const sortedImpact = [...impactValues].sort((a, b) => a - b);
          const mid = Math.floor(sortedImpact.length / 2);
          const medianImpact = sortedImpact.length === 0 ? 0
            : sortedImpact.length % 2 !== 0
              ? sortedImpact[mid]
              : (sortedImpact[mid - 1] + sortedImpact[mid]) / 2;

          const quadrants = [
            { label: 'Prioridade Imediata',             bg: '#fef2f2', border: '#fecaca', color: '#b91c1c', filter: (r: RankedAssessment) => r.automationScore >= 60 && r.impactScore >= medianImpact },
            { label: 'Quick Wins',                      bg: '#fff7ed', border: '#fed7aa', color: '#c2410c', filter: (r: RankedAssessment) => r.automationScore >= 60 && r.impactScore < medianImpact },
            { label: 'Avaliar Engenharia / Integração', bg: '#eff6ff', border: '#bfdbfe', color: '#1d4ed8', filter: (r: RankedAssessment) => r.automationScore < 60 && r.impactScore >= medianImpact },
            { label: 'Baixa Prioridade',                bg: '#f9fafb', border: '#e5e7eb', color: '#6b7280', filter: (r: RankedAssessment) => r.automationScore < 60 && r.impactScore < medianImpact },
          ];

          return (
            <View style={s.matGrid}>
              {quadrants.map(({ label, bg, border, color, filter }) => {
                const items = ranked.filter(filter);
                return (
                  <View key={label} style={[s.matQuad, { backgroundColor: bg, borderColor: border }]}>
                    <Text style={[s.matTitle, { color }]}>{label}</Text>
                    {items.length === 0
                      ? <Text style={s.matEmpty}>Nenhum processo nesta categoria</Text>
                      : items.map(r => (
                        <View key={r.subprocessId} style={s.matItem}>
                          <Text style={s.matName}>{r.subprocessName}</Text>
                          <Text style={[s.matBadge, { color, backgroundColor: bg }]}>{r.automationScore}</Text>
                        </View>
                      ))
                    }
                  </View>
                );
              })}
            </View>
          );
        })()}

        {/* ── 05 Roadmap ───────────────────────────────────────────────────── */}
        {roadmap.length > 0 && (
          <>
            <SectionHeader num="05" title="Roadmap de Automação Sugerido" />
            {roadmap.map((item, i) => (
              <View key={item.subprocessId} style={s.rmStep}>
                <View style={s.rmCircle}>
                  <Text style={s.rmNum}>{i + 1}</Text>
                </View>
                <View style={s.rmContent}>
                  <Text style={s.rmTitle}>{item.subprocessName}</Text>
                  <Text style={s.rmDesc}>
                    {CATEGORY_LABELS[item.roadmapCategory]}
                    {' · '}{item.timeline}
                    {' · '}Economia est.: {fmtCurrency(item.estimatedSavings)}
                  </Text>
                </View>
              </View>
            ))}
          </>
        )}

        {/* ── 06 Insights ──────────────────────────────────────────────────── */}
        {insights && insights.length > 0 && (
          <>
            <SectionHeader num="06" title="Insights do Diagnóstico" />
            <View style={s.insightsBox}>
              {insights.map((text, i) => (
                <View key={i} style={[s.insRow, i === insights.length - 1 ? { marginBottom: 0 } : {}]}>
                  <View style={s.insDot} />
                  <Text style={s.insText}>{text}</Text>
                </View>
              ))}
            </View>
          </>
        )}

      </Page>

    </Document>
  );
}
