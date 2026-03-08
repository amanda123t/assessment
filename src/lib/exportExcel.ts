import ExcelJS from 'exceljs';
import { SubprocessAssessment } from '@/types';
import { CRITERIA } from '@/types';
import { getPriorityLabel } from './scoring';
import { buildAutomationRoadmap } from './automationRoadmap';

export async function exportToExcel(assessments: SubprocessAssessment[]): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Operational Efficiency Assessment';
  workbook.created = new Date();

  // ── Sheet 1: Ranking ──────────────────────────────────────────────────────
  const rankSheet = workbook.addWorksheet('Ranking');

  // Build roadmap data for the extra columns (lookup by subprocessId)
  const roadmapItems = buildAutomationRoadmap(assessments);
  const roadmapMap = new Map(roadmapItems.map((r) => [r.subprocessId, r]));

  const ROADMAP_CATEGORY_LABELS: Record<string, string> = {
    'quick-wins':     'Quick Wins',
    'strategic':      'Strategic Initiatives',
    'transformation': 'Transformation Initiatives',
  };

  // Title — now spans 17 columns (A:Q)
  rankSheet.mergeCells('A1:Q1');
  const titleCell = rankSheet.getCell('A1');
  titleCell.value = 'Avaliação de Eficiência Operacional – Ranking de Oportunidades';
  titleCell.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  rankSheet.getRow(1).height = 36;

  // Subtitle with date
  rankSheet.mergeCells('A2:Q2');
  const subtitleCell = rankSheet.getCell('A2');
  subtitleCell.value = `Gerado em ${new Date().toLocaleDateString('pt-BR')}`;
  subtitleCell.font = { size: 10, color: { argb: 'FF6B7280' } };
  subtitleCell.alignment = { horizontal: 'center' };
  rankSheet.getRow(2).height = 20;

  // Empty row
  rankSheet.getRow(3).height = 8;

  // Headers row 4
  const headers = [
    'Posição',
    'Macroprocesso',
    'Processo',
    'Subprocesso',
    ...CRITERIA.map((c) => c.label),
    'Score Total',
    'Score de Automação',
    'Prioridade',
    // Roadmap columns (new — do not remove existing columns)
    'Impact Score',
    'Effort Score',
    'Roadmap Category',
    'Timeline',
  ];

  const headerRow = rankSheet.getRow(4);
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B82F6' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF2563EB' } },
      bottom: { style: 'thin', color: { argb: 'FF2563EB' } },
      left: { style: 'thin', color: { argb: 'FF2563EB' } },
      right: { style: 'thin', color: { argb: 'FF2563EB' } },
    };
  });
  rankSheet.getRow(4).height = 40;

  // Data rows starting at row 5
  assessments.forEach((a, idx) => {
    const rowNum = idx + 5;
    const row = rankSheet.getRow(rowNum);
    const isEven = idx % 2 === 0;
    const bgColor = isEven ? 'FFFAFAFA' : 'FFFFFFFF';

    const ri = roadmapMap.get(a.subprocessId);
    const values = [
      idx + 1,
      a.macroprocessName,
      a.processName,
      a.subprocessName,
      a.scores.operationalVolume,
      a.scores.peopleInvolved,
      a.scores.executionTime,
      a.scores.reworkOrErrors,
      a.scores.systemsOrSpreadsheets,
      a.scores.systemIntegrations,
      a.totalScore,
      a.automationScore,
      getPriorityLabel(a.totalScore),
      // Roadmap columns
      ri?.impactScore ?? '',
      ri?.effortScore ?? '',
      ri ? ROADMAP_CATEGORY_LABELS[ri.roadmapCategory] : '',
      ri?.timeline ?? '',
    ];

    values.forEach((val, i) => {
      const cell = row.getCell(i + 1);
      cell.value = val;
      cell.alignment = { horizontal: i < 4 ? 'left' : 'center', vertical: 'middle' };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
      cell.border = {
        top: { style: 'hair', color: { argb: 'FFE5E7EB' } },
        bottom: { style: 'hair', color: { argb: 'FFE5E7EB' } },
        left: { style: 'hair', color: { argb: 'FFE5E7EB' } },
        right: { style: 'hair', color: { argb: 'FFE5E7EB' } },
      };

      // Color score total cell
      if (i === 10) {
        const pct = a.totalScore / 30;
        const scoreColor = pct >= 0.75 ? 'FFDC2626' : pct >= 0.5 ? 'FFD97706' : 'FF16A34A';
        cell.font = { bold: true, color: { argb: scoreColor } };
      }

      // Color automation score cell
      if (i === 11) {
        cell.font = { bold: true, color: { argb: 'FF1D4ED8' } };
      }

      // Color priority cell
      if (i === 12) {
        const pct = a.totalScore / 30;
        const priorityBg = pct >= 0.75 ? 'FFFEE2E2' : pct >= 0.5 ? 'FFFEF3C7' : 'FFF0FDF4';
        const priorityFg = pct >= 0.75 ? 'FF991B1B' : pct >= 0.5 ? 'FF92400E' : 'FF166534';
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: priorityBg } };
        cell.font = { bold: true, color: { argb: priorityFg } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      }

      // Color roadmap category cell
      if (i === 15 && ri) {
        const catColors: Record<string, { bg: string; fg: string }> = {
          'quick-wins':     { bg: 'FFD1FAE5', fg: 'FF065F46' },
          'strategic':      { bg: 'FFDBEAFE', fg: 'FF1E40AF' },
          'transformation': { bg: 'FFEDE9FE', fg: 'FF5B21B6' },
        };
        const c = catColors[ri.roadmapCategory];
        if (c) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: c.bg } };
          cell.font = { bold: true, color: { argb: c.fg } };
        }
      }
    });
    row.height = 22;
  });

  // Column widths
  rankSheet.columns = [
    { width: 8 },   // Posição
    { width: 20 },  // Macroprocesso
    { width: 26 },  // Processo
    { width: 36 },  // Subprocesso
    { width: 18 },  // Vol Operacional
    { width: 18 },  // Pessoas
    { width: 18 },  // Tempo
    { width: 18 },  // Retrabalho
    { width: 20 },  // Sistemas/Planilhas
    { width: 20 },  // Integrações
    { width: 14 },  // Score Total
    { width: 18 },  // Score de Automação
    { width: 18 },  // Prioridade
    { width: 14 },  // Impact Score (new)
    { width: 14 },  // Effort Score (new)
    { width: 26 },  // Roadmap Category (new)
    { width: 14 },  // Timeline (new)
  ];

  // ── Sheet 2: Detalhamento ─────────────────────────────────────────────────
  const detailSheet = workbook.addWorksheet('Detalhamento por Critério');

  detailSheet.mergeCells('A1:H1');
  const detTitleCell = detailSheet.getCell('A1');
  detTitleCell.value = 'Detalhamento por Critério de Avaliação';
  detTitleCell.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
  detTitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
  detTitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  detailSheet.getRow(1).height = 36;

  detailSheet.getRow(2).height = 8;

  CRITERIA.forEach((criterion, cIdx) => {
    const startRow = 3 + cIdx * (assessments.length + 4);

    // Criterion title
    detailSheet.mergeCells(`A${startRow}:H${startRow}`);
    const cTitleCell = detailSheet.getCell(`A${startRow}`);
    cTitleCell.value = `${cIdx + 1}. ${criterion.label}`;
    cTitleCell.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
    cTitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D4ED8' } };
    cTitleCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    detailSheet.getRow(startRow).height = 28;

    // Sub headers
    const subHeaders = ['Subprocesso', 'Macroprocesso', 'Processo', 'Score (1-5)', 'Barra'];
    const subHeaderRow = detailSheet.getRow(startRow + 1);
    subHeaders.forEach((h, i) => {
      const cell = subHeaderRow.getCell(i + 1);
      cell.value = h;
      cell.font = { bold: true, size: 10 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });
    subHeaderRow.height = 20;

    // Data
    assessments.forEach((a, aIdx) => {
      const score = a.scores[criterion.key];
      const dataRow = detailSheet.getRow(startRow + 2 + aIdx);
      const isEven = aIdx % 2 === 0;

      const rowValues = [
        a.subprocessName,
        a.macroprocessName,
        a.processName,
        score,
        '■'.repeat(score) + '□'.repeat(5 - score),
      ];

      rowValues.forEach((val, i) => {
        const cell = dataRow.getCell(i + 1);
        cell.value = val;
        cell.alignment = { horizontal: i < 3 ? 'left' : 'center', vertical: 'middle' };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: isEven ? 'FFFAFAFA' : 'FFFFFFFF' },
        };
        if (i === 3) {
          const scoreColor = score >= 4 ? 'FFDC2626' : score >= 3 ? 'FFD97706' : 'FF16A34A';
          cell.font = { bold: true, color: { argb: scoreColor } };
        }
      });
      dataRow.height = 20;
    });

    detailSheet.getRow(startRow + 2 + assessments.length).height = 8;
  });

  detailSheet.columns = [
    { width: 36 },
    { width: 20 },
    { width: 26 },
    { width: 14 },
    { width: 16 },
  ];

  // ── Download ──────────────────────────────────────────────────────────────
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `avaliacao-eficiencia-operacional-${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
