'use client';

import { useState, useEffect, useRef } from 'react';

const CORRECT_CODE = 'Amanda6789@';
const STORAGE_KEY  = 'oea_access_granted';

export default function PasswordGate({ children }: { children: React.ReactNode }) {
  const [granted, setGranted]   = useState<boolean | null>(null); // null = checking
  const [code, setCode]         = useState('');
  const [error, setError]       = useState(false);
  const [shake, setShake]       = useState(false);
  const inputRef                = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    setGranted(stored === '1');
  }, []);

  useEffect(() => {
    if (granted === false) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [granted]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code === CORRECT_CODE) {
      sessionStorage.setItem(STORAGE_KEY, '1');
      setGranted(true);
      setError(false);
    } else {
      setError(true);
      setShake(true);
      setCode('');
      setTimeout(() => setShake(false), 600);
    }
  };

  if (granted === null) return null; // hydration guard

  if (granted) return <>{children}</>;

  return (
    <div className="fixed inset-0 z-[9999] bg-gray-900/80 backdrop-blur-sm flex items-center justify-center px-4">
      <div
        className={`bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col gap-5 ${shake ? 'animate-shake' : ''}`}
        style={shake ? { animation: 'shake 0.5s ease' } : undefined}
      >
        <div className="flex flex-col gap-1 text-center">
          <h1 className="text-xl font-bold text-gray-900">Acesso restrito</h1>
          <p className="text-sm text-gray-500">
            Digite o código de acesso para continuar.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            ref={inputRef}
            type="password"
            value={code}
            onChange={(e) => { setCode(e.target.value); setError(false); }}
            placeholder="Código de acesso"
            autoComplete="off"
            className={`w-full border rounded-lg px-4 py-2.5 text-sm outline-none transition-colors
              ${error
                ? 'border-red-400 bg-red-50 focus:border-red-500'
                : 'border-gray-300 bg-white focus:border-blue-500'
              }`}
          />

          {error && (
            <p className="text-xs text-red-600 -mt-1">
              Código incorreto. Tente novamente.
            </p>
          )}

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
          >
            Entrar
          </button>
        </form>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          15%       { transform: translateX(-6px); }
          30%       { transform: translateX(6px); }
          45%       { transform: translateX(-5px); }
          60%       { transform: translateX(5px); }
          75%       { transform: translateX(-3px); }
          90%       { transform: translateX(3px); }
        }
      `}</style>
    </div>
  );
}
