'use client';

import { useState, useEffect } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';

type Theme = 'system' | 'dark' | 'light';

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('system');

  // Restore saved preference on mount
  useEffect(() => {
    const saved = localStorage.getItem('oea-theme') as Theme | null;
    if (saved === 'dark' || saved === 'light' || saved === 'system') {
      setTheme(saved);
    }
  }, []);

  // Apply to <html> and persist whenever theme changes
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else if (theme === 'light') {
      root.classList.add('light');
      root.classList.remove('dark');
    } else {
      root.classList.remove('dark', 'light');
    }
    localStorage.setItem('oea-theme', theme);
  }, [theme]);

  const cycle = () =>
    setTheme((t) => (t === 'system' ? 'dark' : t === 'dark' ? 'light' : 'system'));

  const Icon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;
  const label =
    theme === 'dark' ? 'Modo escuro' : theme === 'light' ? 'Modo claro' : 'Seguir sistema';

  return (
    <button
      onClick={cycle}
      title={label}
      className="flex items-center justify-center w-8 h-8 rounded-lg text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-border-light)] transition-colors"
    >
      <Icon size={16} strokeWidth={1.75} />
    </button>
  );
}
