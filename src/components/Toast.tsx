'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

export type ToastVariant = 'error' | 'success';

export interface ToastMessage {
  id:      string;
  message: string;
  variant: ToastVariant;
}

interface ToastItemProps {
  toast:     ToastMessage;
  onDismiss: (id: string) => void;
}

const VARIANT_STYLES: Record<ToastVariant, string> = {
  error:   'bg-red-600   text-white',
  success: 'bg-emerald-600 text-white',
};

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  useEffect(() => {
    const t = setTimeout(() => onDismiss(toast.id), 5000);
    return () => clearTimeout(t);
  }, [toast.id, onDismiss]);

  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium
                  max-w-sm w-full pointer-events-auto ${VARIANT_STYLES[toast.variant]}`}
      role="alert"
    >
      <span className="flex-1">{toast.message}</span>
      <button
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 opacity-80 hover:opacity-100 transition-opacity"
        aria-label="Fechar"
      >
        <X size={15} strokeWidth={2.5} />
      </button>
    </div>
  );
}

interface ToastContainerProps {
  toasts:    ToastMessage[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (message: string, variant: ToastVariant = 'error') => {
    const id = crypto.randomUUID();
    setToasts(prev => [...prev, { id, message, variant }]);
  };

  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return { toasts, showToast, dismissToast };
}
