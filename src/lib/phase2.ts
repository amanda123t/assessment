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
  comoComeca:    string;
  origemDemanda?: string;   // SIPOC Supplier — quem origina a demanda

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

  // Block 1 extension — Handoffs
  areasEnvolvidas?: string[];

  // Block 9 — Output + Customer
  outputPrincipal?:   string;
  customerPrincipal?: string;

  // Block 10 — Gargalos + espera + SLA
  gargalos:     string[];
  tempoEspera?: string;
  slaEsperado?: string;

  // Block 10 (simplified single-choice) — principal bottleneck
  gargalo?: string;

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
  origemDemanda:       '',
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
  outputPrincipal:     '',
  customerPrincipal:   '',
  areasEnvolvidas:     [],
  gargalos:            [],
  tempoEspera:         '',
  slaEsperado:         '',
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

  // Gargalo de integração → reforçar Integração API
  if ((data.gargalos ?? []).some(g => g.includes('integração'))) {
    if (!types.includes('Integração API')) types.push('Integração API');
  }

  // Espera por aprovação → IA Assistiva para auto-routing
  if (data.tempoEspera?.includes('aprovação')) {
    if (!types.includes('IA Assistiva')) types.push('IA Assistiva');
  }

  // Processo cross-functional (3+ áreas) → Integração API
  const crossFunctionalAreas = (data.areasEnvolvidas ?? []).filter(a => a !== 'Nenhuma outra área');
  if (crossFunctionalAreas.length >= 3) {
    if (!types.includes('Integração API')) types.push('Integração API');
  }

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

  if (rulesAlways && stableAlways && noDecision && fewSystems && noHuman) {
    // Many cross-functional areas bump Baixa → Média
    const manyAreas = (data.areasEnvolvidas ?? []).filter(a => a !== 'Nenhuma outra área').length >= 3;
    if (manyAreas) return 'Média';
    return 'Baixa';
  }
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

/**
 * Generates a BPMN node array from Phase 2 form data.
 *
 * Improvements over the original:
 * 1. Trigger becomes a typed start event, not an activity
 * 2. Gateway positioned contextually (after validation steps), not at the end
 * 3. Error/failure path creates activities and reconnects (loop back)
 * 4. Lanes populated from departamento + origemDemanda + areasEnvolvidas
 * 5. automatable flag inferred per step based on rule clarity + data format
 * 6. systems distributed to nodes by keyword matching
 * 7. Intermediate events for wait times
 */
