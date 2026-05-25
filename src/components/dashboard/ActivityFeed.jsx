import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Bell, CheckCircle2, AlertTriangle, Clock, FileText, Activity } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const EVENT_TYPES = {
  tarefa_criada: { icon: FileText, color: 'text-blue-500', bg: 'bg-blue-50', label: 'Tarefa criada' },
  tarefa_atrasada: { icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-50', label: 'Tarefa atrasada' },
  prazo_vencendo: { icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50', label: 'Prazo vencendo' },
  alerta: { icon: Bell, color: 'text-orange-500', bg: 'bg-orange-50', label: 'Alerta' },
  info: { icon: Activity, color: 'text-slate-500', bg: 'bg-slate-50', label: 'Info' },
  concluida: { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-50', label: 'Concluída' },
};

function getTimestamp(item) {
  return item.created_date || item.updated_date || new Date().toISOString();
}

export default function ActivityFeed({ notificacoes = [], tarefas = [], alertas = [] }) {
  // Montar feed combinado
  const feedItems = [
    ...notificacoes.slice(0, 20).map(n => ({
      id: `notif-${n.id}`,
      type: n.tipo || 'info',
      title: n.titulo,
      message: n.mensagem,
      timestamp: getTimestamp(n),
      unread: !n.lida,
    })),
    ...alertas.filter(a => a.status === 'Ativo').slice(0, 10).map(a => ({
      id: `alerta-${a.id}`,
      type: 'alerta',
      title: a.titulo,
      message: a.descricao,
      timestamp: getTimestamp(a),
      unread: true,
    })),
  ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 15);

  const unreadCount = feedItems.filter(f => f.unread).length;

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-brand-electric flex items-center justify-center shadow-sm shadow-brand-electric/20">
            <Activity className="h-4 w-4 text-white" />
          </div>
          <div>
            <div className="font-semibold text-foreground text-sm">Feed de Atividades</div>
            <div className="text-xs text-muted-foreground">Eventos recentes do sistema</div>
          </div>
        </div>
        {unreadCount > 0 && (
          <Badge className="bg-brand-electric/10 text-brand-electric border-0 text-xs">{unreadCount} novo{unreadCount > 1 ? 's' : ''}</Badge>
        )}
      </div>

      <div className="divide-y divide-border max-h-[400px] overflow-y-auto">
        {feedItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <Activity className="h-8 w-8 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Nenhuma atividade recente</p>
          </div>
        ) : (
          feedItems.map(item => {
            const config = EVENT_TYPES[item.type] || EVENT_TYPES.info;
            const Icon = config.icon;
            let timeAgo = '';
            try {
              timeAgo = formatDistanceToNow(new Date(item.timestamp), { addSuffix: true, locale: ptBR });
            } catch {}

            return (
              <div key={item.id} className={`flex items-start gap-3 px-5 py-3 hover:bg-muted/30 transition-colors ${item.unread ? 'bg-brand-electric/5' : ''}`}>
                <div className={`flex-shrink-0 mt-0.5 h-8 w-8 rounded-full ${config.bg} flex items-center justify-center`}>
                  <Icon className={`h-3.5 w-3.5 ${config.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                  {item.message && <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{item.message}</p>}
                  <p className="text-[10px] text-muted-foreground/60 mt-1">{timeAgo}</p>
                </div>
                {item.unread && <div className="flex-shrink-0 mt-2 h-2 w-2 rounded-full bg-brand-electric" />}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}