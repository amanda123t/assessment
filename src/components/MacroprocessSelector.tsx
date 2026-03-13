'use client';

import {
  DollarSign, ShoppingCart, TrendingUp, Users,
  Truck, UserCog, ShieldCheck, LucideIcon,
} from 'lucide-react';
import { Macroprocess } from '@/types';
import { processLibrary } from '@/data/processLibrary';

// Icon map keyed by macroprocess ID — keeps JSON data icon-agnostic
const MACRO_ICONS: Record<string, LucideIcon> = {
  'finance':         DollarSign,
  'procurement':     ShoppingCart,
  'sales':           TrendingUp,
  'customer-ops':    Users,
  'supply-chain':    Truck,
  'human-resources': UserCog,
  'governance':      ShieldCheck,
};

interface Props {
  onSelect: (macroprocess: Macroprocess) => void;
  onBack: () => void;
}

export default function MacroprocessSelector({ onSelect, onBack }: Props) {
  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="mb-8">
        <button
          onClick={onBack}
          className="text-sm text-gray-500 hover:text-gray-600 transition-colors mb-4 block"
        >
          ← Voltar ao início
        </button>
        <h2 className="text-2xl font-bold text-gray-900">Selecione o Macroprocesso</h2>
        <p className="text-gray-500 mt-1">Escolha a área funcional que deseja avaliar</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {processLibrary.map((macro) => {
          const Icon = MACRO_ICONS[macro.id];
          return (
            <button
              key={macro.id}
              onClick={() => onSelect(macro)}
              className="group bg-white rounded-xl border border-gray-200 p-5 text-left hover:border-blue-400 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
            >
              {Icon && (
                <Icon
                  size={20}
                  strokeWidth={1.5}
                  className="text-gray-400 group-hover:text-blue-500 transition-colors mb-3"
                />
              )}
              <h3 className="font-semibold text-gray-800 group-hover:text-blue-600 transition-colors text-sm">
                {macro.name}
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                {macro.processes.length} processo{macro.processes.length !== 1 ? 's' : ''}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
