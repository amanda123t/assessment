'use client';

import { useState, useCallback } from 'react';
import { useToast, ToastContainer } from '@/components/Toast';
import {
  Plus, ChevronDown, ChevronUp, Save, CheckCircle,
  Search, X, Tag, Sparkles, ArrowRight, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { getAllMacroprocesses } from '@/data/industryLibrary';
import {
  Phase2FormData,
  EMPTY_PHASE2_FORM,
  savePhase2Response,
  analyzeProcess,
  Phase2Analysis,
  loadPhase2Responses,
} from '@/lib/phase2';
import BPMNDiagram from '@/components/BPMNDiagram';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Phase2Entry {
  subprocessId:   string;
  subprocessName: string;
  processName:    string;
  isPrioritized:  boolean;
  voteAverage?:   number;
}

interface Props {
  diagnosticId: string;
  prioritized:  Phase2Entry[];
  savedForms:   Map<string, Partial<Phase2FormData>>;
}

type Phase2View = 'selection' | 'wizard' | 'report';

type WizardStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 'done';

const STEP_LABELS = [
  'Identificação',
  'Como começa',
  'Etapas do processo',
  'Sequência',
  'Decisões',
  'Como funciona',
  'Origem dos dados',
  'Sistemas',
  'Estabilidade',
  'Gargalos',
];

const TOTAL_STEPS = 10;

// ── Option lists ──────────────────────────────────────────────────────────────

const COMO_COMECA_OPTIONS = [
  'Recebimento de e-mail',
  'Solicitação de cliente',
  'Registro em sistema interno',
  'Recebimento de arquivo ou planilha',
  'Recebimento de documento (PDF ou imagem)',
  'Geração automática por sistema',
  'Outro',
];

const ETAPAS_PRINCIPAIS_OPTIONS = [
  'Receber solicitação ou informação',
  'Conferir dados ou documentos',
  'Registrar informações em sistema',
  'Comparar informações entre sistemas ou planilhas',
  'Atualizar dados em sistema',
  'Gerar relatório ou documento',
  'Enviar confirmação ou retorno',
  'Copiar ou mover dados entre sistemas',
  'Ler ou interpretar documentos ou e-mails',
  'Outro',
];

const SEQUENCE_OPTIONS = [
  'Receber solicitação',
  'Conferir dados',
  'Registrar no sistema',
  'Comparar informações',
  'Atualizar dados',
  'Gerar documento',
  'Enviar confirmação',
  'Copiar dados entre sistemas',
  'Interpretar documento',
];

const TIPO_DECISAO_OPTIONS = [
  'Documento válido ou inválido',
  'Dados completos ou incompletos',
  'Aprovação necessária',
  'Cliente elegível ou não',
  'Outro',
];

const FALHA_DECISAO_OPTIONS = [
  'Solicitar correção',
  'Encaminhar para análise humana',
  'Cancelar processo',
  'Registrar erro',
  'Outro',
];

const FONTES_DADOS_OPTIONS = [
  'Sistema interno',
  'Planilha (Excel ou similar)',
  'E-mail',
  'Formulário digital',
  'Documento PDF',
  'Imagem digitalizada',
  'Outro',
];

const COMO_CHEGAM_OPTIONS = [
  'Dados estruturados em sistemas',
  'Planilhas',
  'Documentos PDF',
  'Imagens digitalizadas',
  'Textos livres (e-mails ou mensagens)',
];

const GARGALO_OPTIONS = [
  'Excesso de tempo gasto na execução',
  'Muito retrabalho ou erros manuais',
  'Grande volume de tarefas operacionais',
  'Dependência de pessoas específicas',
  'Demora para cumprir prazos ou SLA',
  'Falta de integração entre sistemas',
  'Outro',
];

// ── UI helpers ────────────────────────────────────────────────────────────────

function Radio({
  label, value, current, onChange, size = 'sm',
}: { label: string; value: string; current: string; onChange: (v: string) => void; size?: 'sm' | 'base' }) {
  const selected = current === value;
  const sz = size === 'base' ? 'text-sm py-3 px-4 rounded-xl' : 'text-xs py-2.5 px-3 rounded-lg';
  return (
    <button
      type="button"
      onClick={() => onChange(value)}
      className={`text-left w-full border transition-all ${sz} ${
        selected
          ? 'bg-blue-600 border-blue-600 text-white font-semibold'
          : 'bg-white border-gray-200 text-gray-700 hover:border-blue-300 hover:bg-blue-50'
      }`}
    >
      {label}
    </button>
  );
}

function MultiCheck({
  label, value, current, onChange, size = 'sm',
}: { label: string; value: string; current: string[]; onChange: (v: string[]) => void; size?: 'sm' | 'base' }) {
  const selected = current.includes(value);
  const sz = size === 'base' ? 'text-sm py-3 px-4 rounded-xl' : 'text-xs py-2.5 px-3 rounded-lg';
  return (
    <button
      type="button"
      onClick={() => {
        if (selected) onChange(current.filter(v => v !== value));
        else onChange([...current, value]);
      }}
      className={`text-left w-full border transition-all ${sz} ${
        selected
          ? 'bg-blue-600 border-blue-600 text-white font-semibold'
          : 'bg-white border-gray-200 text-gray-700 hover:border-blue-300 hover:bg-blue-50'
      }`}
    >
      {label}
    </button>
  );
}

function SystemsInput({
  value, onChange,
}: { value: string[]; onChange: (v: string[]) => void }) {
  const [input, setInput] = useState('');

  const add = () => {
    const trimmed = input.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
      setInput('');
    }
  };

  return (
    <div>
      <div className="flex gap-2 mb-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder="Ex: SAP, Salesforce, Excel..."
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <button
          type="button"
          onClick={add}
          className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-medium transition-colors"
        >
          Adicionar
        </button>
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map(sys => (
            <span key={sys} className="inline-flex items-center gap-1 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-medium px-2 py-1 rounded-full">
              {sys}
              <button type="button" onClick={() => onChange(value.filter(v => v !== sys))} className="hover:text-red-500 transition-colors">
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Sequence builder ──────────────────────────────────────────────────────────

function SequenceBuilder({
  value, onChange,
}: { value: string[]; onChange: (v: string[]) => void }) {
  const [selected, setSelected] = useState('');

  const addStep = () => {
    if (selected) { onChange([...value, selected]); setSelected(''); }
  };

  const removeStep = (i: number) => onChange(value.filter((_, idx) => idx !== i));

  const move = (i: number, dir: -1 | 1) => {
    const next = [...value];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  return (
    <div className="space-y-3">
      {value.length > 0 && (
        <div className="space-y-1.5">
          {value.map((step, i) => (
            <div key={i} className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
              <span className="text-[10px] font-bold text-blue-400 w-5 shrink-0">{i + 1}.</span>
              <span className="flex-1 text-xs text-blue-800 font-medium">{step}</span>
              <div className="flex items-center gap-1 shrink-0">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0}
                  className="text-gray-400 hover:text-gray-600 disabled:opacity-25 transition-colors">
                  <ChevronUp size={13} />
                </button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === value.length - 1}
                  className="text-gray-400 hover:text-gray-600 disabled:opacity-25 transition-colors">
                  <ChevronDown size={13} />
                </button>
                <button type="button" onClick={() => removeStep(i)}
                  className="text-gray-300 hover:text-red-500 transition-colors ml-1">
                  <X size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <select
          value={selected}
          onChange={e => setSelected(e.target.value)}
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white text-gray-700"
        >
          <option value="">Selecionar etapa...</option>
          {SEQUENCE_OPTIONS.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={addStep}
          disabled={!selected}
          className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-semibold transition-colors"
        >
          <Plus size={12} strokeWidth={2.5} />
          Adicionar
        </button>
      </div>
      {value.length === 0 && (
        <p className="text-[10px] text-gray-400">Adicione as etapas na ordem em que acontecem no processo.</p>
      )}
    </div>
  );
}

// ── Automation type badge colours ─────────────────────────────────────────────

const TYPE_COLOURS: Record<string, string> = {
  'RPA':              'bg-blue-100 border-blue-200 text-blue-700',
  'OCR / IA Extração':'bg-purple-100 border-purple-200 text-purple-700',
  'IA Assistiva':     'bg-violet-100 border-violet-200 text-violet-700',
  'Integração API':   'bg-emerald-100 border-emerald-200 text-emerald-700',
};

// ── Per-subprocess wizard card ────────────────────────────────────────────────

interface SubprocessCardProps {
  entry:          Phase2Entry;
  diagnosticId:   string;
  respondentName: string;
  initialData:    Partial<Phase2FormData>;
  onError:        (message: string) => void;
}

function SubprocessCard({ entry, diagnosticId, respondentName, initialData, onError }: SubprocessCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(!!initialData.departamento || !!initialData.comoComeca);
  const [data, setData] = useState<Partial<Phase2FormData>>({ ...EMPTY_PHASE2_FORM, ...initialData });

  const [step, setStep] = useState<WizardStep>(() => {
    if (initialData.gargalo)                      return 'done';
    if (initialData.sempresMesmosPassos)          return 10;
    if (initialData.copiaManual)                  return 9;
    if (initialData.fontesDados?.length)          return 8;
    if (initialData.seguiRegras)                  return 7;
    if (initialData.temDecisao)                   return 6;
    if (initialData.sequenciaEtapas?.length)      return 5;
    if (initialData.etapasPrincipais?.length)     return 4;
    if (initialData.comoComeca)                   return 3;
    if (initialData.departamento)                 return 2;
    return 1;
  });

  const set = useCallback(<K extends keyof Phase2FormData>(key: K, value: Phase2FormData[K]) => {
    setData(prev => ({ ...prev, [key]: value }));
  }, []);

  const doSave = async (formData: Partial<Phase2FormData>) => {
    setSaving(true);
    try {
      await savePhase2Response(
        diagnosticId,
        entry.subprocessId,
        entry.subprocessName,
        entry.processName,
        entry.isPrioritized,
        { ...formData, respondentName },
      );
      setSaved(true);
    } catch (err) {
      console.error('[Phase2] Save failed:', err);
      onError('Erro ao salvar. Verifique sua conexão e tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const handleContinue = async () => {
    await doSave(data);
    if (step === TOTAL_STEPS) setStep('done');
    else setStep(((step as number) + 1) as WizardStep);
  };

  const handleBack = () => {
    if (step === 'done') setStep(TOTAL_STEPS as WizardStep);
    else if ((step as number) > 1) setStep(((step as number) - 1) as WizardStep);
  };

  const analysis: Phase2Analysis | null = analyzeProcess(data);
  const stepNum = step === 'done' ? null : (step as number);

  return (
    <div className={`rounded-2xl border shadow-sm overflow-hidden ${entry.isPrioritized ? 'border-violet-200' : 'border-gray-200'}`}>

      {/* Card header */}
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className={`w-full flex items-center justify-between px-5 py-4 text-left transition-colors ${
          entry.isPrioritized ? 'bg-violet-50 hover:bg-violet-100' : 'bg-gray-50 hover:bg-gray-100'
        }`}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-gray-800">{entry.subprocessName}</span>
              {!entry.isPrioritized && (
                <span className="inline-flex items-center gap-1 bg-amber-100 border border-amber-300 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  <Tag size={9} strokeWidth={2} />
                  NÃO PRIORIZADO
                </span>
              )}
              {step === 'done' ? (
                <span className="inline-flex items-center gap-1 bg-emerald-100 border border-emerald-200 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  <CheckCircle size={9} strokeWidth={2} />
                  Diagnóstico concluído
                </span>
              ) : saved && (
                <span className="inline-flex items-center gap-1 text-emerald-600 text-[10px] font-bold">
                  <CheckCircle size={10} strokeWidth={2} />
                  Salvo
                </span>
              )}
              {stepNum !== null && stepNum > 1 && (
                <span className="text-[10px] text-gray-400">Etapa {stepNum} de {TOTAL_STEPS}</span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-0.5">{entry.processName}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0 ml-3">
          {entry.voteAverage !== undefined && (
            <span className="text-[10px] font-semibold text-violet-600">
              média votação {entry.voteAverage.toFixed(1)}
            </span>
          )}
          {expanded
            ? <ChevronUp size={16} strokeWidth={2} className="text-gray-400" />
            : <ChevronDown size={16} strokeWidth={2} className="text-gray-400" />
          }
        </div>
      </button>

      {/* Wizard body */}
      {expanded && (
        <div className="bg-white">

          {/* Step indicator */}
          {step !== 'done' && (
            <div className="px-5 pt-5 pb-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wide">
                  Etapa {stepNum} de {TOTAL_STEPS} — {STEP_LABELS[(stepNum as number) - 1]}
                </span>
                <div className="flex gap-0.5">
                  {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map(n => (
                    <div
                      key={n}
                      className={`h-1.5 w-3 rounded-full transition-colors ${
                        n < (stepNum as number) ? 'bg-blue-600' :
                        n === stepNum           ? 'bg-blue-400' :
                                                  'bg-gray-200'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="px-5 pb-6 space-y-5">

            {/* ── Step 1: Identificação ─────────────────────────────── */}
            {step === 1 && (
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Departamento responsável por este processo
                </label>
                <input
                  type="text"
                  value={data.departamento ?? ''}
                  onChange={e => set('departamento', e.target.value)}
                  placeholder="Ex: Financeiro, RH, Operações"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
            )}

            {/* ── Step 2: Como começa ────────────────────────────────── */}
            {step === 2 && (
              <div>
                <p className="text-xs font-semibold text-gray-700 mb-1">Como esse processo normalmente começa?</p>
                <p className="text-[10px] text-gray-400 mb-3">Selecione a opção que melhor descreve o gatilho do processo.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {COMO_COMECA_OPTIONS.map(opt => (
                    <Radio key={opt} label={opt} value={opt} current={data.comoComeca ?? ''} onChange={v => set('comoComeca', v)} />
                  ))}
                </div>
              </div>
            )}

            {/* ── Step 3: Etapas principais ─────────────────────────── */}
            {step === 3 && (
              <div>
                <p className="text-xs font-semibold text-gray-700 mb-1">Quais etapas normalmente acontecem nesse processo?</p>
                <p className="text-[10px] text-gray-400 mb-3">Selecione todas as que se aplicam.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {ETAPAS_PRINCIPAIS_OPTIONS.map(opt => (
                    <MultiCheck key={opt} label={opt} value={opt} current={data.etapasPrincipais ?? []} onChange={v => set('etapasPrincipais', v)} />
                  ))}
                </div>
              </div>
            )}

            {/* ── Step 4: Sequência ─────────────────────────────────── */}
            {step === 4 && (
              <div>
                <p className="text-xs font-semibold text-gray-700 mb-1">Qual é a sequência do processo?</p>
                <p className="text-[10px] text-gray-400 mb-3">
                  Adicione as etapas na ordem em que acontecem. Use as setas para reordenar.
                  Esta sequência será usada para gerar o fluxo BPMN.
                </p>
                <SequenceBuilder value={data.sequenciaEtapas ?? []} onChange={v => set('sequenciaEtapas', v)} />
              </div>
            )}

            {/* ── Step 5: Decisões ──────────────────────────────────── */}
            {step === 5 && (
              <div className="space-y-5">
                <div>
                  <p className="text-xs font-semibold text-gray-700 mb-3">Existe alguma decisão ou validação nesse processo?</p>
                  <div className="flex gap-2">
                    {['Não', 'Sim'].map(opt => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => set('temDecisao', opt)}
                        className={`flex-1 py-2.5 rounded-lg border text-xs font-semibold transition-all ${
                          data.temDecisao === opt
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'bg-white border-gray-200 text-gray-700 hover:border-blue-300 hover:bg-blue-50'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
                {data.temDecisao === 'Sim' && (
                  <>
                    <div>
                      <p className="text-xs font-semibold text-gray-700 mb-2">Qual decisão normalmente acontece?</p>
                      <div className="space-y-1.5">
                        {TIPO_DECISAO_OPTIONS.map(opt => (
                          <Radio key={opt} label={opt} value={opt} current={data.tipoDecisao ?? ''} onChange={v => set('tipoDecisao', v)} />
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-700 mb-2">Se a validação falhar, o que acontece?</p>
                      <div className="space-y-1.5">
                        {FALHA_DECISAO_OPTIONS.map(opt => (
                          <Radio key={opt} label={opt} value={opt} current={data.falhaDecisao ?? ''} onChange={v => set('falhaDecisao', v)} />
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ── Step 6: Como funciona ─────────────────────────────── */}
            {step === 6 && (
              <div className="space-y-5">
                <div>
                  <p className="text-xs font-semibold text-gray-700 mb-2">O processo segue regras claras?</p>
                  <div className="space-y-1.5">
                    {['Sempre segue regras claras', 'Na maioria das vezes segue regras claras', 'Raramente segue regras claras'].map(opt => (
                      <Radio key={opt} label={opt} value={opt} current={data.seguiRegras ?? ''} onChange={v => set('seguiRegras', v)} />
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-700 mb-2">Esse processo exige análise ou decisão humana?</p>
                  <div className="space-y-1.5">
                    {['Não exige análise humana', 'Exige análise humana em alguns casos', 'Exige análise humana com frequência'].map(opt => (
                      <Radio key={opt} label={opt} value={opt} current={data.exigeAnalise ?? ''} onChange={v => set('exigeAnalise', v)} />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 7: Origem dos dados ─────────────────────────── */}
            {step === 7 && (
              <div className="space-y-5">
                <div>
                  <p className="text-xs font-semibold text-gray-700 mb-1">De onde vêm as informações usadas nesse processo?</p>
                  <p className="text-[10px] text-gray-400 mb-3">Selecione as fontes mais comuns.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {FONTES_DADOS_OPTIONS.map(opt => (
                      <MultiCheck key={opt} label={opt} value={opt} current={data.fontesDados ?? []} onChange={v => set('fontesDados', v)} />
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-700 mb-2">Como normalmente chegam essas informações?</p>
                  <div className="space-y-1.5">
                    {COMO_CHEGAM_OPTIONS.map(opt => (
                      <MultiCheck key={opt} label={opt} value={opt} current={data.comoChegam ?? []} onChange={v => set('comoChegam', v)} />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 8: Sistemas ─────────────────────────────────── */}
            {step === 8 && (
              <div className="space-y-5">
                <div>
                  <p className="text-xs font-semibold text-gray-700 mb-2">Quais sistemas são utilizados nesse processo?</p>
                  <SystemsInput value={data.sistemas ?? []} onChange={v => set('sistemas', v)} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-700 mb-2">As informações precisam ser copiadas manualmente entre sistemas?</p>
                  <div className="space-y-1.5">
                    {['Não', 'Sim, em alguns casos', 'Sim, com frequência', 'Não sei'].map(opt => (
                      <Radio key={opt} label={opt} value={opt} current={data.copiaManual ?? ''} onChange={v => set('copiaManual', v)} />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 9: Estabilidade ─────────────────────────────── */}
            {step === 9 && (
              <div className="space-y-5">
                <div>
                  <p className="text-xs font-semibold text-gray-700 mb-2">Este processo normalmente segue sempre os mesmos passos?</p>
                  <div className="space-y-1.5">
                    {['Sempre segue os mesmos passos', 'Na maioria das vezes segue os mesmos passos', 'Varia bastante dependendo do caso'].map(opt => (
                      <Radio key={opt} label={opt} value={opt} current={data.sempresMesmosPassos ?? ''} onChange={v => set('sempresMesmosPassos', v)} />
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-700 mb-2">Existe previsão de mudança nesse processo ou nos sistemas envolvidos?</p>
                  <div className="space-y-1.5">
                    {['Não há previsão de mudança', 'Existe possibilidade de mudança', 'Mudanças já estão planejadas', 'Não sei'].map(opt => (
                      <Radio key={opt} label={opt} value={opt} current={data.previsaoMudanca ?? ''} onChange={v => set('previsaoMudanca', v)} />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 10: Gargalos ────────────────────────────────── */}
            {step === 10 && (
              <div>
                <p className="text-xs font-semibold text-gray-700 mb-1">Qual é o principal problema desse processo hoje?</p>
                <p className="text-[10px] text-gray-400 mb-3">Selecione o que mais impacta o dia a dia da equipe.</p>
                <div className="space-y-1.5">
                  {GARGALO_OPTIONS.map(opt => (
                    <Radio key={opt} label={opt} value={opt} current={data.gargalo ?? ''} onChange={v => set('gargalo', v)} />
                  ))}
                </div>
              </div>
            )}

            {/* ── Resultado ────────────────────────────────────────── */}
            {step === 'done' && analysis && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-1">
                  <Sparkles size={15} className="text-violet-600" strokeWidth={1.75} />
                  <span className="text-xs font-bold text-gray-800">Resultado do diagnóstico</span>
                </div>

                {/* Potencial + Complexidade side by side */}
                <div className="grid grid-cols-2 gap-3">
                  <div className={`rounded-xl border p-4 ${
                    analysis.potential === 'ALTO'  ? 'bg-emerald-50 border-emerald-200' :
                    analysis.potential === 'MÉDIO' ? 'bg-amber-50  border-amber-200'   :
                                                      'bg-red-50    border-red-200'
                  }`}>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide mb-1">Potencial de automação</p>
                    <p className={`text-2xl font-black ${
                      analysis.potential === 'ALTO'  ? 'text-emerald-700' :
                      analysis.potential === 'MÉDIO' ? 'text-amber-700'   :
                                                        'text-red-700'
                    }`}>
                      {analysis.potential}
                    </p>
                  </div>
                  <div className={`rounded-xl border p-4 ${
                    analysis.complexidade === 'Baixa' ? 'bg-emerald-50 border-emerald-200' :
                    analysis.complexidade === 'Média' ? 'bg-amber-50  border-amber-200'   :
                                                         'bg-red-50    border-red-200'
                  }`}>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide mb-1">Complexidade</p>
                    <p className={`text-2xl font-black ${
                      analysis.complexidade === 'Baixa' ? 'text-emerald-700' :
                      analysis.complexidade === 'Média' ? 'text-amber-700'   :
                                                           'text-red-700'
                    }`}>
                      {analysis.complexidade}
                    </p>
                  </div>
                </div>

                {/* Tipos de automação */}
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide mb-2">Tipo de automação indicado</p>
                  <div className="flex flex-wrap gap-1.5">
                    {analysis.tiposAutomacao.map(t => (
                      <span key={t} className={`inline-flex items-center border text-[10px] font-bold px-2.5 py-1 rounded-full ${TYPE_COLOURS[t] ?? 'bg-gray-100 border-gray-200 text-gray-700'}`}>
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Fluxo BPMN */}
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide mb-3">Fluxo do processo (BPMN simplificado)</p>
                  <BPMNDiagram nodes={analysis.fluxoBPMN} />
                  <div className="flex gap-3 mt-3 pt-2 border-t border-gray-200">
                    <span className="flex items-center gap-1 text-[8px] text-gray-400">
                      <div className="w-3 h-3 rounded-full bg-emerald-500 flex-shrink-0" /> Evento
                    </span>
                    <span className="flex items-center gap-1 text-[8px] text-gray-400">
                      <div className="w-4 h-3 rounded bg-blue-200 border border-blue-300 flex-shrink-0" /> Atividade
                    </span>
                    <span className="flex items-center gap-1 text-[8px] text-gray-400">
                      <div className="w-3 h-3 bg-amber-200 border border-amber-400 rotate-45 flex-shrink-0" /> Decisão
                    </span>
                  </div>
                  {/* Accessible text fallback */}
                  <details className="mt-3">
                    <summary className="text-[9px] text-gray-400 cursor-pointer hover:text-gray-600 select-none">
                      Ver etapas em texto
                    </summary>
                    <ol className="mt-2 space-y-1 pl-4 list-decimal">
                      {analysis.fluxoBPMN.map((node, i) => (
                        <li key={i} className="text-[10px] text-gray-600">
                          <span className="font-medium">{node.label}</span>
                          {node.type === 'gateway' && node.branches && (
                            <span className="text-gray-400">
                              {' '}({node.branches.map(b => b.condition).join(' / ')})
                            </span>
                          )}
                        </li>
                      ))}
                    </ol>
                  </details>
                </div>

                {/* Justificativa */}
                <div className="rounded-xl border border-gray-100 bg-white p-4">
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide mb-2">Justificativa da análise</p>
                  <p className="text-xs text-gray-700 leading-relaxed">{analysis.justificativa}</p>
                </div>

                <button
                  type="button"
                  onClick={() => setStep(TOTAL_STEPS as WizardStep)}
                  className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <ChevronLeft size={12} strokeWidth={2} />
                  Editar respostas
                </button>
              </div>
            )}

            {step === 'done' && !analysis && (
              <div className="text-center py-6">
                <p className="text-xs text-gray-400 mb-2">Preencha todas as etapas para ver a análise.</p>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
                >
                  Reiniciar diagnóstico
                </button>
              </div>
            )}

            {/* ── Navigation ───────────────────────────────────────── */}
            {step !== 'done' && (
              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  {(stepNum as number) > 1 && (
                    <button
                      type="button"
                      onClick={handleBack}
                      className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 font-medium transition-colors"
                    >
                      <ChevronLeft size={13} strokeWidth={2} />
                      Voltar
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => doSave(data)}
                    disabled={saving || !respondentName.trim()}
                    className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 disabled:opacity-40 font-medium transition-colors border border-gray-200 px-3 py-1.5 rounded-lg"
                  >
                    <Save size={12} strokeWidth={1.75} />
                    {saving ? 'Salvando…' : 'Salvar progresso'}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleContinue}
                  disabled={saving || !respondentName.trim()}
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-4 py-2 rounded-lg text-xs transition-colors"
                >
                  {step === TOTAL_STEPS ? 'Finalizar diagnóstico' : (
                    <>Continuar <ArrowRight size={13} strokeWidth={2} /></>
                  )}
                </button>
              </div>
            )}

            {!respondentName.trim() && step !== 'done' && (
              <p className="text-[10px] text-amber-600">Informe seu nome no topo da página para salvar.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Library picker modal ──────────────────────────────────────────────────────

interface LibraryPickerProps {
  existing: Set<string>;
  onAdd:    (entry: Omit<Phase2Entry, 'isPrioritized'>) => void;
  onClose:  () => void;
}

function LibraryPicker({ existing, onAdd, onClose }: LibraryPickerProps) {
  const [search, setSearch] = useState('');

  const allMacros = getAllMacroprocesses();
  const results: { subprocessId: string; subprocessName: string; processName: string; macroName: string }[] = [];
  for (const macro of allMacros) {
    for (const process of macro.processes) {
      for (const sp of process.subprocesses) {
        if (existing.has(sp.id)) continue;
        const q = search.toLowerCase();
        if (!q || sp.name.toLowerCase().includes(q) || process.name.toLowerCase().includes(q) || macro.name.toLowerCase().includes(q)) {
          results.push({ subprocessId: sp.id, subprocessName: sp.name, processName: process.name, macroName: macro.name });
        }
      }
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col" style={{ maxHeight: '80vh' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-900">Adicionar da biblioteca</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={18} /></button>
        </div>
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 border border-gray-200">
            <Search size={13} className="text-gray-400" strokeWidth={1.75} />
            <input
              autoFocus
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar subprocesso..."
              className="flex-1 bg-transparent text-xs outline-none text-gray-700 placeholder-gray-400"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
          {results.slice(0, 80).map(r => (
            <button
              key={r.subprocessId}
              type="button"
              onClick={() => { onAdd({ subprocessId: r.subprocessId, subprocessName: r.subprocessName, processName: r.processName }); onClose(); }}
              className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-blue-50 transition-colors border border-transparent hover:border-blue-200"
            >
              <div className="text-xs font-medium text-gray-800">{r.subprocessName}</div>
              <div className="text-[10px] text-gray-400">{r.processName} · {r.macroName}</div>
            </button>
          ))}
          {results.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-8">Nenhum subprocesso encontrado.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Manual add modal ──────────────────────────────────────────────────────────

interface ManualAddProps {
  onAdd:   (entry: Phase2Entry) => void;
  onClose: () => void;
}

function ManualAddModal({ onAdd, onClose }: ManualAddProps) {
  const [processName,    setProcessName]    = useState('');
  const [subprocessName, setSubprocessName] = useState('');
  const valid = processName.trim() && subprocessName.trim();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-gray-900">Adicionar processo manualmente</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={18} /></button>
        </div>
        <div className="space-y-3 mb-5">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Nome do processo</label>
            <input type="text" value={processName} onChange={e => setProcessName(e.target.value)} placeholder="Ex: Contas a Pagar" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Nome do subprocesso</label>
            <input type="text" value={subprocessName} onChange={e => setSubprocessName(e.target.value)} placeholder="Ex: Lançamento de notas fiscais" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={!valid}
            onClick={() => {
              onAdd({ subprocessId: `manual_${Date.now()}`, subprocessName: subprocessName.trim(), processName: processName.trim(), isPrioritized: false });
              onClose();
            }}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-semibold py-2 rounded-lg text-sm transition-colors"
          >
            Adicionar
          </button>
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm hover:bg-gray-50 transition-colors">Cancelar</button>
        </div>
      </div>
    </div>
  );
}

// ── Selection view helpers ────────────────────────────────────────────────────

function getEntryStatus(
  entry: Phase2Entry,
  savedForms: Map<string, Partial<Phase2FormData>>,
): 'done' | 'in-progress' | 'pending' {
  const data = savedForms.get(entry.subprocessId);
  if (!data) return 'pending';
  if (data.gargalo) return 'done';
  if (data.departamento || data.comoComeca) return 'in-progress';
  return 'pending';
}

// ── Selection view ────────────────────────────────────────────────────────────

interface SelectionViewProps {
  entries:        Phase2Entry[];
  savedForms:     Map<string, Partial<Phase2FormData>>;
  respondentName: string;
  nameConfirmed:  boolean;
  onRespondentChange: (name: string) => void;
  onNameConfirm:  () => void;
  onSelectEntry:  (index: number) => void;
  onViewReport:   () => void;
  onShowLibrary:  () => void;
  onShowManual:   () => void;
}

function SelectionView({
  entries, savedForms, respondentName, nameConfirmed,
  onRespondentChange, onNameConfirm, onSelectEntry, onViewReport,
  onShowLibrary, onShowManual,
}: SelectionViewProps) {
  const doneCount  = entries.filter(e => getEntryStatus(e, savedForms) === 'done').length;
  const total      = entries.length;
  const progressPct = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  return (
    <div>
      {/* Respondent identification */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
        <h3 className="text-sm font-bold text-gray-800 mb-3">Identificação do respondente</h3>
        <div className="flex gap-3">
          <input
            type="text"
            value={respondentName}
            onChange={e => onRespondentChange(e.target.value)}
            placeholder="Digite seu nome"
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <button
            type="button"
            disabled={!respondentName.trim()}
            onClick={onNameConfirm}
            className="px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-semibold transition-colors"
          >
            Confirmar
          </button>
        </div>
        {nameConfirmed && respondentName.trim() && (
          <p className="text-xs text-emerald-600 mt-2 font-medium">✓ Respondendo como {respondentName.trim()}</p>
        )}
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-gray-500">
              <span className="font-semibold text-gray-800">{doneCount}</span> de {total} subprocessos mapeados
            </span>
            <span className="text-xs text-gray-400">{progressPct}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5">
            <div
              className="bg-blue-600 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Subprocess list */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-5">
        {entries.length === 0 ? (
          <div className="text-center py-10 text-sm text-gray-400">
            Nenhum subprocesso ainda. Adicione da biblioteca ou crie manualmente.
          </div>
        ) : entries.map((entry, index) => {
          const status = getEntryStatus(entry, savedForms);
          return (
            <button
              key={entry.subprocessId}
              type="button"
              onClick={() => onSelectEntry(index)}
              className="w-full flex items-center justify-between px-5 py-4 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors text-left"
            >
              {/* Left: status icon + names */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="shrink-0">
                  {status === 'done' ? (
                    <CheckCircle size={16} className="text-emerald-500" strokeWidth={2} />
                  ) : status === 'in-progress' ? (
                    <div className="w-4 h-4 rounded-full border-2 border-blue-400 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-blue-400" />
                    </div>
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
                  )}
                </div>
                <div className="min-w-0">
                  <span className="block text-sm font-semibold text-gray-800 truncate">
                    {entry.subprocessName}
                  </span>
                  <span className="block text-xs text-gray-400 mt-0.5 truncate">
                    {entry.processName}
                  </span>
                </div>
              </div>

              {/* Right: vote badge + status badge + chevron */}
              <div className="flex items-center gap-2 shrink-0 ml-3">
                {entry.voteAverage !== undefined && (
                  <span className="text-[10px] font-semibold text-violet-600 whitespace-nowrap">
                    ★ {entry.voteAverage.toFixed(1)}
                  </span>
                )}
                {status === 'done' ? (
                  <span className="inline-flex items-center bg-emerald-100 border border-emerald-200 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
                    Concluído
                  </span>
                ) : status === 'in-progress' ? (
                  <span className="inline-flex items-center bg-yellow-100 border border-yellow-200 text-yellow-700 text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
                    Em progresso
                  </span>
                ) : (
                  <span className="inline-flex items-center bg-gray-100 border border-gray-200 text-gray-500 text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
                    Pendente
                  </span>
                )}
                <ChevronRight size={14} className="text-gray-300" strokeWidth={2} />
              </div>
            </button>
          );
        })}
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onShowLibrary}
          className="inline-flex items-center gap-2 border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-700 font-medium hover:bg-gray-50 transition-colors"
        >
          <Plus size={14} strokeWidth={2} />
          Adicionar da biblioteca
        </button>
        <button
          type="button"
          onClick={onShowManual}
          className="inline-flex items-center gap-2 border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-700 font-medium hover:bg-gray-50 transition-colors"
        >
          <Plus size={14} strokeWidth={2} />
          Criar manualmente
        </button>
        <button
          type="button"
          disabled={doneCount === 0}
          onClick={onViewReport}
          className="inline-flex items-center gap-2 border border-blue-600 rounded-lg px-4 py-2.5 text-sm text-blue-600 font-semibold hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors ml-auto"
        >
          <Sparkles size={14} strokeWidth={2} />
          Ver Relatório
        </button>
      </div>
    </div>
  );
}

// ── Wizard view ───────────────────────────────────────────────────────────────

interface WizardViewProps {
  entry:          Phase2Entry;
  diagnosticId:   string;
  respondentName: string;
  initialData:    Partial<Phase2FormData>;
  totalEntries:   number;
  entryIndex:     number;
  onComplete:     () => void;
  onBack:         () => void;
  onError:        (msg: string) => void;
}

function WizardView({
  entry, diagnosticId, respondentName, initialData,
  totalEntries, entryIndex, onComplete, onBack, onError,
}: WizardViewProps) {
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<Partial<Phase2FormData>>({ ...EMPTY_PHASE2_FORM, ...initialData });

  const [step, setStep] = useState<WizardStep>(() => {
    if (initialData.gargalo)                  return 'done';
    if (initialData.sempresMesmosPassos)       return 10;
    if (initialData.copiaManual)              return 9;
    if (initialData.fontesDados?.length)      return 8;
    if (initialData.seguiRegras)              return 7;
    if (initialData.temDecisao)               return 6;
    if (initialData.sequenciaEtapas?.length)  return 5;
    if (initialData.etapasPrincipais?.length) return 4;
    if (initialData.comoComeca)               return 3;
    if (initialData.departamento)             return 2;
    return 1;
  });

  const set = useCallback(<K extends keyof Phase2FormData>(key: K, value: Phase2FormData[K]) => {
    setData(prev => ({ ...prev, [key]: value }));
  }, []);

  const doSave = async (formData: Partial<Phase2FormData>) => {
    setSaving(true);
    try {
      await savePhase2Response(
        diagnosticId,
        entry.subprocessId,
        entry.subprocessName,
        entry.processName,
        entry.isPrioritized,
        { ...formData, respondentName },
      );
    } catch (err) {
      console.error('[Phase2] Wizard save failed:', err);
      onError('Erro ao salvar. Verifique sua conexão e tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const handleContinue = async () => {
    await doSave(data);
    if (step === TOTAL_STEPS) {
      onComplete();
    } else {
      setStep(((step as number) + 1) as WizardStep);
    }
  };

  const handleSaveAndBack = async () => {
    await doSave(data);
    onBack();
  };

  const handleBack = () => {
    if (step === 1 || step === 'done') {
      onBack();
    } else {
      setStep(((step as number) - 1) as WizardStep);
    }
  };

  const stepNum = step === 'done' ? TOTAL_STEPS : (step as number);

  return (
    <div>
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="mb-8">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 font-medium mb-5 transition-colors"
        >
          <ChevronLeft size={16} strokeWidth={2} />
          Voltar à lista
        </button>

        {/* Global progress across subprocesses */}
        <div className="flex items-center gap-3 mb-3">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">
            Subprocesso {entryIndex + 1} de {totalEntries}
          </span>
          <div className="flex-1 bg-gray-100 rounded-full h-1.5">
            <div
              className="bg-violet-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${((entryIndex + 1) / Math.max(totalEntries, 1)) * 100}%` }}
            />
          </div>
        </div>

        {/* Subprocess title */}
        <h2 className="text-xl font-bold text-gray-900">{entry.subprocessName}</h2>
        <p className="text-sm text-gray-400 mt-0.5">{entry.processName}</p>

        {/* Per-step indicator */}
        <div className="flex items-center gap-3 mt-5">
          <span className="text-xs font-semibold text-blue-600 whitespace-nowrap">
            Etapa {stepNum} de {TOTAL_STEPS} — {STEP_LABELS[stepNum - 1]}
          </span>
          <div className="flex gap-1.5">
            {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map(n => (
              <div
                key={n}
                className={`h-2 w-2 rounded-full transition-colors ${
                  n < stepNum  ? 'bg-blue-600' :
                  n === stepNum ? 'bg-blue-400' :
                                  'bg-gray-200'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── Question body ──────────────────────────────────────────── */}
      <div className="max-w-3xl mx-auto space-y-6 mb-12">

        {/* Step 1: Identificação */}
        {step === 1 && (
          <div>
            <label className="block text-base font-semibold text-gray-700 mb-2">
              Departamento responsável por este processo
            </label>
            <input
              type="text"
              value={data.departamento ?? ''}
              onChange={e => set('departamento', e.target.value)}
              placeholder="Ex: Financeiro, RH, Operações"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
        )}

        {/* Step 2: Como começa */}
        {step === 2 && (
          <div>
            <p className="text-base font-semibold text-gray-700 mb-1">Como esse processo normalmente começa?</p>
            <p className="text-sm text-gray-500 mb-4">Selecione a opção que melhor descreve o gatilho do processo.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {COMO_COMECA_OPTIONS.map(opt => (
                <Radio key={opt} label={opt} value={opt} current={data.comoComeca ?? ''} onChange={v => set('comoComeca', v)} size="base" />
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Etapas principais */}
        {step === 3 && (
          <div>
            <p className="text-base font-semibold text-gray-700 mb-1">Quais etapas normalmente acontecem nesse processo?</p>
            <p className="text-sm text-gray-500 mb-4">Selecione todas as que se aplicam.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {ETAPAS_PRINCIPAIS_OPTIONS.map(opt => (
                <MultiCheck key={opt} label={opt} value={opt} current={data.etapasPrincipais ?? []} onChange={v => set('etapasPrincipais', v)} size="base" />
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Sequência */}
        {step === 4 && (
          <div>
            <p className="text-base font-semibold text-gray-700 mb-1">Qual é a sequência do processo?</p>
            <p className="text-sm text-gray-500 mb-4">
              Adicione as etapas na ordem em que acontecem. Use as setas para reordenar.
              Esta sequência será usada para gerar o fluxo BPMN.
            </p>
            <SequenceBuilder value={data.sequenciaEtapas ?? []} onChange={v => set('sequenciaEtapas', v)} />
          </div>
        )}

        {/* Step 5: Decisões */}
        {step === 5 && (
          <div className="space-y-6">
            <div>
              <p className="text-base font-semibold text-gray-700 mb-3">Existe alguma decisão ou validação nesse processo?</p>
              <div className="flex gap-3">
                {['Não', 'Sim'].map(opt => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => set('temDecisao', opt)}
                    className={`flex-1 py-3 rounded-xl border text-sm font-semibold transition-all ${
                      data.temDecisao === opt
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'bg-white border-gray-200 text-gray-700 hover:border-blue-300 hover:bg-blue-50'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
            {data.temDecisao === 'Sim' && (
              <>
                <div>
                  <p className="text-base font-semibold text-gray-700 mb-2">Qual decisão normalmente acontece?</p>
                  <div className="space-y-2">
                    {TIPO_DECISAO_OPTIONS.map(opt => (
                      <Radio key={opt} label={opt} value={opt} current={data.tipoDecisao ?? ''} onChange={v => set('tipoDecisao', v)} size="base" />
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-base font-semibold text-gray-700 mb-2">Se a validação falhar, o que acontece?</p>
                  <div className="space-y-2">
                    {FALHA_DECISAO_OPTIONS.map(opt => (
                      <Radio key={opt} label={opt} value={opt} current={data.falhaDecisao ?? ''} onChange={v => set('falhaDecisao', v)} size="base" />
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Step 6: Como funciona */}
        {step === 6 && (
          <div className="space-y-6">
            <div>
              <p className="text-base font-semibold text-gray-700 mb-2">O processo segue regras claras?</p>
              <div className="space-y-2">
                {['Sempre segue regras claras', 'Na maioria das vezes segue regras claras', 'Raramente segue regras claras'].map(opt => (
                  <Radio key={opt} label={opt} value={opt} current={data.seguiRegras ?? ''} onChange={v => set('seguiRegras', v)} size="base" />
                ))}
              </div>
            </div>
            <div>
              <p className="text-base font-semibold text-gray-700 mb-2">Esse processo exige análise ou decisão humana?</p>
              <div className="space-y-2">
                {['Não exige análise humana', 'Exige análise humana em alguns casos', 'Exige análise humana com frequência'].map(opt => (
                  <Radio key={opt} label={opt} value={opt} current={data.exigeAnalise ?? ''} onChange={v => set('exigeAnalise', v)} size="base" />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 7: Origem dos dados */}
        {step === 7 && (
          <div className="space-y-6">
            <div>
              <p className="text-base font-semibold text-gray-700 mb-1">De onde vêm as informações usadas nesse processo?</p>
              <p className="text-sm text-gray-500 mb-4">Selecione as fontes mais comuns.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {FONTES_DADOS_OPTIONS.map(opt => (
                  <MultiCheck key={opt} label={opt} value={opt} current={data.fontesDados ?? []} onChange={v => set('fontesDados', v)} size="base" />
                ))}
              </div>
            </div>
            <div>
              <p className="text-base font-semibold text-gray-700 mb-2">Como normalmente chegam essas informações?</p>
              <div className="space-y-2">
                {COMO_CHEGAM_OPTIONS.map(opt => (
                  <MultiCheck key={opt} label={opt} value={opt} current={data.comoChegam ?? []} onChange={v => set('comoChegam', v)} size="base" />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 8: Sistemas */}
        {step === 8 && (
          <div className="space-y-6">
            <div>
              <p className="text-base font-semibold text-gray-700 mb-2">Quais sistemas são utilizados nesse processo?</p>
              <SystemsInput value={data.sistemas ?? []} onChange={v => set('sistemas', v)} />
            </div>
            <div>
              <p className="text-base font-semibold text-gray-700 mb-2">As informações precisam ser copiadas manualmente entre sistemas?</p>
              <div className="space-y-2">
                {['Não', 'Sim, em alguns casos', 'Sim, com frequência', 'Não sei'].map(opt => (
                  <Radio key={opt} label={opt} value={opt} current={data.copiaManual ?? ''} onChange={v => set('copiaManual', v)} size="base" />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 9: Estabilidade */}
        {step === 9 && (
          <div className="space-y-6">
            <div>
              <p className="text-base font-semibold text-gray-700 mb-2">Este processo normalmente segue sempre os mesmos passos?</p>
              <div className="space-y-2">
                {['Sempre segue os mesmos passos', 'Na maioria das vezes segue os mesmos passos', 'Varia bastante dependendo do caso'].map(opt => (
                  <Radio key={opt} label={opt} value={opt} current={data.sempresMesmosPassos ?? ''} onChange={v => set('sempresMesmosPassos', v)} size="base" />
                ))}
              </div>
            </div>
            <div>
              <p className="text-base font-semibold text-gray-700 mb-2">Existe previsão de mudança nesse processo ou nos sistemas envolvidos?</p>
              <div className="space-y-2">
                {['Não há previsão de mudança', 'Existe possibilidade de mudança', 'Mudanças já estão planejadas', 'Não sei'].map(opt => (
                  <Radio key={opt} label={opt} value={opt} current={data.previsaoMudanca ?? ''} onChange={v => set('previsaoMudanca', v)} size="base" />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 10: Gargalos */}
        {step === 10 && (
          <div>
            <p className="text-base font-semibold text-gray-700 mb-1">Qual é o principal problema desse processo hoje?</p>
            <p className="text-sm text-gray-500 mb-4">Selecione o que mais impacta o dia a dia da equipe.</p>
            <div className="space-y-2">
              {GARGALO_OPTIONS.map(opt => (
                <Radio key={opt} label={opt} value={opt} current={data.gargalo ?? ''} onChange={v => set('gargalo', v)} size="base" />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Footer navigation ──────────────────────────────────────── */}
      <div className="border-t border-gray-100 pt-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 font-medium transition-colors"
          >
            <ChevronLeft size={15} strokeWidth={2} />
            Voltar
          </button>
          <button
            type="button"
            onClick={handleSaveAndBack}
            disabled={saving || !respondentName.trim()}
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-40 font-medium transition-colors border border-gray-200 px-3 py-2 rounded-lg"
          >
            <Save size={13} strokeWidth={1.75} />
            {saving ? 'Salvando…' : 'Salvar progresso'}
          </button>
        </div>
        <button
          type="button"
          onClick={handleContinue}
          disabled={saving || !respondentName.trim()}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors"
        >
          {step === TOTAL_STEPS ? 'Finalizar mapeamento' : (
            <>Continuar <ArrowRight size={15} strokeWidth={2} /></>
          )}
        </button>
      </div>

      {!respondentName.trim() && (
        <p className="text-xs text-amber-600 mt-3">Informe seu nome no topo da página para salvar.</p>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Phase2Screen({ diagnosticId, prioritized, savedForms: initialSavedForms }: Props) {
  const [respondentName,   setRespondentName]   = useState('');
  const [nameConfirmed,    setNameConfirmed]    = useState(false);
  const [entries,          setEntries]          = useState<Phase2Entry[]>(prioritized);
  const [savedForms,       setSavedForms]       = useState<Map<string, Partial<Phase2FormData>>>(initialSavedForms);
  const [showLibrary,      setShowLibrary]      = useState(false);
  const [showManual,       setShowManual]       = useState(false);
  const [view,             setView]             = useState<Phase2View>('selection');
  const [activeEntryIndex, setActiveEntryIndex] = useState<number | null>(null);

  const { toasts, showToast, dismissToast } = useToast();

  const existingIds = new Set(entries.map(e => e.subprocessId));

  const addEntry = (entry: Phase2Entry) => {
    const newEntry = { ...entry, isPrioritized: false };
    setEntries(prev => [...prev, newEntry]);
    savePhase2Response(
      diagnosticId,
      newEntry.subprocessId,
      newEntry.subprocessName,
      newEntry.processName,
      newEntry.isPrioritized,
      { respondentName },
    ).catch(err => {
      console.error('[Phase2] Failed to persist new entry:', err);
      showToast('Erro ao adicionar subprocesso. Verifique sua conexão.');
    });
  };

  const handleWizardComplete = () => {
    loadPhase2Responses(diagnosticId).then(existing => {
      const formsMap = new Map<string, Partial<Phase2FormData>>();
      existing.forEach((v, k) => formsMap.set(k, v as Partial<Phase2FormData>));
      setSavedForms(formsMap);
    }).catch(err => console.error('[Phase2] Failed to reload responses:', err));
    setView('selection');
    setActiveEntryIndex(null);
  };

  const handleWizardBack = () => {
    setView('selection');
    setActiveEntryIndex(null);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-8">

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {view === 'selection' && (
        <SelectionView
          entries={entries}
          savedForms={savedForms}
          respondentName={respondentName}
          nameConfirmed={nameConfirmed}
          onRespondentChange={name => { setRespondentName(name); setNameConfirmed(false); }}
          onNameConfirm={() => setNameConfirmed(true)}
          onSelectEntry={index => { setActiveEntryIndex(index); setView('wizard'); }}
          onViewReport={() => setView('report')}
          onShowLibrary={() => setShowLibrary(true)}
          onShowManual={() => setShowManual(true)}
        />
      )}

      {view === 'wizard' && activeEntryIndex !== null && (
        <WizardView
          entry={entries[activeEntryIndex]}
          diagnosticId={diagnosticId}
          respondentName={respondentName}
          initialData={savedForms.get(entries[activeEntryIndex].subprocessId) ?? {}}
          totalEntries={entries.length}
          entryIndex={activeEntryIndex}
          onComplete={handleWizardComplete}
          onBack={handleWizardBack}
          onError={showToast}
        />
      )}

      {view === 'report' && (
        <div>Relatório (próximo prompt)</div>
      )}

      {/* Modals — available from all views */}
      {showLibrary && (
        <LibraryPicker
          existing={existingIds}
          onAdd={e => addEntry({ ...e, isPrioritized: false })}
          onClose={() => setShowLibrary(false)}
        />
      )}
      {showManual && (
        <ManualAddModal
          onAdd={addEntry}
          onClose={() => setShowManual(false)}
        />
      )}
    </div>
  );
}
