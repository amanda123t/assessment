/**
 * Phase 2 module — detailed process mapping
 *
 * Firestore collection: `phase2_responses`
 * Document ID: `{diagnosticId}_{subprocessId}`
 *
 * One response per subprocess per diagnostic; merge-writes allow partial saves.
 */

import {
  collection, doc, setDoc, getDoc, getDocs, query, where,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';

// ── Form-value constants ───────────────────────────────────────────────────────
// Single source of truth for the option strings compared in the analysis engine.
// Keep in sync with the option arrays in Phase2Screen.tsx.

export const PHASE2_VALUES = {
  copiaManual: {
    SIM_ALGUNS:    'Sim, em alguns casos',
    SIM_FREQUENTE: 'Sim, com frequência',
  },
  exigeAnalise: {
    NAO_EXIGE:      'Não exige análise humana',
    ALGUNS_CASOS:   'Exige análise humana em alguns casos',
    COM_FREQUENCIA: 'Exige análise humana com frequência',
  },
  temDecisao: {
    SIM: 'Sim',
  },
  seguiRegras: {
    SEMPRE_PREFIX:     'Sempre',
    NA_MAIORIA_PREFIX: 'Na maioria',
    RARAMENTE_PREFIX:  'Raramente',
  },
  sempresMesmosPassos: {
    SEMPRE_PREFIX:     'Sempre',
    NA_MAIORIA_PREFIX: 'Na maioria',
    VARIA_KEYWORD:     'Varia',
  },
} as const;

// ── Data model ─────────────────────────────────────────────────────────────────

export interface Phase2SubprocessData {
  diagnosticId:   string;
  subprocessId:   string;
  subprocessName: string;
  processName:    string;
  isPrioritized:  boolean;

  // Respondent
  respondentName: string;

  // Identificação
  departamento: string;

  // Block 1 — Como começa
  comoComeca: string;

  // Block 2 — Etapas principais
  etapasPrincipais: string[];

  // Block 3 — Sequência do processo (ordered builder)
  sequenciaEtapas: string[];

  // Block 4 — Decisões
  temDecisao:  string;
  tipoDecisao: string;
  falhaDecisao: string;

  // Block 5 — Como funciona
  seguiRegras:  string;
  exigeAnalise: string;

  // Block 6 — Origem dos dados
  fontesDados: string[];
  comoChegam:  string[];

  // Block 7 — Sistemas
  sistemas:    string[];
  copiaManual: string;

  // Block 8 — Estabilidade
  sempresMesmosPassos: string;
  previsaoMudanca:     string;

  // Block 9 — Gargalos
  gargalo: string;

  updatedAt?: unknown;
}

export type Phase2FormData = Omit<
  Phase2SubprocessData,
  'diagnosticId' | 'subprocessId' | 'subprocessName' | 'processName' | 'isPrioritized' | 'updatedAt'
>;

export const EMPTY_PHASE2_FORM: Phase2FormData = {
  respondentName:      '',
  departamento:        '',
  comoComeca:          '',
  etapasPrincipais:    [],
  sequenciaEtapas:     [],
  temDecisao:          '',
  tipoDecisao:         '',
  falhaDecisao:        '',
  seguiRegras:         '',
  exigeAnalise:        '',
  fontesDados:         [],
  comoChegam:          [],
  sistemas:            [],
  copiaManual:         '',
  sempresMesmosPassos: '',
  previsaoMudanca:     '',
  gargalo:             '',
};

// ── Analysis types ─────────────────────────────────────────────────────────────

export type AutomationType     = 'RPA' | 'OCR / IA Extração' | 'IA Assistiva' | 'Integração API';
export type ComplexityLevel    = 'Baixa' | 'Média' | 'Alta';
export type AutomationPotential = 'ALTO' | 'MÉDIO' | 'BAIXO';

export interface BPMNNode {
  type:      'start' | 'activity' | 'gateway' | 'end' | 'intermediate-event' | 'subprocess';
  label:     string;
  /** Lane / department this node belongs to (inferred from Phase 2 data). */
  lane?:     string;
  /** For gateways: outgoing branches with conditions. */
  branches?: { condition: string; target?: string }[];
  /** For activities: whether this step is typically automatable. */
  automatable?: boolean;
  /** Systems involved in this step (drawn as small badges below the shape). */
  systems?: string[];
}

export interface Phase2Analysis {
  potential:      AutomationPotential;
  tiposAutomacao: AutomationType[];
  complexidade:   ComplexityLevel;
  fluxoBPMN:      BPMNNode[];
  justificativa:  string;
}

// ── BPMN validation cycle types ────────────────────────────────────────────────

export type BPMNStatus =
  | 'draft'
  | 'respondent_validated'
  | 'analyst_reviewed'
  | 'returned'
  | 'finalized';

export interface BPMNHistoryEntry {
  action:   'validated' | 'returned' | 'edited' | 'finalized';
  by:       string;
  role:     'respondent' | 'analyst';
  comment?: string;
  at:       string;
}

export interface PersistedBPMN {
  diagnosticId:      string;
  subprocessId:      string;
  nodes:             BPMNNode[];
  status:            BPMNStatus;
  history:           BPMNHistoryEntry[];
  respondentComment?: string;
  analystComment?:    string;
  updatedAt?:         unknown;
}

// ── Classification helpers ─────────────────────────────────────────────────────

function classifyAutomationTypes(data: Partial<Phase2FormData>): AutomationType[] {
  const V = PHASE2_VALUES;
  const types: AutomationType[] = [];

  // OCR / IA Extração — documents or images involved
  const hasDoc =
    (data.fontesDados ?? []).some(f => f.includes('PDF') || f.includes('Imagem')) ||
    (data.comoChegam  ?? []).some(c => c.includes('PDF') || c.includes('Imagens') || c.includes('digitaliz'));
  if (hasDoc) types.push('OCR / IA Extração');

  // RPA — cross-system copy or manual copy detected
  const hasRPA =
    (data.sequenciaEtapas  ?? []).some(s => s.toLowerCase().includes('copiar')) ||
    (data.etapasPrincipais ?? []).some(e => e.toLowerCase().includes('copiar') || e.toLowerCase().includes('mover')) ||
    data.copiaManual === V.copiaManual.SIM_ALGUNS ||
    data.copiaManual === V.copiaManual.SIM_FREQUENTE;
  if (hasRPA) types.push('RPA');

  // IA Assistiva — human analysis needed in some cases, or decisions exist
  const hasIA =
    data.exigeAnalise === V.exigeAnalise.ALGUNS_CASOS ||
    data.temDecisao   === V.temDecisao.SIM;
  if (hasIA) types.push('IA Assistiva');

  // Integração API — structured data + multiple systems + clear rules
  const hasAPI =
    (data.comoChegam ?? []).some(c => c.includes('estruturad')) &&
    (data.sistemas   ?? []).length >= 2 &&
    (data.seguiRegras ?? '').startsWith(V.seguiRegras.SEMPRE_PREFIX);
  if (hasAPI) types.push('Integração API');

  if (types.length === 0) types.push('RPA');

  return types;
}

function classifyComplexity(data: Partial<Phase2FormData>): ComplexityLevel {
  const V = PHASE2_VALUES;

  const unstable      = (data.sempresMesmosPassos ?? '').includes(V.sempresMesmosPassos.VARIA_KEYWORD);
  const frequentHuman = data.exigeAnalise === V.exigeAnalise.COM_FREQUENCIA;

  if (unstable || frequentHuman) return 'Alta';

  const rulesAlways  = (data.seguiRegras          ?? '').startsWith(V.seguiRegras.SEMPRE_PREFIX);
  const stableAlways = (data.sempresMesmosPassos  ?? '').startsWith(V.sempresMesmosPassos.SEMPRE_PREFIX);
  const noDecision   = data.temDecisao !== V.temDecisao.SIM;
  const fewSystems   = (data.sistemas             ?? []).length <= 1;
  const noHuman      = data.exigeAnalise === V.exigeAnalise.NAO_EXIGE;

  if (rulesAlways && stableAlways && noDecision && fewSystems && noHuman) return 'Baixa';
  return 'Média';
}

function classifyPotential(data: Partial<Phase2FormData>): AutomationPotential {
  const V = PHASE2_VALUES;

  const rulesRarely   = (data.seguiRegras         ?? '').startsWith(V.seguiRegras.RARAMENTE_PREFIX);
  const unstable      = (data.sempresMesmosPassos  ?? '').includes(V.sempresMesmosPassos.VARIA_KEYWORD);
  const frequentHuman = data.exigeAnalise === V.exigeAnalise.COM_FREQUENCIA;

  if (rulesRarely || unstable || frequentHuman) return 'BAIXO';

  const rulesOk  =
    (data.seguiRegras         ?? '').startsWith(V.seguiRegras.SEMPRE_PREFIX) ||
    (data.seguiRegras         ?? '').startsWith(V.seguiRegras.NA_MAIORIA_PREFIX);
  const stableOk =
    (data.sempresMesmosPassos ?? '').startsWith(V.sempresMesmosPassos.SEMPRE_PREFIX) ||
    (data.sempresMesmosPassos ?? '').startsWith(V.sempresMesmosPassos.NA_MAIORIA_PREFIX);
  const structured =
    (data.comoChegam  ?? []).some(c => c.includes('estruturad')) ||
    (data.fontesDados ?? []).some(f => f.includes('Sistema') || f.includes('Planilha') || f.includes('Formulário'));

  if (rulesOk && stableOk && structured) return 'ALTO';
  return 'MÉDIO';
}

function generateBPMN(data: Partial<Phase2FormData>): BPMNNode[] {
  const nodes: BPMNNode[] = [{ type: 'start', label: 'Início' }];

  if (data.comoComeca) {
    nodes.push({ type: 'activity', label: data.comoComeca });
  }

  const seq = data.sequenciaEtapas ?? [];
  if (seq.length > 0) {
    for (const s of seq) nodes.push({ type: 'activity', label: s });
  } else {
    for (const e of (data.etapasPrincipais ?? []).slice(0, 5)) {
      nodes.push({ type: 'activity', label: e });
    }
  }

  if (data.temDecisao === 'Sim' && data.tipoDecisao) {
    nodes.push({
      type:     'gateway',
      label:    data.tipoDecisao,
      branches: [
        { condition: 'Válido / OK' },
        { condition: data.falhaDecisao || 'Falha' },
      ],
    });
  }

  nodes.push({ type: 'end', label: 'Fim' });
  return nodes;
}

function buildJustificativa(
  data:       Partial<Phase2FormData>,
  potential:  AutomationPotential,
  types:      AutomationType[],
  complexity: ComplexityLevel,
): string {
  const V = PHASE2_VALUES;
  const parts: string[] = [];

  if (potential === 'ALTO')        parts.push('O processo apresenta alto potencial de automação');
  else if (potential === 'MÉDIO')  parts.push('O processo apresenta potencial moderado de automação');
  else                             parts.push('O processo apresenta baixo potencial de automação imediata');

  if (data.seguiRegras) {
    if (data.seguiRegras.startsWith(V.seguiRegras.SEMPRE_PREFIX))
      parts.push('as regras de execução são claras e previsíveis');
    else if (data.seguiRegras.startsWith(V.seguiRegras.NA_MAIORIA_PREFIX))
      parts.push('as regras são relativamente claras com algumas exceções');
    else
      parts.push('as regras de execução são pouco padronizadas');
  }

  if (data.sempresMesmosPassos) {
    if (data.sempresMesmosPassos.startsWith(V.sempresMesmosPassos.SEMPRE_PREFIX))
      parts.push('o fluxo é estável e repetitivo');
    else if (data.sempresMesmosPassos.includes(V.sempresMesmosPassos.VARIA_KEYWORD))
      parts.push('o fluxo varia bastante dependendo do caso');
  }

  if (data.exigeAnalise === V.exigeAnalise.NAO_EXIGE)
    parts.push('não há necessidade de julgamento humano');
  else if (data.exigeAnalise === V.exigeAnalise.ALGUNS_CASOS)
    parts.push('há intervenção humana em casos específicos');
  else if (data.exigeAnalise === V.exigeAnalise.COM_FREQUENCIA)
    parts.push('o processo depende fortemente de decisões humanas');

  if (complexity !== 'Baixa')
    parts.push(`a complexidade de implementação é ${complexity.toLowerCase()}`);

  if (types.length > 0)
    parts.push(`a tecnologia indicada é ${types.join(' + ')}`);

  return parts.join(', ') + '.';
}

// ── Main analysis ──────────────────────────────────────────────────────────────

export function analyzeProcess(data: Partial<Phase2FormData>): Phase2Analysis | null {
  if (!data.seguiRegras && !data.exigeAnalise && !data.sempresMesmosPassos) return null;

  const tiposAutomacao = classifyAutomationTypes(data);
  const complexidade   = classifyComplexity(data);
  const potential      = classifyPotential(data);
  const fluxoBPMN      = generateBPMN(data);
  const justificativa  = buildJustificativa(data, potential, tiposAutomacao, complexidade);

  return { potential, tiposAutomacao, complexidade, fluxoBPMN, justificativa };
}

// Legacy alias
export const inferAutomation = analyzeProcess;

// ── Firestore ─────────────────────────────────────────────────────────────────

function phase2DocId(diagnosticId: string, subprocessId: string): string {
  return `${diagnosticId}_${subprocessId}`;
}

export async function savePhase2Response(
  diagnosticId:   string,
  subprocessId:   string,
  subprocessName: string,
  processName:    string,
  isPrioritized:  boolean,
  formData:       Partial<Phase2FormData>,
): Promise<void> {
  const docRef = doc(db, 'phase2_responses', phase2DocId(diagnosticId, subprocessId));
  await setDoc(
    docRef,
    {
      diagnosticId,
      subprocessId,
      subprocessName,
      processName,
      isPrioritized,
      ...formData,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function loadPhase2Responses(
  diagnosticId: string,
): Promise<Map<string, Phase2SubprocessData>> {
  const snapshot = await getDocs(
    query(collection(db, 'phase2_responses'), where('diagnosticId', '==', diagnosticId)),
  );
  const result = new Map<string, Phase2SubprocessData>();
  snapshot.forEach((d) => {
    const data = d.data() as Phase2SubprocessData;
    result.set(data.subprocessId, data);
  });
  return result;
}

// ── BPMN persistence ───────────────────────────────────────────────────────────

function bpmnDocId(diagnosticId: string, subprocessId: string): string {
  return `bpmn_${diagnosticId}_${subprocessId}`;
}

export async function saveBPMN(data: PersistedBPMN): Promise<void> {
  const docRef = doc(db, 'phase2_bpmn', bpmnDocId(data.diagnosticId, data.subprocessId));
  await setDoc(
    docRef,
    { ...data, updatedAt: serverTimestamp() },
    { merge: true },
  );
}

export async function loadBPMN(
  diagnosticId: string,
  subprocessId: string,
): Promise<PersistedBPMN | null> {
  const docRef  = doc(db, 'phase2_bpmn', bpmnDocId(diagnosticId, subprocessId));
  const snap    = await getDoc(docRef);
  if (!snap.exists()) return null;
  return snap.data() as PersistedBPMN;
}

export async function loadAllBPMNs(
  diagnosticId: string,
): Promise<Map<string, PersistedBPMN>> {
  const snapshot = await getDocs(
    query(collection(db, 'phase2_bpmn'), where('diagnosticId', '==', diagnosticId)),
  );
  const result = new Map<string, PersistedBPMN>();
  snapshot.forEach((d) => {
    const bpmn = d.data() as PersistedBPMN;
    result.set(bpmn.subprocessId, bpmn);
  });
  return result;
}

export async function updateBPMNStatus(
  diagnosticId: string,
  subprocessId:  string,
  newStatus:     BPMNStatus,
  entry:         BPMNHistoryEntry,
  updates?:      Partial<Pick<PersistedBPMN, 'nodes' | 'respondentComment' | 'analystComment'>>,
): Promise<void> {
  const existing = await loadBPMN(diagnosticId, subprocessId);
  const history  = existing ? [...existing.history, entry] : [entry];
  const merged: PersistedBPMN = {
    ...(existing ?? { diagnosticId, subprocessId, nodes: [], status: newStatus, history: [] }),
    ...updates,
    status:  newStatus,
    history,
  };
  await saveBPMN(merged);
}