function generateBPMN(data: Partial<Phase2FormData>): BPMNNode[] {
  const nodes: BPMNNode[] = [];
  const dept = data.departamento || '';
  const systems = data.sistemas ?? [];
  const isRuleBased =
    (data.seguiRegras ?? '').startsWith(PHASE2_VALUES.seguiRegras.SEMPRE_PREFIX) ||
    (data.seguiRegras ?? '').startsWith(PHASE2_VALUES.seguiRegras.NA_MAIORIA_PREFIX);
  const hasStructuredData = (data.comoChegam ?? []).some(c => c.includes('estruturad'));

  // ── 1. Start event ─────────────────────────────────────────────────────────
  // Use origemDemanda as lane if different from dept (shows the handoff)
  const supplierLane = data.origemDemanda && data.origemDemanda !== dept
    ? data.origemDemanda
    : dept;
  nodes.push({
    type:  'start',
    label: data.comoComeca || 'Início',
    lane:  supplierLane,
  });

  // ── 2. Activities from sequence ────────────────────────────────────────────
  const seq = data.sequenciaEtapas ?? data.etapasPrincipais ?? [];
  let gatewayInsertOffset = -1; // index after first validation step
  seq.forEach((stepLabel) => {
    const s = stepLabel.toLowerCase();
    const node: BPMNNode = {
      type:        'activity',
      label:       stepLabel,
      lane:        dept,
      automatable: inferAutomatable(s, isRuleBased, hasStructuredData),
      systems:     inferSystems(s, systems),
    };
    nodes.push(node);
    if (gatewayInsertOffset < 0 && isValidationStep(s)) {
      gatewayInsertOffset = nodes.length; // insert AFTER this node
    }
  });

  // ── 3. Gateway with error path ─────────────────────────────────────────────
  if (data.temDecisao === 'Sim' && data.tipoDecisao) {
    const insertAt = gatewayInsertOffset > 0
      ? gatewayInsertOffset
      : Math.max(nodes.length - 1, 1);
    const gateway: BPMNNode = {
      type:     'gateway',
      label:    data.tipoDecisao,
      lane:     dept,
      branches: [
        { condition: 'OK / Válido' },
        { condition: data.falhaDecisao || 'Falha / Exceção' },
      ],
    };
    nodes.splice(insertAt, 0, gateway);
    if (data.falhaDecisao && data.falhaDecisao !== 'Outro') {
      nodes.splice(insertAt + 1, 0, {
        type:        'activity',
        label:       data.falhaDecisao,
        lane:        dept,
        automatable: false,
      });
    }
  }

  // ── 4. Intermediate event for wait times ───────────────────────────────────
  if (data.tempoEspera && data.tempoEspera !== 'Não há esperas significativas') {
    const pos = Math.max(nodes.length - 1, 1);
    nodes.splice(pos, 0, {
      type:  'intermediate-event',
      label: `Espera: ${data.tempoEspera}`,
      lane:  dept,
    });
  }

  // ── 5. Output as final activity ────────────────────────────────────────────
  if (data.outputPrincipal && data.outputPrincipal !== 'Outro') {
    const outputLane = data.customerPrincipal && data.customerPrincipal !== dept
      ? data.customerPrincipal
      : dept;
    nodes.push({
      type:        'activity',
      label:       data.outputPrincipal,
      lane:        outputLane,
      automatable: inferAutomatable(data.outputPrincipal.toLowerCase(), isRuleBased, hasStructuredData),
    });
  }

  // ── 6. End event ───────────────────────────────────────────────────────────
  nodes.push({ type: 'end', label: 'Fim', lane: dept });
  return nodes;
}

// ── Helper: is this step a validation/check point? ─────────────────────────
function isValidationStep(s: string): boolean {
  return ['conferir', 'validar', 'verificar', 'checar', 'aprovar', 'comparar'].some(k => s.includes(k));
}

// ── Helper: is this step typically automatable? ────────────────────────────
function inferAutomatable(s: string, isRuleBased: boolean, hasStructuredData: boolean): boolean {
  const always = ['copiar', 'mover', 'registrar', 'atualizar', 'gerar relatório',
    'gerar documento', 'enviar confirmação', 'enviar notificação', 'enviar e-mail',
    'dados atualizados', 'cadastro', 'pagamento'];
  if (always.some(k => s.includes(k))) return true;
  const conditional = ['conferir', 'comparar', 'validar', 'verificar', 'checar'];
  if (conditional.some(k => s.includes(k)) && isRuleBased && hasStructuredData) return true;
  const rarely = ['analisar', 'julgar', 'decidir', 'negociar', 'interpretar'];
  if (rarely.some(k => s.includes(k))) return false;
  return false;
}

// ── Helper: infer which systems are used in a step ─────────────────────────
function inferSystems(s: string, allSystems: string[]): string[] {
  if (allSystems.length === 0) return [];
  if (['registrar', 'atualizar', 'cadastrar', 'lançar', 'sistema'].some(k => s.includes(k))) {
    return allSystems.slice(0, 1);
  }
  if (['planilha', 'excel'].some(k => s.includes(k))) return ['Excel'];
  if (['e-mail', 'email', 'enviar'].some(k => s.includes(k))) return ['E-mail'];
  if (['copiar', 'mover', 'comparar'].some(k => s.includes(k)) && allSystems.length >= 2) {
    return allSystems.slice(0, 2);
  }
  return [];
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

  if (data.origemDemanda) {
    if (data.origemDemanda === 'Cliente externo')
      parts.push('a demanda é originada por cliente externo');
    else if (data.origemDemanda === 'Sistema automático (scheduler, trigger)')
      parts.push('o processo já é disparado automaticamente');
  }

  if (data.tempoEspera && data.tempoEspera !== 'Não há esperas significativas')
    parts.push('há tempos de espera que podem ser reduzidos com automação de notificações e escalações');

  if (data.slaEsperado && data.slaEsperado !== 'Não tem prazo definido')
    parts.push(`o SLA esperado é ${data.slaEsperado.toLowerCase()}`);

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
