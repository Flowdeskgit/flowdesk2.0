import React, { useState } from 'react';
import { useTheme } from '@/lib/ThemeContext';
import { Sun, Moon, Monitor, Palette, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const MODOS = [
  { id: 'claro', label: 'Claro', desc: 'Fundo branco, visual limpo', icon: Sun },
  { id: 'escuro', label: 'Escuro', desc: 'Fundo escuro, dark mode', icon: Moon },
  { id: 'automatico', label: 'Automático', desc: 'Segue configuração do sistema', icon: Monitor },
];

const CORES = [
  { id: 'azul', label: 'Azul Elegante', primary: '#2563EB', secondary: '#DBEAFE', desc: 'Padrão do sistema' },
  { id: 'rose', label: 'Rosa', primary: '#E11D48', secondary: '#FFE4E6', desc: 'Tema atual (rosa)' },
  { id: 'esmeralda', label: 'Esmeralda', primary: '#059669', secondary: '#D1FAE5', desc: 'Verde sofisticado' },
  { id: 'violeta', label: 'Violeta', primary: '#7C3AED', secondary: '#EDE9FE', desc: 'Roxo moderno' },
];

export default function Configuracoes() {
  const { tema_cor, modo_exibicao, savePreferences } = useTheme() || {};
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async (newTema, newModo) => {
    setSaving(true);
    await savePreferences?.(newTema, newModo);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/20 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-4 md:p-6">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Configurações</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Personalize a aparência do sistema para sua preferência.</p>
        </div>

        {saved && (
          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-emerald-700 dark:bg-emerald-900/30 dark:border-emerald-700 dark:text-emerald-300">
            <Check className="h-4 w-4" />
            <span className="text-sm font-medium">Preferências salvas com sucesso!</span>
          </div>
        )}

        {/* Aparência */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-700">
            <div className="h-9 w-9 rounded-xl bg-blue-600 flex items-center justify-center">
              <Palette className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-800 dark:text-white">Aparência</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Modo de exibição e tema de cores</p>
            </div>
          </div>

          {/* Modo de exibição */}
          <div>
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 block">Modo de exibição</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {MODOS.map(({ id, label, desc, icon: Icon }) => {
                const active = modo_exibicao === id;
                return (
                  <button
                    key={id}
                    onClick={() => handleSave(undefined, id)}
                    className={cn(
                      'relative flex flex-col items-start gap-2 rounded-xl border-2 p-4 text-left transition-all',
                      active
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-950 dark:border-blue-500'
                        : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 hover:border-slate-300'
                    )}
                  >
                    {active && (
                      <span className="absolute top-2 right-2 h-5 w-5 rounded-full bg-blue-600 flex items-center justify-center">
                        <Check className="h-3 w-3 text-white" />
                      </span>
                    )}
                    <Icon className={cn('h-5 w-5', active ? 'text-blue-600' : 'text-slate-400')} />
                    <div>
                      <p className={cn('text-sm font-semibold', active ? 'text-blue-700 dark:text-blue-300' : 'text-slate-700 dark:text-slate-200')}>{label}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-400 mt-0.5">{desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tema de cor */}
          <div>
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 block">Tema de cores</label>
            <div className="grid grid-cols-2 gap-3">
              {CORES.map(({ id, label, primary, secondary, desc }) => {
                const active = (tema_cor || 'azul') === id;
                return (
                  <button
                    key={id}
                    onClick={() => handleSave(id, undefined)}
                    className={cn(
                      'relative flex items-center gap-3 rounded-xl border-2 p-3 text-left transition-all',
                      active
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-950 dark:border-blue-500'
                        : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 hover:border-slate-300'
                    )}
                  >
                    {active && (
                      <span className="absolute top-2 right-2 h-4 w-4 rounded-full bg-blue-600 flex items-center justify-center">
                        <Check className="h-2.5 w-2.5 text-white" />
                      </span>
                    )}
                    <div className="h-8 w-8 rounded-lg flex-shrink-0 border border-white/20 shadow-sm" style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }} />
                    <div>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</p>
                      <p className="text-xs text-slate-400">{desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">Preview</h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-blue-600 rounded-xl p-3 text-white text-center">
              <p className="text-lg font-bold">42</p>
              <p className="text-xs opacity-80">Tarefas</p>
            </div>
            <div className="bg-emerald-500 rounded-xl p-3 text-white text-center">
              <p className="text-lg font-bold">18</p>
              <p className="text-xs opacity-80">Concluídas</p>
            </div>
            <div className="bg-orange-500 rounded-xl p-3 text-white text-center">
              <p className="text-lg font-bold">5</p>
              <p className="text-xs opacity-80">Pendentes</p>
            </div>
          </div>
          <div className="mt-3 bg-slate-50 dark:bg-slate-700 rounded-xl p-3">
            <p className="text-sm text-slate-700 dark:text-slate-200 font-medium">Card de exemplo</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Visualize como ficará o sistema com o modo {modo_exibicao}.</p>
          </div>
        </div>
      </div>
    </div>
  );
}