'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  ChevronRight, CheckCircle2, Circle, Users,
  ArrowLeft, AlertCircle, CheckCircle,
} from 'lucide-react';
import { processLibrary } from '@/data/processLibrary';
import { Macroprocess, Process, Subprocess, CriteriaScores } from '@/types';
import { supabase } from '@/lib/supabaseClient';
import Questionnaire from '@/components/Questionnaire';

// ── Types ─────────────────────────────────────────────────────────────────────

type View = 'email' | 'area' | 'process' | 'subarea' | 'questionnaire';

interface Notice {
  type: 'success' | 'error';
  message: string;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SessionPage() {
  const params = useParams();
  // Persist the session ID in state immediately so it never changes or goes
  // undefined during client-side navigation within the same session.
  const [sessionId] = useState<string>(() => {
    const raw = params.sessionId;
    return Array.isArray(raw) ? raw[0] : (raw ?? '');
  });

  // ── State machine ───────────────────────────────────────────────────────────
  const [view, setView] = useState<View>('email');

  // Participant
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');

  // Selections — each one is set only by explicit user action
  const [selectedArea, setSelectedArea] = useState<Macroprocess | null>(null);
  const [selectedProcess, setSelectedProcess] = useState<Process | null>(null);
  const [selectedSubarea, setSelectedSubarea] = useState<Subprocess | null>(null);

  // Supabase state
  const [answeredIds, setAnsweredIds] = useState<Set<string>>(new Set());
  const [loadingAnswered, setLoadingAnswered] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  // ── Fetch answered subprocesses from DB ─────────────────────────────────────
  const fetchAnswered = async () => {
    setLoadingAnswered(true);
    const { data } = await supabase
      .from('responses')
      .select('subarea_id')
      .eq('session_id', sessionId);
    if (data) {
      setAnsweredIds(new Set(data.map((r: { subarea_id: string }) => r.subarea_id)));
    }
    setLoadingAnswered(false);
  };

  useEffect(() => {
    fetchAnswered();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // ── Email step ──────────────────────────────────────────────────────────────
  const handleEmailSubmit = () => {
    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setEmailError('Informe um e-mail válido para continuar.');
      return;
    }
    setEmailError('');
    setView('area');
  };

  // ── Navigation — each transition is explicit ────────────────────────────────
  const handleSelectArea = (area: Macroprocess) => {
    setSelectedArea(area);
    setSelectedProcess(null);
    setView('process');
  };

  const handleSelectProcess = (process: Process) => {
    setSelectedProcess(process);
    setView('subarea');
  };

  const handleSelectSubarea = (subprocess: Subprocess) => {
    if (answeredIds.has(subprocess.id)) return; // already answered — no-op
    setSelectedSubarea(subprocess);
    setView('questionnaire');
  };

  // ── Questionnaire submit ─────────────────────────────────────────────────────
  const handleQuestionnaireComplete = async (scores: CriteriaScores) => {
    if (!selectedArea || !selectedProcess || !selectedSubarea) return;
    setSubmitting(true);
    setNotice(null);

    if (!sessionId) {
      console.error('Missing session ID — insert aborted');
      setSubmitting(false);
      setNotice({ type: 'error', message: 'Erro: sessão inválida. Recarregue a página.' });
      return;
    }

    try {
      const { data, error } = await supabase.from('responses').insert({
        session_id: sessionId,
        area: selectedArea.name,
        process: selectedProcess.name,
        subarea_id: selectedSubarea.id,
        score: scores,
        participant_email: email.trim(),
      });

      if (error) {
        console.error('Supabase insert error:', error);
        alert(error.message);
        setSubmitting(false);
        return;
      }

      console.log('Supabase insert success:', data);
      await fetchAnswered();
      setNotice({ type: 'success', message: 'Resposta salva com sucesso!' });
    } catch (err) {
      console.error('Unexpected error:', err);
      alert('Unexpected error while saving response.');
      setSubmitting(false);
      return;
    }

    // Return to the subarea list — selectedArea and selectedProcess are
    // intentionally kept so the user can answer other subprocesses in the same process.
    setSelectedSubarea(null);
    setSubmitting(false);
    setView('subarea');
  };

  const handleQuestionnaireBack = () => {
    setSelectedSubarea(null);
    setView('subarea');
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  if (view === 'email') {
    return (
      <EmailView
        email={email}
        setEmail={setEmail}
        error={emailError}
        onSubmit={handleEmailSubmit}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-6 py-3 shadow-sm">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-sm font-bold text-gray-900 leading-none">OEA</h1>
            <p className="text-xs text-gray-400">Diagnóstico colaborativo</p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <Users size={13} strokeWidth={1.75} />
            <span className="font-mono">{sessionId.slice(0, 8)}</span>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {view === 'area' && (
          <AreaView
            areas={processLibrary}
            onSelect={handleSelectArea}
          />
        )}

        {view === 'process' && selectedArea && (
          <ProcessView
            area={selectedArea}
            onSelect={handleSelectProcess}
            onBack={() => setView('area')}
          />
        )}

        {view === 'subarea' && selectedArea && selectedProcess && (
          <SubareaView
            area={selectedArea}
            process={selectedProcess}
            answeredIds={answeredIds}
            loading={loadingAnswered}
            notice={notice}
            onSelect={handleSelectSubarea}
            onBack={() => { setNotice(null); setView('process'); }}
          />
        )}

        {view === 'questionnaire' && selectedArea && selectedProcess && selectedSubarea && (
          <div className={submitting ? 'opacity-50 pointer-events-none' : ''}>
            <Questionnaire
              macroprocess={selectedArea}
              process={selectedProcess}
              subprocess={selectedSubarea}
              currentIndex={0}
              total={1}
              diagnosticMode="individual"
              onComplete={handleQuestionnaireComplete}
              onBack={handleQuestionnaireBack}
            />
          </div>
        )}
      </main>
    </div>
  );
}

// ── Sub-views ─────────────────────────────────────────────────────────────────

function EmailView({
  email,
  setEmail,
  error,
  onSubmit,
}: {
  email: string;
  setEmail: (v: string) => void;
  error: string;
  onSubmit: () => void;
}) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
            <Users size={18} className="text-blue-600" strokeWidth={1.75} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Diagnóstico colaborativo</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Informe seu e-mail para participar da sessão.
            </p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">
            E-mail <span className="text-red-400">*</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
            placeholder="seu@email.com"
            autoFocus
            className={`w-full border rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              error ? 'border-red-400' : 'border-gray-200'
            }`}
          />
          {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        </div>

        <button
          onClick={onSubmit}
          className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
        >
          Entrar no diagnóstico
        </button>
      </div>
    </div>
  );
}

function AreaView({
  areas,
  onSelect,
}: {
  areas: Macroprocess[];
  onSelect: (area: Macroprocess) => void;
}) {
  return (
    <>
      <h2 className="text-xl font-bold text-gray-900 mb-1">Selecione uma área</h2>
      <p className="text-sm text-gray-500 mb-6">
        Escolha a área de negócio que você irá avaliar.
      </p>
      <div className="flex flex-col gap-3">
        {areas.map((area) => (
          <button
            key={area.id}
            onClick={() => onSelect(area)}
            className="w-full flex items-center justify-between bg-white border border-gray-200 hover:border-blue-400 hover:bg-blue-50 rounded-xl px-5 py-4 text-left transition-all group"
          >
            <span className="font-medium text-gray-800 group-hover:text-blue-700">
              {area.name}
            </span>
            <ChevronRight size={16} className="text-gray-300 group-hover:text-blue-500 flex-shrink-0" strokeWidth={2} />
          </button>
        ))}
      </div>
    </>
  );
}

function ProcessView({
  area,
  onSelect,
  onBack,
}: {
  area: Macroprocess;
  onSelect: (process: Process) => void;
  onBack: () => void;
}) {
  return (
    <>
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-5"
      >
        <ArrowLeft size={14} strokeWidth={2} />
        <span>{area.name}</span>
      </button>

      <h2 className="text-xl font-bold text-gray-900 mb-1">Selecione um processo</h2>
      <p className="text-sm text-gray-500 mb-6">
        Em <span className="font-medium text-gray-700">{area.name}</span>
      </p>

      <div className="flex flex-col gap-3">
        {area.processes.map((proc) => (
          <button
            key={proc.id}
            onClick={() => onSelect(proc)}
            className="w-full flex items-center justify-between bg-white border border-gray-200 hover:border-blue-400 hover:bg-blue-50 rounded-xl px-5 py-4 text-left transition-all group"
          >
            <div>
              <span className="font-medium text-gray-800 group-hover:text-blue-700">
                {proc.name}
              </span>
              <p className="text-xs text-gray-400 mt-0.5">
                {proc.subprocesses.length} subprocessos
              </p>
            </div>
            <ChevronRight size={16} className="text-gray-300 group-hover:text-blue-500 flex-shrink-0" strokeWidth={2} />
          </button>
        ))}
      </div>
    </>
  );
}

function SubareaView({
  area,
  process,
  answeredIds,
  loading,
  notice,
  onSelect,
  onBack,
}: {
  area: Macroprocess;
  process: Process;
  answeredIds: Set<string>;
  loading: boolean;
  notice: Notice | null;
  onSelect: (subprocess: Subprocess) => void;
  onBack: () => void;
}) {
  return (
    <>
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-5"
      >
        <ArrowLeft size={14} strokeWidth={2} />
        <span>
          {area.name} › {process.name}
        </span>
      </button>

      <h2 className="text-xl font-bold text-gray-900 mb-1">Selecione um subprocesso</h2>
      <p className="text-sm text-gray-500 mb-4">
        Em <span className="font-medium text-gray-700">{process.name}</span>
      </p>

      {/* Notice banner */}
      {notice && (
        <div
          className={`flex items-start gap-2.5 rounded-lg px-4 py-3 mb-5 text-sm ${
            notice.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          {notice.type === 'success' ? (
            <CheckCircle size={15} className="flex-shrink-0 mt-0.5" strokeWidth={2} />
          ) : (
            <AlertCircle size={15} className="flex-shrink-0 mt-0.5" strokeWidth={2} />
          )}
          <span>{notice.message}</span>
        </div>
      )}

      {/* Subprocess list */}
      <div className="flex flex-col gap-2">
        {process.subprocesses.map((sp) => {
          const answered = answeredIds.has(sp.id);
          return (
            <button
              key={sp.id}
              onClick={() => onSelect(sp)}
              disabled={answered || loading}
              className={`w-full flex items-center gap-3 rounded-xl px-5 py-3.5 text-left transition-all ${
                answered
                  ? 'bg-gray-50 border border-gray-200 cursor-not-allowed opacity-70'
                  : 'bg-white border border-gray-200 hover:border-blue-400 hover:bg-blue-50 group'
              }`}
            >
              <div className="flex-shrink-0">
                {answered ? (
                  <CheckCircle2 size={17} className="text-green-500" strokeWidth={1.75} />
                ) : (
                  <Circle size={17} className="text-gray-300 group-hover:text-blue-400" strokeWidth={1.75} />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <span
                  className={`text-sm font-medium ${
                    answered ? 'text-gray-400' : 'text-gray-800 group-hover:text-blue-700'
                  }`}
                >
                  {sp.name}
                </span>
                {sp.code && (
                  <span className="block text-xs text-gray-400 mt-0.5">{sp.code}</span>
                )}
              </div>

              {answered ? (
                <span className="text-xs text-green-600 font-medium flex-shrink-0">
                  Respondido
                </span>
              ) : (
                <ChevronRight
                  size={15}
                  className="text-gray-300 group-hover:text-blue-400 flex-shrink-0"
                  strokeWidth={2}
                />
              )}
            </button>
          );
        })}
      </div>

      {loading && (
        <p className="text-center text-xs text-gray-400 mt-4">Atualizando...</p>
      )}
    </>
  );
}
