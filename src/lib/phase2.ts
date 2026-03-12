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

  // Block 1b — Descrição do processo
  descricaoProcesso: string;

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
  descricaoProcesso:   '',
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

export type AutomationPotential = 'ALTO' | 'MÉDIO' | 'BAIXO';

export interface Phase2Analysis {
  potential:   AutomationPotential;
  description: string;
}

/**
 * Scores the completed form and returns a potential level + description.
 * Technology is intentionally omitted here — it's reserved for a later output.
 */
export function analyzeProcess(data: Partial<Phase2FormData>): Phase2Analysis | null {
  if (!data.seguiRegras && !data.exigeAnalise) return null;

  let score = 0;

  // Rules clarity
  if (data.seguiRegras === 'Sempre segue regras claras')                  score += 2;
  else if (data.seguiRegras === 'Na maioria das vezes segue regras claras') score += 1;

  // Human analysis
  if (data.exigeAnalise === 'Não exige análise humana')                   score += 2;
  else if (data.exigeAnalise === 'Exige análise humana em alguns casos')  score += 1;

  // Structured activities
  const structuredActivities = [
    'Digitar ou cadastrar informações em sistemas',
    'Copiar ou mover dados entre sistemas',
    'Comparar dados entre sistemas ou planilhas',
  ];
  if ((data.atividades ?? []).some(a => structuredActivities.includes(a))) score += 1;

  // Process stability
  if (data.sempresMesmosPassos === 'Sempre segue os mesmos passos')        score += 1;
  else if (data.sempresMesmosPassos === 'Na maioria das vezes segue os mesmos passos') score += 0.5;

  // Structured data sources
  const structuredSources = ['Sistema interno', 'Planilha (Excel ou similar)', 'Formulário digital'];
  if ((data.fontesDados ?? []).some(f => structuredSources.includes(f)))   score += 1;

  // Unstructured data penalises slightly
  if ((data.comoChegam ?? []).some(c => c.includes('Imagens') || c.includes('Textos livres'))) score -= 0.5;

  const potential: AutomationPotential = score >= 5 ? 'ALTO' : score >= 3 ? 'MÉDIO' : 'BAIXO';

  const atividadePrincipal = (data.atividades?.[0] ?? 'execução de atividades operacionais').toLowerCase();

  let description: string;
  if (potential === 'ALTO') {
    description =
      `O processo possui regras claras, baixa variabilidade e depende de atividades ` +
      `estruturadas de ${atividadePrincipal}. ` +
      `As condições são favoráveis para automação direta, com alto potencial de ganho operacional.`;
  } else if (potential === 'MÉDIO') {
    description =
      `O processo apresenta alguma variabilidade e pode exigir análise humana em determinados casos. ` +
      `O potencial de automação é moderado — recomenda-se identificar as etapas ` +
      `mais estruturadas para uma implementação incremental.`;
  } else {
    description =
      `O processo envolve análise humana frequente ou apresenta alta variabilidade, ` +
      `o que reduz o potencial de automação imediata. ` +
      `Pode se beneficiar de automação parcial ou ferramentas de apoio à decisão.`;
  }

  return { potential, description };
}

// ── Legacy alias (kept for backward compatibility) ───────────────────────────
export const inferAutomation = analyzeProcess;

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
