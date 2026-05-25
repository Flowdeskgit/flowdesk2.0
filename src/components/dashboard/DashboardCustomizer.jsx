import React, { useState } from 'react';
import { Settings2, GripVertical, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export const DEFAULT_WIDGETS = [
  { id: 'indicadores', label: 'Indicadores de Tarefas', enabled: true },
  { id: 'grafico', label: 'Gráfico de Tarefas', enabled: true },
  { id: 'audiencias', label: 'Audiências & Perícias', enabled: true },
  { id: 'kanban', label: 'Kanban de Tarefas', enabled: true },
  { id: 'feed', label: 'Feed de Atividades', enabled: true },
  { id: 'atendimentos', label: 'Atendimentos Recentes', enabled: true },
  { id: 'tarefas_alertas', label: 'Tarefas & Alertas', enabled: true },
  { id: 'performance', label: 'Performance', enabled: true },
];

const STORAGE_KEY = 'dashboard_widgets_v1';

export function useWidgetConfig() {
  const [widgets, setWidgets] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // merge with defaults in case new widgets were added
        return DEFAULT_WIDGETS.map(def => {
          const found = parsed.find(p => p.id === def.id);
          return found ? { ...def, enabled: found.enabled } : def;
        });
      }
    } catch {}
    return DEFAULT_WIDGETS;
  });

  const isEnabled = (id) => widgets.find(w => w.id === id)?.enabled !== false;

  const save = (updated) => {
    setWidgets(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  return { widgets, isEnabled, save };
}

export default function DashboardCustomizer({ widgets, onSave }) {
  const [open, setOpen] = useState(false);
  const [local, setLocal] = useState(widgets);

  const toggle = (id) => {
    setLocal(prev => prev.map(w => w.id === id ? { ...w, enabled: !w.enabled } : w));
  };

  const handleSave = () => {
    onSave(local);
    setOpen(false);
  };

  const handleOpen = () => {
    setLocal(widgets);
    setOpen(true);
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={handleOpen} className="gap-2">
        <Settings2 className="h-4 w-4" />
        Personalizar
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Personalizar Dashboard</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-4">Escolha quais widgets exibir no dashboard.</p>
          <div className="space-y-2">
            {local.map(widget => (
              <div
                key={widget.id}
                className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-colors cursor-pointer ${widget.enabled ? 'bg-rose-50 border-rose-200' : 'bg-muted/30 border-border'}`}
                onClick={() => toggle(widget.id)}
              >
                <div className="flex items-center gap-3">
                  <GripVertical className="h-4 w-4 text-muted-foreground/40" />
                  <span className="text-sm font-medium text-foreground">{widget.label}</span>
                </div>
                {widget.enabled
                  ? <Eye className="h-4 w-4 text-rose-600" />
                  : <EyeOff className="h-4 w-4 text-muted-foreground" />
                }
              </div>
            ))}
          </div>
          <div className="flex gap-2 justify-end pt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} className="bg-rose-600 hover:bg-rose-700 text-white">Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}