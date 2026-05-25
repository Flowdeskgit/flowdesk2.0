import React, { createContext, useContext, useEffect, useState } from 'react';
import { flowdesk } from '@/api/flowdeskClient';

const STORAGE_KEY_MODE = 'flowdesk-theme-mode';
const STORAGE_KEY_COLOR = 'flowdesk-theme-color';

const ThemeContext = createContext(null);

const getStoredValue = (key, fallback) => {
  try {
    return localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
};

export function ThemeProvider({ children }) {
  const [tema_cor, setTemaCor] = useState(() => getStoredValue(STORAGE_KEY_COLOR, 'azul'));
  const [modo_exibicao, setModoExibicao] = useState(() => getStoredValue(STORAGE_KEY_MODE, 'claro'));

  useEffect(() => {
    const root = document.documentElement;
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = modo_exibicao === 'escuro' || (modo_exibicao === 'automatico' && systemDark);
    root.classList.toggle('dark', isDark);
  }, [modo_exibicao]);

  useEffect(() => {
    if (modo_exibicao !== 'automatico') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (event) => document.documentElement.classList.toggle('dark', event.matches);
    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }, [modo_exibicao]);

  const savePreferences = (newTema, newModo) => {
    const nextTema = newTema ?? tema_cor;
    const nextModo = newModo ?? modo_exibicao;

    setTemaCor(nextTema);
    setModoExibicao(nextModo);

    try {
      localStorage.setItem(STORAGE_KEY_COLOR, nextTema);
      localStorage.setItem(STORAGE_KEY_MODE, nextModo);
    } catch {
      // Storage can be unavailable in private browsing; the in-memory state still works.
    }

    flowdesk.auth.updateMe({ tema_cor: nextTema, modo_exibicao: nextModo }).catch(() => {});
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
