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

/**
 * Represents a vertical industry with its specific macroprocesses.
 * Base macroprocesses (cross-industry) are kept in processLibrary and are
 * automatically combined with these industry-specific ones at runtime.
 */
export interface Industry {
  id: string;
  name: string;
  /** Industry-specific macroprocesses added on top of the cross-industry base library. */
  macroprocesses: Macroprocess[];
}

export interface CriteriaScores {
  operationalVolume: number;
  executionTime: number;
  peopleInvolved: number;
  standardization: number;
  digitization: number;
  reworkRate: number;
  processStability: number;
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
  /** FTE currently required to run the process (annualHours / FTE_HOURS_YEAR). */
  fteCurrent: number;
  /** FTE equivalent of automatable hours (automationSavingsHours / FTE_HOURS_YEAR). */
  fteAutomatable: number;
  /** FTE remaining after automation — max(0, fteCurrent - fteAutomatable). */
  fteAfterAutomation: number;
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

// ── Custom area types (created at runtime in SubprocessExplorer) ──────────────

export interface CustomAreaSubprocess { id: string; name: string; }
export interface CustomAreaProcess    { id: string; name: string; subprocesses: CustomAreaSubprocess[]; }
export interface CustomArea           { id: string; name: string; processes: CustomAreaProcess[]; }

export interface AssessmentIdentification {
  company: string;
  area: string;
  respondentName: string;
  email: string;
}

export interface AssessmentState {
  /** Global accumulator — persists across all navigation. */
  globalSelectedSubprocesses: SelectedSubprocessItem[];
  assessments: SubprocessAssessment[];
  currentSubprocessIndex: number;
  step: 'start' | 'explore' | 'questionnaire' | 'ranking';
  identification?: AssessmentIdentification;
  /** DD/MM/YYYY string set automatically when the diagnostic starts. */
  generatedAt?: string;
  /** Selected industry id — used to pre-filter macroprocesses in SubprocessExplorer. */
  industry?: string | null;
}

/**
 * Optional real values provided by the user to override the range midpoints
 * used in impact calculations. When present, these take precedence over the
 * questionnaire score midpoints in calculateAnnualHours.
 */
export interface RealValues {
  /** Actual monthly executions — overrides operationalVolume range midpoint. */
  volume?: number;
  /** Actual minutes per person per task — overrides executionTime range midpoint. */
  timeMinutes?: number;
  /** Actual number of people involved — overrides peopleInvolved range midpoint. */
  people?: number;
}

export const CRITERIA = [
  {
    key: 'operationalVolume' as keyof CriteriaScores,
    label: 'Volume de Execuções',
    description: 'Quantas vezes este subprocesso é executado por mês, considerando todas as ocorrências',
    example: "Ex: se sua equipe processa 120 notas fiscais por mês, selecione '50 a 200 vezes/mês'",
    lowLabel: 'Baixo volume',
    highLabel: 'Alto volume',
    options: ['Menos de 50 vezes/mês', '50 a 200 vezes/mês', '200 a 500 vezes/mês', 'Mais de 500 vezes/mês'] as const,
  },
  {
    key: 'executionTime' as keyof CriteriaScores,
    label: 'Tempo por Execução',
    description: 'Tempo médio que uma pessoa leva para completar uma execução do início ao fim',
    example: "Ex: se leva ~8 minutos para registrar um pedido no sistema, selecione '5 a 15 minutos'",
    lowLabel: 'Muito rápido',
    highLabel: 'Muito demorado',
    options: ['Menos de 5 minutos', '5 a 15 minutos', '15 a 30 minutos', 'Mais de 30 minutos'] as const,
  },
  {
    key: 'peopleInvolved' as keyof CriteriaScores,
    label: 'Pessoas Envolvidas',
    description: 'Quantidade de colaboradores que executam este subprocesso regularmente',
    example: "Ex: se 4 pessoas do financeiro fazem conciliação bancária, selecione '4 a 6 pessoas'",
    lowLabel: 'Poucas pessoas',
    highLabel: 'Muitas pessoas',
    options: ['1 pessoa', '2 a 3 pessoas', '4 a 6 pessoas', 'Mais de 6 pessoas'] as const,
  },
  {
    key: 'standardization' as keyof CriteriaScores,
    label: 'Padronização e Regras',
    description: 'O quanto este subprocesso segue regras claras e previsíveis, sem necessidade de julgamento humano',
    example: "Ex: se a conferência de dados sempre segue o mesmo checklist, selecione 'Sempre segue as mesmas regras'. Se cada caso exige avaliar contexto diferente, selecione 'Depende de análise caso a caso'",
    lowLabel: 'Totalmente padronizado',
    highLabel: 'Totalmente variável',
    options: ['Sempre segue as mesmas regras', 'Na maioria das vezes, com poucas exceções', 'Depende de análise caso a caso', 'Cada execução é diferente'] as const,
  },
  {
    key: 'digitization' as keyof CriteriaScores,
    label: 'Grau de Digitalização',
    description: 'Como os dados são manipulados durante a execução deste subprocesso',
    example: "Ex: se o colaborador copia dados do SAP para uma planilha Excel, selecione 'Sistemas com cópia manual entre telas'",
    lowLabel: 'Totalmente digital',
    highLabel: 'Totalmente manual',
    options: ['Tudo em sistemas integrados', 'Sistemas com cópia manual entre telas', 'Planilhas como ferramenta principal', 'Processos manuais com papel ou e-mail'] as const,
  },
  {
    key: 'reworkRate' as keyof CriteriaScores,
    label: 'Taxa de Retrabalho ou Erros',
    description: 'Percentual estimado de execuções que geram erro, retrabalho ou necessidade de correção',
    example: "Ex: se de cada 100 lançamentos, ~10 precisam ser corrigidos, selecione '5% a 15%'",
    lowLabel: 'Poucos erros',
    highLabel: 'Muitos erros',
    options: ['Menos de 5%', '5% a 15%', '15% a 30%', 'Mais de 30%'] as const,
  },
  {
    key: 'processStability' as keyof CriteriaScores,
    label: 'Estabilidade do Processo',
    description: 'O quanto este subprocesso tem permanecido estável nos últimos meses, sem mudanças de regras ou sistemas',
    example: "Ex: se o processo mudou por causa de uma nova legislação no último trimestre, selecione 'Muda com alguma frequência'",
    lowLabel: 'Muito estável',
    highLabel: 'Em constante mudança',
    options: ['Estável há mais de 6 meses', 'Poucas mudanças recentes', 'Muda com alguma frequência', 'Em processo de mudança agora'] as const,
  },
] as const;
