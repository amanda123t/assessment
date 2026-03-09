export interface Subprocess {
  id: string;
  /** Hierarchical code, e.g. "F-AP-01" (Macroprocess-Process-Sequence). */
  code: string;
  name: string;
  /** Denormalized parent names for self-contained analytics and export. */
  process: string;
  macroprocess: string;
  /** English functional grouping label for analytics and reporting. */
  category: string;
}

export interface Process {
  id: string;
  name: string;
  subprocesses: Subprocess[];
}

export interface Macroprocess {
  id: string;
  name: string;
  icon: string;
  processes: Process[];
}

export interface CriteriaScores {
  operationalVolume: number;
  peopleInvolved: number;
  executionTime: number;
  reworkOrErrors: number;
  systemsOrSpreadsheets: number;
  systemIntegrations: number;
}

export interface SubprocessAssessment {
  subprocessId: string;
  subprocessName: string;
  processId: string;
  processName: string;
  macroprocessId: string;
  macroprocessName: string;
  scores: CriteriaScores;
  totalScore: number;
  /** Automation potential score (0–100). See scoring.ts: calculateAutomationScore. */
  automationScore: number;
  /** Estimated annual operational effort in hours. See impactCalculator.ts. */
  annualHours: number;
  /** Estimated hours saved per year through automation. */
  automationSavingsHours: number;
  /** Estimated financial impact of automation savings (hourly cost × savings hours). */
  financialImpact: number;
  /** True for subprocesses created at runtime (not in processLibrary). */
  isCustom?: boolean;
}

/** A subprocess together with the full context of its parent hierarchy. */
export interface SelectedSubprocessItem {
  macroprocess: Macroprocess;
  process: Process;
  subprocess: Subprocess;
  /** True for subprocesses created at runtime, not present in processLibrary. */
  isCustom?: boolean;
}

export interface AssessmentIdentification {
  company: string;
  area: string;
  respondentName: string;
  email: string;
}

export interface ProcessMap {
  id: string;
  /** Human-readable process name */
  name: string;
  /** What the process aims to accomplish */
  objective: string;
  /** Department or team responsible */
  responsibleArea: string;
  /** How often the process runs (e.g. "Diária", "Semanal") */
  frequency: string;
  /** List of inputs (triggers, documents, data) */
  inputs: string[];
  /** List of outputs (results, documents, data) */
  outputs: string[];
  /** ISO timestamp */
  createdAt: string;
}

export interface AssessmentState {
  /** Global accumulator — persists across all navigation. */
  globalSelectedSubprocesses: SelectedSubprocessItem[];
  assessments: SubprocessAssessment[];
  currentSubprocessIndex: number;
  step: 'start' | 'explore' | 'questionnaire' | 'ranking';
  processMaps: ProcessMap[];
  identification?: AssessmentIdentification;
  /** DD/MM/YYYY string set automatically when the diagnostic starts. */
  generatedAt?: string;
}

export const CRITERIA = [
  {
    key: 'operationalVolume' as keyof CriteriaScores,
    label: 'Volume Operacional',
    description: 'Frequência e quantidade de transações ou ocorrências do subprocesso por mês',
    lowLabel: 'Baixo volume',
    highLabel: 'Alto volume',
    options: ['Menos de 50', '50 a 200', '200 a 500', 'Mais de 500'] as const,
  },
  {
    key: 'peopleInvolved' as keyof CriteriaScores,
    label: 'Pessoas Envolvidas',
    description: 'Quantidade de colaboradores necessários para executar o subprocesso',
    lowLabel: 'Poucas pessoas',
    highLabel: 'Muitas pessoas',
    options: ['1 pessoa', '2–3 pessoas', '4–6 pessoas', 'Mais de 6'] as const,
  },
  {
    key: 'executionTime' as keyof CriteriaScores,
    label: 'Tempo de Execução por Tarefa',
    description: 'Tempo médio gasto para completar o subprocesso por tarefa',
    lowLabel: 'Muito rápido',
    highLabel: 'Muito demorado',
    options: ['Menos de 2 min', '2 a 5 min', '5 a 15 min', 'Mais de 15 min'] as const,
  },
  {
    key: 'reworkOrErrors' as keyof CriteriaScores,
    label: 'Frequência de Retrabalho',
    description: 'Frequência de erros, retrabalho ou exceções no subprocesso',
    lowLabel: 'Poucos erros',
    highLabel: 'Muitos erros',
    options: ['Raro', 'Ocasional', 'Frequente', 'Muito frequente'] as const,
  },
  {
    key: 'systemsOrSpreadsheets' as keyof CriteriaScores,
    label: 'Uso de Sistemas ou Planilhas',
    description: 'Dependência de planilhas manuais ou sistemas legados',
    lowLabel: 'Totalmente sistematizado',
    highLabel: 'Totalmente manual',
    options: ['Totalmente sistematizado', 'Algumas planilhas', 'Principalmente planilhas', 'Manual + planilhas'] as const,
  },
  {
    key: 'systemIntegrations' as keyof CriteriaScores,
    label: 'Integrações Manuais',
    description: 'Quantidade de integrações manuais entre sistemas ou interfaces',
    lowLabel: 'Nenhuma',
    highLabel: 'Constante',
    options: ['Nenhuma', 'Ocasional', 'Frequente', 'Constante'] as const,
  },
] as const;
