'use client';

import { useState, useCallback, useEffect } from 'react';
import { useToast, ToastContainer } from '@/components/Toast';
import {
  Plus, ChevronDown, ChevronUp, Save, CheckCircle,
  Search, X, Sparkles, ArrowRight, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { getAllMacroprocesses } from '@/data/industryLibrary';
import {
  Phase2FormData,
  EMPTY_PHASE2_FORM,
  savePhase2Response,
  analyzeProcess,
  Phase2Analysis,
  loadPhase2Responses,
  saveBPMN,
  loadBPMN,
  loadAllBPMNs,
  BPMNHistoryEntry,
  PersistedBPMN,
  BPMNNode,
} from '@/lib/phase2';
import BPMNDiagram from '@/components/BPMNDiagram';
import BPMNEditor from '@/components/BPMNEditor';

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
  role?:        'respondent' | 'analyst';
}

type Phase2View = 'selection' | 'wizard' | 'validation' | 'analyst_review' | 'bpmn_readonly' | 'report';

type WizardStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 'done';

const STEP_LABELS = [
  'Identificação',
  'Como começa',
  'Etapas e sequência',
  'Decisões',
  'Como funciona',
  'Origem dos dados',
  'Sistemas',
  'Estabilidade',
  'Entrega e cliente',
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

const OUTPUT_OPTIONS = [
  'Relatório ou documento gerado',
  'Dados atualizados em sistema',
  'Aprovação ou validação concluída',
  'Notificação ou comunicação enviada',
  'Pagamento ou transação processada',
  'Cadastro ou registro criado/atualizado',
  'Outro',
];

const CUSTOMER_OPTIONS = [
  'Outro departamento interno',
  'Cliente externo',
  'Gestão ou diretoria',
  'Órgão regulador ou auditoria',
  'Fornecedor ou parceiro',
  'O próprio departamento (uso interno)',
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
  const [selected,   setSelected]   = useState('');
  const [customStep, setCustomStep] = useState('');

  const addStep = () => {
    if (selected) { onChange([...value, selected]); setSelected(''); }
  };

  const addCustom = () => {
    const trimmed = customStep.trim();
    if (trimmed) { onChange([...value, trimmed]); setCustomStep(''); }
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
      <div className="flex gap-2 mt-2">
        <input
          type="text"
          value={customStep}
          onChange={e => setCustomStep(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }}
          placeholder="Ou digite uma etapa personalizada..."
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <button
          type="button"
          onClick={addCustom}
          disabled={!customStep.trim()}
          className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-40 text-gray-600 text-xs font-medium transition-colors whitespace-nowrap"
        >
          Adicionar
        </button>
      </div>
      {value.length === 0 && (
        <p className="text-[10px] text-gray-400 mt-1">Adicione as etapas na ordem em que acontecem no processo.</p>
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

// ── Report colour helpers ─────────────────────────────────────────────────────

function potentialColor(potential: string): string {
  if (potential === 'ALTO')  return 'bg-emerald-50 border border-emerald-200 text-emerald-800';
  if (potential === 'MÉDIO') return 'bg-amber-50 border border-amber-200 text-amber-800';
  return 'bg-red-50 border border-red-200 text-red-800';
}

function complexityColor(complexity: string): string {
  if (complexity === 'Baixa') return 'bg-emerald-50 border border-emerald-200 text-emerald-800';
  if (complexity === 'Média') return 'bg-amber-50 border border-amber-200 text-amber-800';
  return 'bg-red-50 border border-red-200 text-red-800';
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

type EntryBadgeStatus =
  | 'pending'
  | 'in-progress'
  | 'awaiting-validation'
  | 'validated'
  | 'returned'
  | 'finalized';

function getEntryBadgeStatus(
  entry:      Phase2Entry,
  savedForms: Map<string, Partial<Phase2FormData>>,
  bpmnMap:    Map<string, PersistedBPMN>,
): EntryBadgeStatus {
  const data = savedForms.get(entry.subprocessId);
  if (!data) return 'pending';
  if (!data.gargalo) {
    return (data.departamento || data.comoComeca) ? 'in-progress' : 'pending';
  }
  // Wizard complete — derive from BPMN status
  const bpmn = bpmnMap.get(entry.subprocessId);
  if (!bpmn || bpmn.status === 'draft')                  return 'awaiting-validation';
  if (bpmn.status === 'respondent_validated' ||
      bpmn.status === 'analyst_reviewed')                return 'validated';
  if (bpmn.status === 'returned')                        return 'returned';
  if (bpmn.status === 'finalized')                       return 'finalized';
  return 'awaiting-validation';
}

// ── Selection view ────────────────────────────────────────────────────────────

interface SelectionViewProps {
  entries:        Phase2Entry[];
  savedForms:     Map<string, Partial<Phase2FormData>>;
  bpmnMap:        Map<string, PersistedBPMN>;
  role:           'respondent' | 'analyst';
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
  entries, savedForms, bpmnMap, role, respondentName, nameConfirmed,
  onRespondentChange, onNameConfirm, onSelectEntry, onViewReport,
  onShowLibrary, onShowManual,
}: SelectionViewProps) {
  const doneCount   = entries.filter(e => getEntryStatus(e, savedForms) === 'done').length;
  const total       = entries.length;
  const progressPct = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  // ── Analyst mode ────────────────────────────────────────────────────────────
  if (role === 'analyst') {
    const ANALYST_STATUSES = new Set<string>(['respondent_validated', 'returned', 'finalized']);
    const analystEntries = entries.filter(e => {
      const bpmn = bpmnMap.get(e.subprocessId);
      return bpmn && ANALYST_STATUSES.has(bpmn.status);
    });

    return (
      <div>
        <div className="mb-5">
          <h2 className="text-lg font-bold text-gray-900">Revisão do Analista</h2>
          <p className="text-sm text-gray-400 mt-1">
            {analystEntries.length} subprocesso{analystEntries.length !== 1 ? 's' : ''} aguardando revisão ou finalizados.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-5">
          {analystEntries.length === 0 ? (
            <div className="text-center py-12 text-sm text-gray-400">
              Nenhum subprocesso validado pelo respondente ainda.
            </div>
          ) : analystEntries.map(entry => {
            const bpmn     = bpmnMap.get(entry.subprocessId)!;
            const index    = entries.indexOf(entry);
            const lastValidation = [...bpmn.history].reverse().find(h => h.role === 'respondent' && h.action === 'validated');
            const validatedBy   = lastValidation?.by ?? '—';
            const validatedAt   = lastValidation?.at
              ? new Date(lastValidation.at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
              : '—';

            const ANALYST_BADGE: Record<string, { label: string; cls: string }> = {
              respondent_validated: { label: 'Aguard. revisão', cls: 'bg-violet-100 border-violet-200 text-violet-700' },
              returned:             { label: 'Devolvido',       cls: 'bg-orange-100 border-orange-200 text-orange-700' },
              finalized:            { label: 'Finalizado',      cls: 'bg-emerald-200 border-emerald-300 text-emerald-900' },
            };
            const badgeCfg = ANALYST_BADGE[bpmn.status] ?? ANALYST_BADGE.respondent_validated;

            return (
              <button
                key={entry.subprocessId}
                type="button"
                onClick={() => onSelectEntry(index)}
                className="w-full flex items-center justify-between px-5 py-4 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors text-left"
              >
                <div className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-gray-800 truncate">{entry.subprocessName}</span>
                  <span className="block text-xs text-gray-400 mt-0.5 truncate">
                    {entry.processName} · Validado por {validatedBy} em {validatedAt}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  <span className={`inline-flex items-center border text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${badgeCfg.cls}`}>
                    {badgeCfg.label}
                  </span>
                  <ChevronRight size={14} className="text-gray-300" strokeWidth={2} />
                </div>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onViewReport}
          className="inline-flex items-center gap-2 border border-blue-600 rounded-lg px-4 py-2.5 text-sm text-blue-600 font-semibold hover:bg-blue-50 transition-colors"
        >
          <Sparkles size={14} strokeWidth={2} />
          Ver Relatório
        </button>
      </div>
    );
  }

  // ── Respondent mode ──────────────────────────────────────────────────────────
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
          const badge = getEntryBadgeStatus(entry, savedForms, bpmnMap);
          const BADGE_CFG: Record<EntryBadgeStatus, { icon: React.ReactNode; label: string; cls: string }> = {
            'pending':              { icon: <div className="w-4 h-4 rounded-full border-2 border-gray-300" />, label: 'Pendente', cls: 'bg-gray-100 border-gray-200 text-gray-500' },
            'in-progress':         { icon: <div className="w-4 h-4 rounded-full border-2 border-blue-400 flex items-center justify-center"><div className="w-2 h-2 rounded-full bg-blue-400" /></div>, label: 'Em progresso', cls: 'bg-yellow-100 border-yellow-200 text-yellow-700' },
            'awaiting-validation': { icon: <div className="w-4 h-4 rounded-full border-2 border-blue-500 flex items-center justify-center"><div className="w-2 h-2 rounded-full bg-blue-500" /></div>, label: 'Aguardando validação', cls: 'bg-blue-100 border-blue-200 text-blue-700' },
            'validated':           { icon: <CheckCircle size={16} className="text-emerald-500" strokeWidth={2} />, label: 'Validado', cls: 'bg-emerald-100 border-emerald-200 text-emerald-700' },
            'returned':            { icon: <div className="w-4 h-4 rounded-full border-2 border-orange-400 flex items-center justify-center"><div className="w-2 h-2 rounded-full bg-orange-400" /></div>, label: 'Devolvido', cls: 'bg-orange-100 border-orange-200 text-orange-700' },
            'finalized':           { icon: <CheckCircle size={16} className="text-emerald-700" strokeWidth={2.5} />, label: 'Finalizado', cls: 'bg-emerald-200 border-emerald-300 text-emerald-900' },
          };
          const cfg = BADGE_CFG[badge];
          return (
            <button
              key={entry.subprocessId}
              type="button"
              onClick={() => onSelectEntry(index)}
              className="w-full flex items-center justify-between px-5 py-4 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors text-left"
            >
              {/* Left: status icon + names */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="shrink-0">{cfg.icon}</div>
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
                <span className={`inline-flex items-center border text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${cfg.cls}`}>
                  {cfg.label}
                </span>
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
  onComplete:     (finalData: Partial<Phase2FormData>) => void;
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
    if (initialData.gargalo)                                              return 'done';
    if (initialData.outputPrincipal || initialData.customerPrincipal)    return 10;
    if (initialData.sempresMesmosPassos)                                  return 9;
    if (initialData.copiaManual)                                          return 8;
    if (initialData.fontesDados?.length)                                  return 7;
    if (initialData.seguiRegras)                                          return 6;
    if (initialData.temDecisao)                                           return 5;
    if (initialData.sequenciaEtapas?.length)                              return 4;
    if (initialData.comoComeca)                                           return 3;
    if (initialData.departamento)                                         return 2;
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
      // Auto-persist the generated BPMN when the wizard is finalised.
      const analysis = analyzeProcess(data);
      if (analysis && analysis.fluxoBPMN.length > 0) {
        const historyEntry: BPMNHistoryEntry = {
          action:  'edited',
          by:      respondentName || 'respondent',
          role:    'respondent',
          comment: 'BPMN gerado automaticamente',
          at:      new Date().toISOString(),
        };
        saveBPMN({
          diagnosticId: diagnosticId,
          subprocessId: entry.subprocessId,
          nodes:        analysis.fluxoBPMN,
          status:       'draft',
          history:      [historyEntry],
        }).catch(err => {
          console.error('[Phase2] Failed to persist BPMN:', err);
        });
      }
      onComplete(data);
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

        {/* Step 3: Etapas e sequência (unified) */}
        {step === 3 && (
          <div>
            <p className="text-base font-semibold text-gray-700 mb-1">
              Quais são as etapas deste processo e em qual ordem acontecem?
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Adicione cada etapa na ordem em que acontece. Você pode selecionar da lista ou digitar etapas personalizadas. Use as setas para reordenar. Esta sequência será usada para gerar o fluxo BPMN.
            </p>
            <SequenceBuilder value={data.sequenciaEtapas ?? []} onChange={v => set('sequenciaEtapas', v)} />
          </div>
        )}

        {/* Step 4: Decisões */}
        {step === 4 && (
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

        {/* Step 5: Como funciona */}
        {step === 5 && (
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

        {/* Step 6: Origem dos dados */}
        {step === 6 && (
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

        {/* Step 7: Sistemas */}
        {step === 7 && (
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

        {/* Step 8: Estabilidade */}
        {step === 8 && (
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

        {/* Step 9: Output + Customer */}
        {step === 9 && (
          <div className="space-y-6">
            <div>
              <p className="text-base font-semibold text-gray-700 mb-1">
                Qual é a principal entrega deste processo?
              </p>
              <p className="text-sm text-gray-500 mb-4">
                O que o processo produz quando é concluído com sucesso?
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {OUTPUT_OPTIONS.map(opt => (
                  <Radio key={opt} label={opt} value={opt} current={data.outputPrincipal ?? ''} onChange={v => set('outputPrincipal', v)} size="base" />
                ))}
              </div>
            </div>
            <div>
              <p className="text-base font-semibold text-gray-700 mb-2">
                Quem recebe essa entrega?
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {CUSTOMER_OPTIONS.map(opt => (
                  <Radio key={opt} label={opt} value={opt} current={data.customerPrincipal ?? ''} onChange={v => set('customerPrincipal', v)} size="base" />
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

// ── Validation view ───────────────────────────────────────────────────────────

interface ValidationViewProps {
  entry:          Phase2Entry;
  diagnosticId:   string;
  respondentName: string;
  formData:       Partial<Phase2FormData>;
  onApprove:      () => void;
  onBack:         () => void;
}

function ValidationView({
  entry, diagnosticId, respondentName, formData, onApprove, onBack,
}: ValidationViewProps) {
  // Initialise nodes synchronously from formData as a fallback,
  // then override with persisted BPMN if one exists in Firestore.
  const [nodes,        setNodes]        = useState<BPMNNode[]>(() => analyzeProcess(formData)?.fluxoBPMN ?? []);
  const [comment,      setComment]      = useState('');
  const [saving,       setSaving]       = useState(false);
  const [loading,      setLoading]      = useState(true);
  const [returnReason, setReturnReason] = useState<string | null>(null);

  useEffect(() => {
    loadBPMN(diagnosticId, entry.subprocessId)
      .then(bpmn => {
        if (bpmn) {
          setNodes(bpmn.nodes);
          if (bpmn.respondentComment) setComment(bpmn.respondentComment);
          // Show return reason if analyst returned this BPMN.
          if (bpmn.status === 'returned') {
            const returnEntry = [...bpmn.history].reverse().find(h => h.action === 'returned');
            setReturnReason(returnEntry?.comment ?? 'Sem motivo especificado');
          }
        } else {
          // No persisted BPMN yet — save the auto-generated draft.
          const initialNodes = analyzeProcess(formData)?.fluxoBPMN ?? [];
          if (initialNodes.length > 0) {
            saveBPMN({
              diagnosticId,
              subprocessId:  entry.subprocessId,
              nodes:         initialNodes,
              status:        'draft',
              history:       [{
                action:  'edited',
                by:      respondentName || 'respondent',
                role:    'respondent',
                comment: 'BPMN gerado automaticamente',
                at:      new Date().toISOString(),
              }],
            }).catch(err => console.error('[Phase2] Draft BPMN save failed:', err));
          }
        }
      })
      .catch(err => console.error('[Phase2] loadBPMN failed:', err))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleValidate = async () => {
    setSaving(true);
    try {
      await saveBPMN({
        diagnosticId,
        subprocessId:      entry.subprocessId,
        nodes,
        status:            'respondent_validated',
        history:           [{
          action:  'validated',
          by:      respondentName || 'respondent',
          role:    'respondent',
          comment: comment.trim() || undefined,
          at:      new Date().toISOString(),
        }],
        respondentComment: comment.trim() || undefined,
      });
      onApprove();
    } catch (err) {
      console.error('[Phase2] Validate save failed:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleBack = async () => {
    // Persist current draft before going back so the editor state is preserved.
    saveBPMN({
      diagnosticId,
      subprocessId:      entry.subprocessId,
      nodes,
      status:            'draft',
      history:           [{
        action:  'edited',
        by:      respondentName || 'respondent',
        role:    'respondent',
        comment: 'Rascunho salvo ao voltar para o questionário',
        at:      new Date().toISOString(),
      }],
      respondentComment: comment.trim() || undefined,
    }).catch(err => console.error('[Phase2] Back-draft save failed:', err));
    onBack();
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-1">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ChevronLeft size={16} strokeWidth={2} />
          Voltar ao questionário
        </button>
      </div>
      <div className="mb-1">
        <span className="text-[10px] font-bold tracking-widest text-blue-500 uppercase">Validação do Fluxo</span>
      </div>
      <h2 className="text-lg font-bold text-gray-900 mb-0.5">{entry.subprocessName}</h2>
      <p className="text-sm text-gray-400 mb-5">{entry.processName}</p>

      {/* Return reason banner */}
      {returnReason && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 mb-4 text-sm text-orange-800">
          <span className="font-bold">⚠ Devolvido pelo analista:</span> {returnReason}
        </div>
      )}

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 mb-5 text-sm text-blue-700">
        Revise o fluxo gerado automaticamente. Você pode reordenar, adicionar ou remover etapas antes de validar.
      </div>

      {/* BPMN Editor */}
      {loading ? (
        <div className="h-[500px] rounded-xl border border-gray-200 flex items-center justify-center text-sm text-gray-400">
          Carregando fluxo…
        </div>
      ) : (
        <BPMNEditor
          nodes={nodes}
          onChange={setNodes}
          role="respondent"
        />
      )}

      {/* Respondent comment */}
      <div className="mt-4">
        <label className="block text-xs font-semibold text-gray-600 mb-1.5">
          Comentário (opcional)
        </label>
        <textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder="Adicione observações sobre este fluxo…"
          rows={3}
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>

      {/* Footer buttons */}
      <div className="flex items-center justify-between mt-5 pt-5 border-t border-gray-100">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-2 border border-gray-200 rounded-xl px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <ChevronLeft size={14} strokeWidth={2} />
          Editar respostas
        </button>
        <button
          type="button"
          onClick={handleValidate}
          disabled={saving || nodes.length === 0}
          className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors"
        >
          <CheckCircle size={15} strokeWidth={2} />
          {saving ? 'Salvando…' : 'Validar fluxo'}
        </button>
      </div>
    </div>
  );
}

// ── Analyst review view ───────────────────────────────────────────────────────

interface AnalystReviewViewProps {
  entry:       Phase2Entry;
  diagnosticId: string;
  bpmn:        PersistedBPMN;
  onFinalize:  () => void;
  onReturn:    () => void;
  onBack:      () => void;
}

function AnalystReviewView({ entry, diagnosticId, bpmn, onFinalize, onReturn, onBack }: AnalystReviewViewProps) {
  const [nodes,          setNodes]          = useState<BPMNNode[]>(bpmn.nodes);
  const [analystName,    setAnalystName]    = useState(() =>
    typeof window !== 'undefined' ? (localStorage.getItem('oea_analyst_name') ?? '') : '',
  );
  const [analystComment, setAnalystComment] = useState(bpmn.analystComment ?? '');
  const [showReturnForm, setShowReturnForm] = useState(false);
  const [returnReason,   setReturnReason]   = useState('');
  const [saving,         setSaving]         = useState(false);

  const lastValidation = [...bpmn.history].reverse().find(h => h.role === 'respondent' && h.action === 'validated');
  const validatedBy    = lastValidation?.by ?? '—';
  const validatedAt    = lastValidation?.at
    ? new Date(lastValidation.at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
    : '—';

  // Compute auto-analysis from saved form data (display-only, read-only section).
  // Note: we use the existing BPMN nodes for the diagram, but show the classifier results.
  const analysis = analyzeProcess({});  // will be overridden if savedForms available — parent passes bpmn

  const handleAnalystNameChange = (name: string) => {
    setAnalystName(name);
    if (typeof window !== 'undefined') localStorage.setItem('oea_analyst_name', name);
  };

  const handleFinalize = async () => {
    if (!analystName.trim()) return;
    setSaving(true);
    try {
      await saveBPMN({
        ...bpmn,
        nodes,
        status:         'finalized',
        history:        [...bpmn.history, {
          action:  'finalized',
          by:      analystName.trim(),
          role:    'analyst',
          comment: analystComment.trim() || undefined,
          at:      new Date().toISOString(),
        }],
        analystComment: analystComment.trim() || undefined,
      });
      onFinalize();
    } catch (err) {
      console.error('[Phase2] Finalize failed:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleReturn = async () => {
    if (!analystName.trim() || !returnReason.trim()) return;
    setSaving(true);
    try {
      await saveBPMN({
        ...bpmn,
        nodes,
        status:         'returned',
        history:        [...bpmn.history, {
          action:  'returned',
          by:      analystName.trim(),
          role:    'analyst',
          comment: returnReason.trim(),
          at:      new Date().toISOString(),
        }],
        analystComment: analystComment.trim() || undefined,
      });
      onReturn();
    } catch (err) {
      console.error('[Phase2] Return failed:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-1">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors">
          <ChevronLeft size={16} strokeWidth={2} />
          Voltar à lista
        </button>
      </div>
      <div className="mb-1">
        <span className="text-[10px] font-bold tracking-widest text-purple-500 uppercase">Revisão do Analista</span>
      </div>
      <h2 className="text-lg font-bold text-gray-900 mb-0.5">{entry.subprocessName}</h2>
      <p className="text-sm text-gray-400 mb-4">{entry.processName}</p>

      {/* Validation info */}
      <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 mb-5 text-sm text-gray-600">
        Validado por <span className="font-semibold text-gray-800">{validatedBy}</span> em {validatedAt}
        {bpmn.respondentComment && (
          <div className="mt-1.5 text-gray-500 italic">"{bpmn.respondentComment}"</div>
        )}
      </div>

      {/* Analyst name */}
      <div className="mb-5">
        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Nome do analista</label>
        <input
          type="text"
          value={analystName}
          onChange={e => handleAnalystNameChange(e.target.value)}
          placeholder="Seu nome"
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 w-full max-w-xs"
        />
      </div>

      {/* BPMN Editor */}
      <BPMNEditor nodes={nodes} onChange={setNodes} role="analyst" />

      {/* Auto-analysis read-only section */}
      {analysis && (
        <div className="mt-5 rounded-xl border border-gray-100 bg-gray-50 p-4">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Análise automática</p>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className={`rounded-lg p-3 ${potentialColor(analysis.potential)}`}>
              <div className="text-[10px] font-semibold uppercase opacity-70 mb-0.5">Potencial</div>
              <div className="text-base font-bold">{analysis.potential}</div>
            </div>
            <div className={`rounded-lg p-3 ${complexityColor(analysis.complexidade)}`}>
              <div className="text-[10px] font-semibold uppercase opacity-70 mb-0.5">Complexidade</div>
              <div className="text-base font-bold">{analysis.complexidade}</div>
            </div>
          </div>
          {analysis.tiposAutomacao.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {analysis.tiposAutomacao.map(t => (
                <span key={t} className={`inline-flex items-center border rounded-full text-xs font-semibold px-2.5 py-0.5 ${TYPE_COLOURS[t] ?? 'bg-gray-100 border-gray-200 text-gray-700'}`}>{t}</span>
              ))}
            </div>
          )}
          <p className="text-xs text-gray-500 leading-relaxed">{analysis.justificativa}</p>
        </div>
      )}

      {/* Analyst comment */}
      <div className="mt-4">
        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Comentário do analista (opcional)</label>
        <textarea
          value={analystComment}
          onChange={e => setAnalystComment(e.target.value)}
          placeholder="Observações técnicas ou justificativa…"
          rows={3}
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-400"
        />
      </div>

      {/* Return form */}
      {showReturnForm && (
        <div className="mt-3 bg-orange-50 border border-orange-200 rounded-xl p-4">
          <label className="block text-xs font-semibold text-orange-700 mb-1.5">Motivo da devolução <span className="text-red-500">*</span></label>
          <textarea
            value={returnReason}
            onChange={e => setReturnReason(e.target.value)}
            placeholder="Descreva o que precisa ser corrigido…"
            rows={3}
            className="w-full border border-orange-200 rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
            autoFocus
          />
        </div>
      )}

      {!analystName.trim() && (
        <p className="text-xs text-amber-600 mt-3">Informe seu nome para salvar.</p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-5 pt-5 border-t border-gray-100 flex-wrap gap-3">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-2 border border-gray-200 rounded-xl px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
          <ChevronLeft size={14} strokeWidth={2} />
          Voltar
        </button>
        <div className="flex items-center gap-2">
          {!showReturnForm ? (
            <button
              type="button"
              onClick={() => setShowReturnForm(true)}
              disabled={!analystName.trim()}
              className="inline-flex items-center gap-2 border border-orange-300 text-orange-600 rounded-xl px-5 py-2.5 text-sm font-semibold hover:bg-orange-50 disabled:opacity-40 transition-colors"
            >
              ↩ Devolver
            </button>
          ) : (
            <button
              type="button"
              onClick={handleReturn}
              disabled={saving || !analystName.trim() || !returnReason.trim()}
              className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors"
            >
              {saving ? 'Salvando…' : '↩ Confirmar devolução'}
            </button>
          )}
          <button
            type="button"
            onClick={handleFinalize}
            disabled={saving || !analystName.trim() || showReturnForm}
            className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors"
          >
            <CheckCircle size={15} strokeWidth={2} />
            {saving ? 'Salvando…' : '✓✓ Aprovar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Report view ───────────────────────────────────────────────────────────────

interface ReportViewProps {
  entries:    Phase2Entry[];
  savedForms: Map<string, Partial<Phase2FormData>>;
  bpmnMap:    Map<string, PersistedBPMN>;
  onBack:     () => void;
}

function ReportView({ entries, savedForms, bpmnMap, onBack }: ReportViewProps) {
  const completedEntries = entries.filter(e => getEntryStatus(e, savedForms) === 'done');

  const analyses = completedEntries.flatMap(entry => {
    const data     = savedForms.get(entry.subprocessId) ?? {};
    const analysis = analyzeProcess(data);
    return analysis ? [{ entry, analysis }] : [];
  });

  // Summary stats
  const altoCount = analyses.filter(a => a.analysis.potential === 'ALTO').length;
  const typeCounts: Record<string, number> = {};
  analyses.forEach(({ analysis }) => {
    analysis.tiposAutomacao.forEach(t => { typeCounts[t] = (typeCounts[t] ?? 0) + 1; });
  });
  const mostFreqType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ChevronLeft size={16} strokeWidth={2} />
          Voltar
        </button>
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Sparkles size={18} className="text-violet-500" strokeWidth={2} />
          Relatório de Automação
        </h2>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-center">
          <div className="text-3xl font-bold text-gray-900 mb-1">{completedEntries.length}</div>
          <div className="text-xs text-gray-500 font-medium">Subprocessos mapeados</div>
        </div>
        <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm p-5 text-center">
          <div className="text-3xl font-bold text-emerald-600 mb-1">{altoCount}</div>
          <div className="text-xs text-gray-500 font-medium">Alto potencial</div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-center">
          <div className="text-sm font-bold text-gray-900 mb-1 leading-tight">{mostFreqType}</div>
          <div className="text-xs text-gray-500 font-medium">Tipo mais frequente</div>
        </div>
      </div>

      {/* Per-subprocess sections */}
      {analyses.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-12">Nenhum subprocesso concluído com análise disponível.</p>
      ) : analyses.map(({ entry, analysis }) => {
        const bpmn          = bpmnMap.get(entry.subprocessId);
        const usePersistedNodes =
          bpmn?.status === 'finalized' || bpmn?.status === 'respondent_validated';
        const diagramNodes  = usePersistedNodes ? (bpmn!.nodes) : analysis.fluxoBPMN;
        const bpmnBadge     = bpmn?.status === 'finalized'
          ? { label: '✓✓ Finalizado pelo analista', cls: 'bg-emerald-200 border-emerald-300 text-emerald-900' }
          : bpmn?.status === 'respondent_validated'
          ? { label: '✓ Validado',                  cls: 'bg-emerald-100 border-emerald-200 text-emerald-700' }
          : null;

        return (
          <div key={entry.subprocessId} className="mb-10">
            {/* Section header */}
            <div className="mb-4 pb-2 border-b border-gray-100 flex items-start justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-gray-900">{entry.subprocessName}</h3>
                <p className="text-sm text-gray-400 mt-0.5">{entry.processName}</p>
              </div>
              {bpmnBadge && (
                <span className={`shrink-0 inline-flex items-center border text-[10px] font-bold px-2.5 py-1 rounded-full ${bpmnBadge.cls}`}>
                  {bpmnBadge.label}
                </span>
              )}
            </div>

            {/* Potential + complexity */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className={`rounded-xl p-4 ${potentialColor(analysis.potential)}`}>
                <div className="text-[10px] font-semibold uppercase tracking-wider mb-1 opacity-70">Potencial de automação</div>
                <div className="text-xl font-bold">{analysis.potential}</div>
              </div>
              <div className={`rounded-xl p-4 ${complexityColor(analysis.complexidade)}`}>
                <div className="text-[10px] font-semibold uppercase tracking-wider mb-1 opacity-70">Complexidade</div>
                <div className="text-xl font-bold">{analysis.complexidade}</div>
              </div>
            </div>

            {/* Technology badges */}
            {analysis.tiposAutomacao.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {analysis.tiposAutomacao.map(type => (
                  <span key={type} className={`inline-flex items-center border rounded-full text-xs font-semibold px-3 py-1 ${TYPE_COLOURS[type] ?? 'bg-gray-100 border-gray-200 text-gray-700'}`}>
                    {type}
                  </span>
                ))}
              </div>
            )}

            {/* Justification */}
            <p className="text-sm text-gray-600 leading-relaxed mb-4">{analysis.justificativa}</p>

            {/* BPMN diagram */}
            {diagramNodes.length > 0 && (
              <div className="rounded-xl border border-gray-100 bg-white p-4 overflow-x-auto">
                <BPMNDiagram nodes={diagramNodes} size="full" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Phase2Screen({ diagnosticId, prioritized, savedForms: initialSavedForms, role = 'respondent' }: Props) {
  const [respondentName,   setRespondentName]   = useState('');
  const [nameConfirmed,    setNameConfirmed]    = useState(false);
  const [entries,          setEntries]          = useState<Phase2Entry[]>(prioritized);
  const [savedForms,       setSavedForms]       = useState<Map<string, Partial<Phase2FormData>>>(initialSavedForms);
  const [bpmnMap,          setBpmnMap]          = useState<Map<string, PersistedBPMN>>(new Map());
  const [showLibrary,      setShowLibrary]      = useState(false);
  const [showManual,       setShowManual]       = useState(false);
  const [view,             setView]             = useState<Phase2View>('selection');
  const [activeEntryIndex, setActiveEntryIndex] = useState<number | null>(null);
  // Tracks the finalData passed from WizardView so ValidationView can access it immediately.
  const [wizardFinalData,  setWizardFinalData]  = useState<Partial<Phase2FormData>>({});

  const { toasts, showToast, dismissToast } = useToast();

  const existingIds = new Set(entries.map(e => e.subprocessId));

  // Load persisted BPMNs on mount.
  useEffect(() => {
    loadAllBPMNs(diagnosticId)
      .then(m => setBpmnMap(m))
      .catch(err => console.error('[Phase2] loadAllBPMNs failed:', err));
  }, [diagnosticId]);

  const refreshBpmnMap = () => {
    loadAllBPMNs(diagnosticId)
      .then(m => setBpmnMap(m))
      .catch(err => console.error('[Phase2] bpmnMap refresh failed:', err));
  };

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

  const handleWizardComplete = (finalData: Partial<Phase2FormData>) => {
    // Optimistically update savedForms with the just-saved data.
    if (activeEntryIndex !== null) {
      setSavedForms(prev => {
        const next = new Map(prev);
        next.set(entries[activeEntryIndex].subprocessId, finalData);
        return next;
      });
    }
    setWizardFinalData(finalData);
    // Also reload savedForms in background.
    loadPhase2Responses(diagnosticId).then(existing => {
      const formsMap = new Map<string, Partial<Phase2FormData>>();
      existing.forEach((v, k) => formsMap.set(k, v as Partial<Phase2FormData>));
      setSavedForms(formsMap);
    }).catch(err => console.error('[Phase2] Failed to reload responses:', err));
    // Go to validation instead of selection.
    setView('validation');
  };

  const handleWizardBack = () => {
    setView('selection');
    setActiveEntryIndex(null);
  };

  const handleApprove = () => {
    refreshBpmnMap();
    setView('selection');
    setActiveEntryIndex(null);
  };

  const handleValidationBack = () => {
    setView('wizard');
  };

  // Route an entry selection based on role and BPMN status.
  const handleSelectEntry = (index: number) => {
    setActiveEntryIndex(index);
    if (role === 'analyst') {
      const bpmn = bpmnMap.get(entries[index].subprocessId);
      if (bpmn?.status === 'finalized') {
        setView('bpmn_readonly');
      } else {
        setView('analyst_review');
      }
    } else {
      // Respondent: if BPMN is 'returned', go to validation; else wizard.
      const bpmn = bpmnMap.get(entries[index].subprocessId);
      if (bpmn?.status === 'returned') {
        setWizardFinalData(savedForms.get(entries[index].subprocessId) ?? {});
        setView('validation');
      } else {
        setView('wizard');
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-8">

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {view === 'selection' && (
        <SelectionView
          entries={entries}
          savedForms={savedForms}
          bpmnMap={bpmnMap}
          role={role}
          respondentName={respondentName}
          nameConfirmed={nameConfirmed}
          onRespondentChange={name => { setRespondentName(name); setNameConfirmed(false); }}
          onNameConfirm={() => setNameConfirmed(true)}
          onSelectEntry={handleSelectEntry}
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

      {view === 'validation' && activeEntryIndex !== null && (
        <ValidationView
          entry={entries[activeEntryIndex]}
          diagnosticId={diagnosticId}
          respondentName={respondentName}
          formData={wizardFinalData}
          onApprove={handleApprove}
          onBack={handleValidationBack}
        />
      )}

      {view === 'analyst_review' && activeEntryIndex !== null && (() => {
        const bpmn = bpmnMap.get(entries[activeEntryIndex].subprocessId);
        if (!bpmn) return null;
        return (
          <AnalystReviewView
            entry={entries[activeEntryIndex]}
            diagnosticId={diagnosticId}
            bpmn={bpmn}
            onFinalize={() => { refreshBpmnMap(); setView('selection'); setActiveEntryIndex(null); }}
            onReturn={() => { refreshBpmnMap(); setView('selection'); setActiveEntryIndex(null); }}
            onBack={() => { setView('selection'); setActiveEntryIndex(null); }}
          />
        );
      })()}

      {view === 'bpmn_readonly' && activeEntryIndex !== null && (() => {
        const bpmn = bpmnMap.get(entries[activeEntryIndex].subprocessId);
        if (!bpmn) return null;
        return (
          <div>
            <button type="button" onClick={() => { setView('selection'); setActiveEntryIndex(null); }} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-4 transition-colors">
              <ChevronLeft size={16} strokeWidth={2} />
              Voltar à lista
            </button>
            <h2 className="text-lg font-bold text-gray-900 mb-0.5">{entries[activeEntryIndex].subprocessName}</h2>
            <p className="text-sm text-gray-400 mb-5">{entries[activeEntryIndex].processName}</p>
            <div className="inline-flex items-center bg-emerald-200 border border-emerald-300 text-emerald-900 text-xs font-bold px-3 py-1 rounded-full mb-4">
              ✓✓ Finalizado pelo analista
            </div>
            <BPMNEditor nodes={bpmn.nodes} onChange={() => {}} role="analyst" readOnly />
          </div>
        );
      })()}

      {view === 'report' && (
        <ReportView
          entries={entries}
          savedForms={savedForms}
          bpmnMap={bpmnMap}
          onBack={() => setView('selection')}
        />
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
