import React, { createContext, useContext, useEffect, useState } from 'react';

const STORAGE_KEY_MODE  = 'flowdesk-theme-mode';
const STORAGE_KEY_COLOR = 'flowdesk-theme-color';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  // Read initial values from localStorage synchronously (no flash)
  const [tema_cor,       setTemaCor]       = useState(() => localStorage.getItem(STORAGE_KEY_COLOR) || 'rose');
  const [modo_exibicao,  setModoExibicao]  = useState(() => localStorage.getItem(STORAGE_KEY_MODE)  || 'claro');

  // Apply / remove the `dark` class on <html> whenever mode changes
  useEffect(() => {
    const root       = document.documentElement;
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark     = modo_exibicao === 'escuro' || (modo_exibicao === 'automatico' && systemDark);
    root.classList.toggle('dark', isDark);
  }, [modo_exibicao]);

  // Keep the `dark` class in sync when system preference changes (auto mode)
  useEffect(() => {
    if (modo_exibicao !== 'automatico') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => document.documentElement.classList.toggle('dark', e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [modo_exibicao]);

  const savePreferences = (newTema, newModo) => {
    const t = newTema ?? tema_cor;
    const m = newModo ?? modo_exibicao;
    setTemaCor(t);
    setModoExibicao(m);
    try {
      localStorage.setItem(STORAGE_KEY_COLOR, t);
      localStorage.setItem(STORAGE_KEY_MODE,  m);
    } catch (e) { /* private browsing — ignore */ }
  };

  return (
    <ThemeContext.Provider value={{ tema_cor, modo_exibicao, savePreferences }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
