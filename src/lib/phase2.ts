/**
 * Phase 2 module — detailed process mapping
 *
 * Firestore collection: `phase2_responses`
 * Document ID: `{diagnosticId}_{subprocessId}`
 *
 * One response per subprocess per diagnostic; merge-writes allow partial saves.
 */

import {
  collection, doc, setDoc, getDocs, query, where,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface Phase2SubprocessData {
  diagnosticId:  string;
  subprocessId:  string;
  subprocessName: string;
  processName:   string;
  isPrioritized: boolean;

  // Respondent
  respondentName: string;

  // Block 1 — Identificação
  departamento: string;

  // Block 2 — Entendendo o processo
  comoComeca:       string;
  comoComecaOutro:  string;
  etapas:           string[];
  etapasOutro:      string;
  comoTermina:      string;
  comoTerminaOutro: string;

  // Block 3 — Atividades realizadas
  atividades: string[]; // up to 2

  // Block 4 — Como o processo funciona
  seguiRegras:   string;
  exigeAnalise:  string;

  // Block 5 — Como os dados chegam
  fontesDados:      string[];
  fontesDadosOutro: string;
  comoChegam:       string[];
  comoChegamOutro:  string;

  // Block 6 — Sistemas utilizados
  sistemas:    string[];
  copiaManual: string;

  // Block 7 — Estabilidade do processo
  sempresMesmosPassos: string;
  previsaoMudanca:     string;

  // Block 8 — Gargalos
  gargalo:      string;
  gargaloOutro: string;

  updatedAt?: unknown;
}

export type Phase2FormData = Omit<Phase2SubprocessData, 'diagnosticId' | 'subprocessId' | 'subprocessName' | 'processName' | 'isPrioritized' | 'updatedAt'>;

export const EMPTY_PHASE2_FORM: Phase2FormData = {
  respondentName:      '',
  departamento:        '',
  comoComeca:          '',
  comoComecaOutro:     '',
  etapas:              [],
  etapasOutro:         '',
  comoTermina:         '',
  comoTerminaOutro:    '',
  atividades:          [],
  seguiRegras:         '',
  exigeAnalise:        '',
  fontesDados:         [],
  fontesDadosOutro:    '',
  comoChegam:          [],
  comoChegamOutro:     '',
  sistemas:            [],
  copiaManual:         '',
  sempresMesmosPassos: '',
  previsaoMudanca:     '',
  gargalo:             '',
  gargaloOutro:        '',
};

// ── Inference ─────────────────────────────────────────────────────────────────

export type AutomationType = 'RPA' | 'Integração de Sistemas' | 'IA / Extração de Dados' | 'Workflow / BPM' | 'Automação Simples';
export type ComplexityLevel = 'Baixa' | 'Média' | 'Alta';

export interface Phase2Inference {
  automationType:  AutomationType;
  complexity:      ComplexityLevel;
  technology:      string;
  justification:   string;
}

export function inferAutomation(data: Partial<Phase2FormData>): Phase2Inference | null {
  if (!data.atividades?.length && !data.seguiRegras && !data.fontesDados?.length) return null;

  // Complexity: based on rule clarity + human analysis + change forecast
  let complexityScore = 0;
  if (data.seguiRegras === 'Sempre segue regras claras')             complexityScore += 0;
  else if (data.seguiRegras === 'Na maioria das vezes segue regras claras') complexityScore += 1;
  else if (data.seguiRegras === 'Raramente segue regras claras')     complexityScore += 2;

  if (data.exigeAnalise === 'Não exige análise humana')              complexityScore += 0;
  else if (data.exigeAnalise === 'Exige análise humana em alguns casos') complexityScore += 1;
  else if (data.exigeAnalise === 'Exige análise humana com frequência')  complexityScore += 2;

  if (data.previsaoMudanca === 'Mudanças já estão planejadas')        complexityScore += 2;
  else if (data.previsaoMudanca === 'Existe possibilidade de mudança') complexityScore += 1;

  const complexity: ComplexityLevel =
    complexityScore <= 1 ? 'Baixa' :
    complexityScore <= 3 ? 'Média' : 'Alta';

  // Automation type based on activities + data sources
  const atividades = data.atividades ?? [];
  const fontes = data.fontesDados ?? [];
  const chegam = data.comoChegam ?? [];

  const hasAI = chegam.includes('Imagens ou documentos digitalizados') || chegam.includes('Textos livres (e-mails ou mensagens)') ||
    fontes.includes('Documento (PDF ou imagem)') || atividades.includes('Ler e interpretar documentos ou e-mails');
  const hasIntegration = data.copiaManual === 'Sim, com frequência' || data.copiaManual === 'Sim, em alguns casos';
  const hasWorkflow = data.exigeAnalise === 'Exige análise humana em alguns casos' || data.exigeAnalise === 'Exige análise humana com frequência';
  const isRPA = atividades.includes('Digitar ou cadastrar informações em sistemas') || atividades.includes('Copiar ou mover dados entre sistemas') || atividades.includes('Comparar dados entre sistemas ou planilhas');

  let automationType: AutomationType;
  let technology: string;

  if (hasAI) {
    automationType = 'IA / Extração de Dados';
    technology = 'OCR / NLP / IA Generativa';
  } else if (hasIntegration && !isRPA) {
    automationType = 'Integração de Sistemas';
    technology = 'API Integration / iPaaS';
  } else if (hasWorkflow && complexity !== 'Baixa') {
    automationType = 'Workflow / BPM';
    technology = 'Plataforma de BPM / Low-code';
  } else if (isRPA) {
    automationType = 'RPA';
    technology = 'RPA (UiPath / Power Automate / Automation Anywhere)';
  } else {
    automationType = 'Automação Simples';
    technology = 'Power Automate / Zapier / Macro Office';
  }

  const justification =
    `Processo ${complexity === 'Baixa' ? 'com regras claras e baixa variabilidade' : complexity === 'Média' ? 'com alguma variabilidade e análise ocasional' : 'complexo, com análise humana frequente e possibilidade de mudanças'}. ` +
    `Tipo de automação indicado: ${automationType}. ` +
    (complexity === 'Alta' ? 'Recomenda-se mapeamento detalhado antes da implementação.' : 'Boa aderência a automação estruturada.');

  return { automationType, complexity, technology, justification };
}

// ── Firestore ─────────────────────────────────────────────────────────────────

function phase2DocId(diagnosticId: string, subprocessId: string): string {
  return `${diagnosticId}_${subprocessId}`;
}

export async function savePhase2Response(
  diagnosticId: string,
  subprocessId: string,
  subprocessName: string,
  processName: string,
  isPrioritized: boolean,
  formData: Partial<Phase2FormData>,
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
