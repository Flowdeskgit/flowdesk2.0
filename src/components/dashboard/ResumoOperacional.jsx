import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { differenceInDays, parseISO, isToday, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  CheckSquare, Zap, AlertTriangle, Calendar, Users, FileText,
  ArrowRight, ChevronRight,
} from 'lucide-react';

function buildEventDateTime(ev) {
  if (!ev?.data_evento) return null;
  try {
    const d = parseISO(ev.data_evento);
    const [hh, mm] = String(ev?.hora_inicio || '00:00').split(':').map(x => parseInt(x, 10));
    d.setHours(Number.isFinite(hh) ? hh : 0, Number.isFinite(mm) ? mm : 0, 0, 0);
    return d;
  } catch { return null; }
}

function OpsItem({ icon: Icon, label, value, color, to, highlight }) {
  const colors = {
    rose:    { bg: 'bg-brand-electric/5',  border: 'border-brand-electric/20', icon: 'bg-brand-electric', text: 'text-brand-electric', num: 'text-brand-electric' },
    purple:  { bg: 'bg-brand-steel/5',     border: 'border-brand-steel/20',    icon: 'bg-brand-steel',    text: 'text-brand-steel',    num: 'text-brand-steel' },
    red:     { bg: 'bg-destructive/5',     border: 'border-destructive/20',    icon: 'bg-destructive',    text: 'text-destructive',    num: 'text-destructive' },
    amber:   { bg: 'bg-amber-50',          border: 'border-amber-200',         icon: 'bg-amber-500',      text: 'text-amber-700',      num: 'text-amber-700' },
    blue:    { bg: 'bg-brand-electric/5',  border: 'border-brand-electric/20', icon: 'bg-brand-electric', text: 'text-brand-electric', num: 'text-brand-electric' },
    emerald: { bg: 'bg-emerald-50',        border: 'border-emerald-200',       icon: 'bg-emerald-500',    text: 'text-emerald-700',    num: 'text-emerald-700' },
    slate:   { bg: 'bg-muted/40',          border: 'border-border',            icon: 'bg-muted-foreground',text: 'text-muted-foreground',num: 'text-foreground' },
  };
  const c = colors[color] || colors.slate;

  const inner = (
    <div className={`group relative flex items-center gap-3 rounded-xl border ${c.border} ${c.bg} px-4 py-3 transition-all duration-200 hover:shadow-sm ${to ? 'cursor-pointer hover:scale-[1.01]' : ''} ${highlight ? 'ring-1 ring-offset-1 ring-brand-electric/50' : ''}`}>
      <div className={`h-8 w-8 rounded-lg ${c.icon} flex items-center justify-center flex-shrink-0`}>
        <Icon className="h-4 w-4 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-medium ${c.text} leading-none mb-1`}>{label}</p>
        <p className={`text-2xl font-bold ${c.num} leading-none`}>{value}</p>
      </div>
      {to && <ChevronRight className={`h-4 w-4 ${c.text} opacity-40 group-hover:opacity-80 transition-opacity flex-shrink-0`} />}
    </div>
  );

  if (to) return <Link to={to}>{inner}</Link>;
  return inner;
}

