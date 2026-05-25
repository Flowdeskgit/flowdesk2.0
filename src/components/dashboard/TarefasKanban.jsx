import React, { useMemo } from 'react';
import { differenceInDays, parseISO, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AlertTriangle, Clock, CheckCircle2, User, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

const COLS = [
  { id: 'Urgente',     label: 'Urgente',      color: 'bg-muted/60 border-brand-steel',    dot: 'bg-brand-steel' },
  { id: 'Pendente',    label: 'Pendente',     color: 'bg-muted/40 border-border',         dot: 'bg-muted-foreground' },
  { id: 'Em andamento',label: 'Em Andamento', color: 'bg-brand-electric/5 border-brand-electric/30', dot: 'bg-brand-electric' },
  { id: 'Atrasada',   label: 'Atrasadas',    color: 'bg-destructive/5 border-destructive/30', dot: 'bg-destructive' },
  { id: 'Concluída',  label: 'Concluídas',   color: 'bg-emerald-50/50 border-emerald-200', dot: 'bg-emerald-500' },
];

const PRIORIDADE_COLORS = {
  Alta:    'bg-destructive/10 text-destructive',
  Urgente: 'bg-brand-steel/15 text-brand-steel',
  Média:   'bg-amber-100 text-amber-700',
  Baixa:   'bg-muted text-muted-foreground',
};

function getStatusEffetivo(t) {
  if (t.status === 'Concluída' || t.status_detalhado === 'Concluída' || t.status === 'Não realizada / Impedimento') return 'Concluída';
  const sd = t.status_detalhado || t.status || 'Pendente';
  if (sd === 'Urgente') return 'Urgente';
  if (t.data_vencimento) {
    const diff = differenceInDays(parseISO(t.data_vencimento), new Date());
    if (diff < 0) return 'Atrasada';
  }
  return sd;
}

function TarefaCard({ tarefa, pessoas }) {
  const responsavel = pessoas.find(p => p.id === tarefa.responsavel_id);
  const diff = tarefa.data_vencimento ? differenceInDays(parseISO(tarefa.data_vencimento), new Date()) : null;
  const status = getStatusEffetivo(tarefa);
  const isAtrasada = status === 'Atrasada';
  const isUrgente = status === 'Urgente';
  const venceHoje = diff === 0;

  return (
    <div className={`bg-card rounded-xl border p-3 hover:shadow-sm transition-all ${isAtrasada ? 'border-destructive/30 bg-destructive/5' : isUrgente ? 'border-brand-steel/40 bg-brand-steel/5' : 'border-border'}`}>
      <p className="text-sm font-semibold text-foreground line-clamp-2 mb-2">{tarefa.titulo}</p>
      <div className="flex flex-wrap gap-1 mb-2">
        {tarefa.prioridade && tarefa.prioridade !== 'Média' && (
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${PRIORIDADE_COLORS[tarefa.prioridade] || ''}`}>
            {tarefa.prioridade}
          </span>
        )}
        {isUrgente && (
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-brand-steel/15 text-brand-steel flex items-center gap-1">
            <Zap className="h-2.5 w-2.5" />Urgente
          </span>
        )}
        {isAtrasada && (
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 flex items-center gap-1">
            <AlertTriangle className="h-2.5 w-2.5" />Atrasada
          </span>
        )}
        {venceHoje && !isAtrasada && (
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">Vence hoje</span>
        )}
      </div>
      <div className="flex items-center justify-between">
        {responsavel ? (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <User className="h-3 w-3" />
            <span className="truncate max-w-[80px]">{responsavel.nome.split(' ')[0]}</span>
          </div>
        ) : <span />}
        {tarefa.data_vencimento && (
          <span className={`text-[10px] flex items-center gap-1 ${isAtrasada ? 'text-red-500 font-semibold' : 'text-muted-foreground'}`}>
            <Clock className="h-2.5 w-2.5" />
            {format(parseISO(tarefa.data_vencimento), 'dd/MM', { locale: ptBR })}
          </span>
        )}
      </div>
    </div>
  );
}

export default function TarefasKanban({ tarefas, pessoas = [] }) {
  const grouped = useMemo(() => {
    const map = {};
    COLS.forEach(c => { map[c.id] = []; });
    tarefas.forEach(t => {
      const s = getStatusEffetivo(t);
      if (map[s]) map[s].push(t);
      else if (map['Pendente']) map['Pendente'].push(t);
    });
    return map;
  }, [tarefas]);

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-foreground text-sm">Kanban de Tarefas</h3>
          <p className="text-xs text-muted-foreground">{tarefas.length} tarefas no total</p>
        </div>
        <Link to="/Tarefas" className="text-xs text-brand-electric hover:underline font-medium">Ver todas →</Link>
      </div>

      <div className="p-4 grid grid-cols-2 lg:grid-cols-5 gap-3">
        {COLS.map(col => {
          const cards = grouped[col.id] || [];
          return (
            <div key={col.id} className={`rounded-xl border-2 ${col.color} flex flex-col`}>
              <div className="px-3 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${col.dot}`} />
                  <span className="text-xs font-semibold text-foreground">{col.label}</span>
                </div>
                <span className="text-xs font-bold text-muted-foreground bg-white/60 rounded-full px-2 py-0.5">{cards.length}</span>
              </div>
              <div className="p-2 space-y-2 max-h-[260px] overflow-y-auto">
                {cards.slice(0, 5).map(t => <TarefaCard key={t.id} tarefa={t} pessoas={pessoas} />)}
                {cards.length > 5 && (
                  <p className="text-xs text-center text-muted-foreground py-1">+{cards.length - 5} mais</p>
                )}
                {cards.length === 0 && (
                  <div className="flex items-center justify-center py-6 text-muted-foreground/40">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}