'use client';

import { useState, useCallback } from 'react';
import {
  Plus, ChevronDown, ChevronUp, Save, CheckCircle,
  Search, X, Tag, Sparkles, ArrowRight, ChevronLeft,
} from 'lucide-react';
import { getAllMacroprocesses } from '@/data/industryLibrary';
import {
  Phase2FormData,
  EMPTY_PHASE2_FORM,
  savePhase2Response,
  analyzeProcess,
  Phase2Analysis,
} from '@/lib/phase2';

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

type WizardStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 'done';

const STEP_LABELS = [
  'Identificação',
  'Etapas do processo',
  'Tipo de atividade',
  'Lógica do processo',
  'Dados e sistemas',
  'Estabilidade',
  'Gargalo',
];

// ── UI helpers ────────────────────────────────────────────────────────────────

function Radio({
  label, value, current, onChange,
}: { label: string; value: string; current: string; onChange: (v: string) => void }) {
  const selected = current === value;
  return (
    <button
      type="button"
      onClick={() => onChange(value)}
      className={`text-left w-full px-3 py-2.5 rounded-lg border text-xs transition-all ${
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
  label, value, current, onChange, maxItems,
}: { label: string; value: string; current: string[]; onChange: (v: string[]) => void; maxItems?: number }) {
  const selected = current.includes(value);
  const disabled = !selected && maxItems !== undefined && current.length >= maxItems;
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        if (selected) onChange(current.filter(v => v !== value));
        else onChange([...current, value]);
      }}
      className={`text-left w-full px-3 py-2.5 rounded-lg border text-xs transition-all ${
        selected
          ? 'bg-blue-600 border-blue-600 text-white font-semibold'
          : disabled
          ? 'bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed'
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

function OutroField({
  show, value, onChange, placeholder = 'Descreva...',
}: { show: boolean; value: string; onChange: (v: string) => void; placeholder?: string }) {
  if (!show) return null;
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="mt-1.5 w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
    />
  );
}

// ── Per-subprocess wizard card ────────────────────────────────────────────────

interface SubprocessCardProps {
  entry:          Phase2Entry;
  diagnosticId:   string;
  respondentName: string;
  initialData:    Partial<Phase2FormData>;
}

function SubprocessCard({ entry, diagnosticId, respondentName, initialData }: SubprocessCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(!!initialData.departamento || !!initialData.comoComeca);
  const [data, setData] = useState<Partial<Phase2FormData>>({ ...EMPTY_PHASE2_FORM, ...initialData });

  const [step, setStep] = useState<WizardStep>(() => {
    if (initialData.gargalo)               return 'done';
    if (initialData.sempresMesmosPassos)   return 7;
    if (initialData.fontesDados?.length)   return 6;
    if (initialData.seguiRegras)           return 5;
    if (initialData.atividades?.length)    return 4;
    if (initialData.comoComeca)            return 3;
    if (initialData.departamento)          return 2;
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
    } finally {
      setSaving(false);
    }
  };

  const handleContinue = async () => {
    await doSave(data);
    if (step === 7) {
      setStep('done');
    } else {
      setStep(((step as number) + 1) as WizardStep);
    }
  };

  const handleBack = () => {
    if (step === 'done') {
      setStep(7);
    } else if ((step as number) > 1) {
      setStep(((step as number) - 1) as WizardStep);
    }
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
                <span className="text-[10px] text-gray-400">Etapa {stepNum} de 7</span>
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
                  Etapa {stepNum} de 7 — {STEP_LABELS[(stepNum as number) - 1]}
                </span>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5, 6, 7].map(n => (
                    <div
                      key={n}
                      className={`h-1.5 w-5 rounded-full transition-colors ${
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

            {/* ── Step 1: Identificação ─────────────────────────────────── */}
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

            {/* ── Step 2: Etapas do processo ───────────────────────────── */}
            {step === 2 && (
              <div className="space-y-5">
                <div>
                  <p className="text-xs font-semibold text-gray-700 mb-2">Como esse processo normalmente começa?</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {['Recebimento de e-mail', 'Solicitação de cliente', 'Registro em sistema interno', 'Recebimento de arquivo ou planilha', 'Recebimento de documento', 'Geração automática por sistema', 'Outro (descrever)'].map(opt => (
                      <Radio key={opt} label={opt} value={opt} current={data.comoComeca ?? ''} onChange={v => set('comoComeca', v)} />
                    ))}
                  </div>
                  <OutroField show={data.comoComeca === 'Outro (descrever)'} value={data.comoComecaOutro ?? ''} onChange={v => set('comoComecaOutro', v)} />
                </div>

                <div>
                  <p className="text-xs font-semibold text-gray-700 mb-1">Quais etapas normalmente acontecem nesse processo?</p>
                  <p className="text-[10px] text-gray-400 mb-2">Selecione as etapas mais comuns.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {['Receber solicitação ou informação', 'Conferir dados ou documentos', 'Registrar informações em sistema', 'Comparar informações entre sistemas ou planilhas', 'Atualizar dados em sistema', 'Gerar relatório ou documento', 'Enviar confirmação ou retorno', 'Outro (descrever)'].map(opt => (
                      <MultiCheck key={opt} label={opt} value={opt} current={data.etapas ?? []} onChange={v => set('etapas', v)} />
                    ))}
                  </div>
                  <OutroField show={(data.etapas ?? []).includes('Outro (descrever)')} value={data.etapasOutro ?? ''} onChange={v => set('etapasOutro', v)} />
                </div>

                <div>
                  <p className="text-xs font-semibold text-gray-700 mb-2">Como esse processo normalmente termina?</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {['Informação registrada em sistema', 'Documento gerado ou enviado', 'Solicitação aprovada ou concluída', 'Cliente informado ou atendido', 'Relatório entregue', 'Outro (descrever)'].map(opt => (
                      <Radio key={opt} label={opt} value={opt} current={data.comoTermina ?? ''} onChange={v => set('comoTermina', v)} />
                    ))}
                  </div>
                  <OutroField show={data.comoTermina === 'Outro (descrever)'} value={data.comoTerminaOutro ?? ''} onChange={v => set('comoTerminaOutro', v)} />
                </div>
              </div>
            )}

            {/* ── Step 3: Tipo de atividade ────────────────────────────── */}
            {step === 3 && (
              <div>
                <p className="text-xs font-semibold text-gray-700 mb-1">O que as pessoas fazem principalmente neste processo?</p>
                <p className="text-[10px] text-gray-400 mb-3">Selecione até duas atividades que mais ocorrem.</p>
                <div className="space-y-1.5">
                  {[
                    { v: 'Digitar ou cadastrar informações em sistemas',   d: 'Ex.: digitar dados ou preencher campos em um sistema.' },
                    { v: 'Conferir ou validar informações',                 d: 'Ex.: revisar dados ou validar documentos antes de seguir.' },
                    { v: 'Comparar dados entre sistemas ou planilhas',       d: 'Ex.: verificar se informações de um sistema correspondem a outro.' },
                    { v: 'Gerar relatórios ou documentos',                   d: 'Ex.: criar relatórios, planilhas ou documentos a partir de dados.' },
                    { v: 'Copiar ou mover dados entre sistemas',             d: 'Ex.: copiar dados de um sistema para outro.' },
                    { v: 'Ler e interpretar documentos ou e-mails',          d: 'Ex.: analisar informações em PDFs, e-mails ou imagens.' },
                  ].map(({ v, d }) => (
                    <MultiCheck key={v} label={`${v} — ${d}`} value={v} current={data.atividades ?? []} onChange={val => set('atividades', val)} maxItems={2} />
                  ))}
                </div>
              </div>
            )}

            {/* ── Step 4: Lógica do processo ───────────────────────────── */}
            {step === 4 && (
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

            {/* ── Step 5: Dados e sistemas ─────────────────────────────── */}
            {step === 5 && (
              <div className="space-y-5">
                <div>
                  <p className="text-xs font-semibold text-gray-700 mb-1">De onde vêm as informações usadas neste processo?</p>
                  <p className="text-[10px] text-gray-400 mb-2">Selecione as fontes mais comuns.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {['Sistema interno', 'Planilha (Excel ou similar)', 'E-mail', 'Formulário digital', 'Documento (PDF ou imagem)', 'Outro (descrever)'].map(opt => (
                      <MultiCheck key={opt} label={opt} value={opt} current={data.fontesDados ?? []} onChange={v => set('fontesDados', v)} />
                    ))}
                  </div>
                  <OutroField show={(data.fontesDados ?? []).includes('Outro (descrever)')} value={data.fontesDadosOutro ?? ''} onChange={v => set('fontesDadosOutro', v)} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-700 mb-1">Como normalmente chegam essas informações?</p>
                  <p className="text-[10px] text-gray-400 mb-2">Selecione todas as opções que se aplicam.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {['Dados organizados em sistemas ou planilhas', 'Documentos digitais (PDF)', 'Imagens ou documentos digitalizados', 'Textos livres (e-mails ou mensagens)', 'Outro (descrever)'].map(opt => (
                      <MultiCheck key={opt} label={opt} value={opt} current={data.comoChegam ?? []} onChange={v => set('comoChegam', v)} />
                    ))}
                  </div>
                  <OutroField show={(data.comoChegam ?? []).includes('Outro (descrever)')} value={data.comoChegamOutro ?? ''} onChange={v => set('comoChegamOutro', v)} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-700 mb-2">Quais sistemas são utilizados neste processo?</p>
                  <SystemsInput value={data.sistemas ?? []} onChange={v => set('sistemas', v)} />
                </div>
              </div>
            )}

            {/* ── Step 6: Estabilidade ─────────────────────────────────── */}
            {step === 6 && (
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

            {/* ── Step 7: Gargalo ──────────────────────────────────────── */}
            {step === 7 && (
              <div>
                <p className="text-xs font-semibold text-gray-700 mb-1">Qual é o principal gargalo ou dificuldade deste processo hoje?</p>
                <p className="text-[10px] text-gray-400 mb-3">Selecione o que mais impacta o dia a dia da equipe.</p>
                <div className="space-y-1.5">
                  {['Excesso de tempo gasto na execução', 'Muito retrabalho ou erros manuais', 'Grande volume de tarefas operacionais', 'Dependência de pessoas específicas', 'Demora para cumprir prazos ou SLA', 'Falta de integração entre sistemas', 'Outro (descrever)'].map(opt => (
                    <Radio key={opt} label={opt} value={opt} current={data.gargalo ?? ''} onChange={v => set('gargalo', v)} />
                  ))}
                </div>
                <OutroField show={data.gargalo === 'Outro (descrever)'} value={data.gargaloOutro ?? ''} onChange={v => set('gargaloOutro', v)} />
              </div>
            )}

            {/* ── Final: Analysis screen ───────────────────────────────── */}
            {step === 'done' && analysis && (
              <div className="space-y-4">
                <div className={`rounded-xl border p-5 ${
                  analysis.potential === 'ALTO'  ? 'bg-emerald-50 border-emerald-200' :
                  analysis.potential === 'MÉDIO' ? 'bg-amber-50 border-amber-200' :
                                                    'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles size={15} className="text-violet-600" strokeWidth={1.75} />
                    <span className="text-xs font-bold text-gray-800">Resultado do diagnóstico</span>
                  </div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">Potencial de automação</p>
                  <p className={`text-2xl font-black mb-3 ${
                    analysis.potential === 'ALTO'  ? 'text-emerald-700' :
                    analysis.potential === 'MÉDIO' ? 'text-amber-700' :
                                                      'text-red-700'
                  }`}>
                    {analysis.potential}
                  </p>
                  <p className="text-xs text-gray-700 leading-relaxed">{analysis.description}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(7)}
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

            {/* ── Navigation bar ───────────────────────────────────────── */}
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
                  {step === 7 ? 'Finalizar diagnóstico' : (
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

// ── Main component ────────────────────────────────────────────────────────────

export default function Phase2Screen({ diagnosticId, prioritized, savedForms }: Props) {
  const [respondentName, setRespondentName] = useState('');
  const [nameConfirmed,  setNameConfirmed]  = useState(false);
  const [entries,        setEntries]        = useState<Phase2Entry[]>(prioritized);
  const [showLibrary,    setShowLibrary]    = useState(false);
  const [showManual,     setShowManual]     = useState(false);

  const existingIds = new Set(entries.map(e => e.subprocessId));

  const addEntry = (entry: Phase2Entry) => {
    setEntries(prev => [...prev, { ...entry, isPrioritized: false }]);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-8">

      {/* Respondent name */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
        <h3 className="text-sm font-bold text-gray-800 mb-3">Identificação do respondente</h3>
        <div className="flex gap-3">
          <input
            type="text"
            value={respondentName}
            onChange={e => { setRespondentName(e.target.value); setNameConfirmed(false); }}
            placeholder="Digite seu nome"
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <button
            type="button"
            disabled={!respondentName.trim()}
            onClick={() => setNameConfirmed(true)}
            className="px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-semibold transition-colors"
          >
            Confirmar
          </button>
        </div>
        {nameConfirmed && respondentName.trim() && (
          <p className="text-xs text-emerald-600 mt-2 font-medium">✓ Respondendo como {respondentName.trim()}</p>
        )}
      </div>

      {/* Subprocess wizard cards */}
      <div className="space-y-3 mb-6">
        {entries.map(entry => (
          <SubprocessCard
            key={entry.subprocessId}
            entry={entry}
            diagnosticId={diagnosticId}
            respondentName={respondentName}
            initialData={savedForms.get(entry.subprocessId) ?? {}}
          />
        ))}
        {entries.length === 0 && (
          <div className="text-center py-10 text-sm text-gray-400">
            Nenhum subprocesso ainda. Adicione da biblioteca ou crie manualmente.
          </div>
        )}
      </div>

      {/* Add actions */}
      <div className="flex flex-wrap gap-2 mb-8">
        <button
          type="button"
          onClick={() => setShowLibrary(true)}
          className="inline-flex items-center gap-2 border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-700 font-medium hover:bg-gray-50 transition-colors"
        >
          <Plus size={14} strokeWidth={2} />
          Adicionar da biblioteca
        </button>
        <button
          type="button"
          onClick={() => setShowManual(true)}
          className="inline-flex items-center gap-2 border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-700 font-medium hover:bg-gray-50 transition-colors"
        >
          <Plus size={14} strokeWidth={2} />
          Criar processo manualmente
        </button>
      </div>

      {/* Modals */}
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