function ProximoEvento({ ev, tipo }) {
  const dt = buildEventDateTime(ev);
  if (!dt) return null;
  const isAud = tipo === 'Audiência';
  const dtStr = format(dt, 'dd/MM', { locale: ptBR });
  const hora = String(ev?.hora_inicio || '');
  const titulo = String(ev?.titulo || '').replace(/^(audiência|perícia)\s*—\s*/i, '').trim();
  const daysUntil = Math.ceil((dt - new Date()) / (1000 * 60 * 60 * 24));

  return (
    <div className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${isAud ? 'bg-brand-electric/5 border-brand-electric/20' : 'bg-brand-steel/5 border-brand-steel/20'}`}>
      <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex flex-col items-center justify-center text-center ${isAud ? 'bg-brand-electric/10' : 'bg-brand-steel/10'}`}>
        <span className={`text-sm font-bold leading-none ${isAud ? 'text-brand-electric' : 'text-brand-steel'}`}>{dtStr}</span>
        <span className={`text-[9px] mt-0.5 ${isAud ? 'text-brand-sky' : 'text-brand-sky'}`}>{hora}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full ${isAud ? 'bg-brand-electric/15 text-brand-electric' : 'bg-brand-steel/15 text-brand-steel'}`}>
            {tipo}
          </span>
          {daysUntil <= 3 && daysUntil >= 0 && (
            <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 dark:bg-amber-900/30 px-1.5 py-0.5 rounded-full">
              {daysUntil === 0 ? 'Hoje!' : daysUntil === 1 ? 'Amanhã' : `${daysUntil}d`}
            </span>
          )}
        </div>
        <p className="text-xs font-semibold text-foreground truncate mt-0.5">{titulo || ev?.titulo}</p>
      </div>
    </div>
  );
}

export default function ResumoOperacional({ tarefas = [], retornos = [], agendaEventos = [] }) {
  const hoje = new Date();

  const tarefasHoje = useMemo(() =>
    tarefas.filter(t => {
      const sd = t.status_detalhado || t.status || '';
      if (sd === 'Concluída') return false;
      return t.data_vencimento && isToday(parseISO(t.data_vencimento));
    }), [tarefas]);

  const tarefasUrgentes = useMemo(() =>
    tarefas.filter(t => (t.status_detalhado || '') === 'Urgente'), [tarefas]);

  const tarefasAtrasadas = useMemo(() =>
    tarefas.filter(t => {
      if ((t.status_detalhado || t.status || '') === 'Concluída') return false;
      if (!t.data_vencimento) return false;
      return differenceInDays(parseISO(t.data_vencimento), hoje) < 0;
    }), [tarefas]);

  const retornosPendentes = useMemo(() =>
    retornos.filter(r => r.status === 'Pendente'), [retornos]);

  // Próximas audiências e perícias
  const { audiencias, pericias } = useMemo(() => {
    const now = new Date();
    const items = (Array.isArray(agendaEventos) ? agendaEventos : [])
      .map(ev => {
        const dt = buildEventDateTime(ev);
        const obs = String(ev?.observacoes || '');
        const tipo = String(ev?.tipo_evento || '').toLowerCase();
        let kind = '';
        if (obs.includes('[AGENDAMENTO_PUBLICACAO:AUDIENCIA]') || tipo.includes('audiência') || tipo.includes('audiencia') || String(ev?.titulo || '').toLowerCase().includes('audiência')) kind = 'Audiência';
        else if (obs.includes('[AGENDAMENTO_PUBLICACAO:PERICIA]') || tipo.includes('perícia') || tipo.includes('pericia') || String(ev?.titulo || '').toLowerCase().includes('perícia')) kind = 'Perícia';
        return { ev, dt, kind };
      })
      .filter(({ dt, kind, ev }) => dt && dt > now && kind && String(ev?.status || '').toLowerCase() === 'agendado')
      .sort((a, b) => a.dt - b.dt);

    return {
      audiencias: items.filter(i => i.kind === 'Audiência').slice(0, 2),
      pericias: items.filter(i => i.kind === 'Perícia').slice(0, 2),
    };
  }, [agendaEventos]);

  const temEventos = audiencias.length > 0 || pericias.length > 0;

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-brand-electric" />
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Resumo Operacional do Dia</h2>
        </div>
        <Link to={createPageUrl('Tarefas')} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
          Ver todas as tarefas <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Coluna 1: Métricas de tarefas */}
        <div className="space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 px-1">Tarefas</p>
          <OpsItem icon={CheckSquare} label="Para hoje" value={tarefasHoje.length} color="rose" to={createPageUrl('Tarefas')} />
          <OpsItem icon={Zap} label="Urgentes" value={tarefasUrgentes.length} color="purple" to={createPageUrl('Tarefas')} highlight={tarefasUrgentes.length > 0} />
          <OpsItem icon={AlertTriangle} label="Atrasadas" value={tarefasAtrasadas.length} color="red" to={createPageUrl('Tarefas')} />
        </div>

        {/* Coluna 2: Próximas audiências e perícias */}
        <div className="space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 px-1">Agenda Judicial</p>
          {!temEventos ? (
            <div className="rounded-xl border border-border bg-muted/30 flex flex-col items-center justify-center py-6 gap-2">
              <Calendar className="h-6 w-6 text-muted-foreground/30" />
              <p className="text-xs text-muted-foreground">Sem audiências ou perícias futuras</p>
            </div>
          ) : (
            <div className="space-y-2">
              {audiencias.map(({ ev }, i) => <ProximoEvento key={i} ev={ev} tipo="Audiência" />)}
              {pericias.map(({ ev }, i) => <ProximoEvento key={i} ev={ev} tipo="Perícia" />)}
            </div>
          )}
        </div>

        {/* Coluna 3: Outras pendências */}
        <div className="space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 px-1">Pendências</p>
          <OpsItem icon={Users} label="Retornos pendentes" value={retornosPendentes.length} color="amber" to={createPageUrl('RetornoCliente')} />
          <OpsItem icon={FileText} label="Total de tarefas abertas" value={tarefas.filter(t => (t.status_detalhado || t.status || '') !== 'Concluída').length} color="blue" to={createPageUrl('Tarefas')} />
        </div>

      </div>
    </section>
  );
}