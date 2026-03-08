'use client';

import { useState } from 'react';
import { Users } from 'lucide-react';
import { Participant } from '@/types';

interface Props {
  onIdentify: (participant: Participant) => void;
}

export default function ParticipantFormModal({ onIdentify }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Nome é obrigatório';
    if (!email.trim()) e.email = 'E-mail é obrigatório';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      e.email = 'E-mail inválido';
    return e;
  };

  const handleSubmit = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    const participant: Participant = {
      participantId: crypto.randomUUID(),
      name: name.trim(),
      email: email.trim().toLowerCase(),
      department: department.trim(),
      joinedAt: new Date().toISOString(),
    };
    onIdentify(participant);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
            <Users size={18} className="text-violet-600" strokeWidth={1.75} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Identificação do participante</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Preencha seus dados antes de responder os subprocessos.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Nome */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Nome <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder="Seu nome completo"
              autoFocus
              className={`w-full border rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent ${
                errors.name ? 'border-red-400' : 'border-gray-200'
              }`}
            />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>

          {/* Área */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Área <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <input
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="Ex: Financeiro, Compras, TI..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
          </div>

          {/* E-mail */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              E-mail <span className="text-red-400">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder="seu@email.com"
              className={`w-full border rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent ${
                errors.email ? 'border-red-400' : 'border-gray-200'
              }`}
            />
            {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
          </div>
        </div>

        <button
          onClick={handleSubmit}
          className="w-full mt-6 bg-violet-600 hover:bg-violet-700 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
        >
          Entrar no diagnóstico
        </button>
      </div>
    </div>
  );
}
