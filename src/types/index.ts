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
}

export interface AssessmentState {
  selectedMacroprocess: Macroprocess | null;
  selectedProcess: Process | null;
  selectedSubprocesses: Subprocess[];
  assessments: SubprocessAssessment[];
  currentSubprocessIndex: number;
  step: 'start' | 'macroprocess' | 'process' | 'subprocess' | 'questionnaire' | 'ranking';
}

export const CRITERIA = [
  {
    key: 'operationalVolume' as keyof CriteriaScores,
    label: 'Volume Operacional',
    description: 'Frequência e quantidade de transações ou ocorrências do subprocesso',
    lowLabel: 'Baixo volume',
    highLabel: 'Alto volume',
  },
  {
    key: 'peopleInvolved' as keyof CriteriaScores,
    label: 'Pessoas Envolvidas',
    description: 'Quantidade de colaboradores necessários para executar o subprocesso',
    lowLabel: 'Poucas pessoas',
    highLabel: 'Muitas pessoas',
  },
  {
    key: 'executionTime' as keyof CriteriaScores,
    label: 'Tempo de Execução',
    description: 'Tempo médio gasto para completar o subprocesso',
    lowLabel: 'Muito rápido',
    highLabel: 'Muito demorado',
  },
  {
    key: 'reworkOrErrors' as keyof CriteriaScores,
    label: 'Retrabalho ou Erros',
    description: 'Frequência de erros, retrabalho ou exceções no subprocesso',
    lowLabel: 'Poucos erros',
    highLabel: 'Muitos erros',
  },
  {
    key: 'systemsOrSpreadsheets' as keyof CriteriaScores,
    label: 'Uso de Sistemas ou Planilhas',
    description: 'Dependência de planilhas manuais ou sistemas legados',
    lowLabel: 'Totalmente automatizado',
    highLabel: 'Totalmente manual',
  },
  {
    key: 'systemIntegrations' as keyof CriteriaScores,
    label: 'Integrações entre Sistemas',
    description: 'Quantidade de sistemas ou interfaces que precisam trocar informações',
    lowLabel: 'Sem integrações',
    highLabel: 'Muitas integrações',
  },
] as const;
