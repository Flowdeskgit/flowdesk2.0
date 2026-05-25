import React from 'react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { format, parseISO, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, AlertTriangle, CheckCircle2, Circle, Play } from 'lucide-react';

const statusConfig = {
  'Pendente': { color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Circle },
  'Em andamento': { color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Play },
  'Atrasada': { color: 'bg-red-100 text-red-700 border-red-200', icon: AlertTriangle },
  'Concluída': { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
};

const prioridadeConfig = {
  'Baixa': 'bg-slate-100 text-slate-600',
  'Média': 'bg-amber-100 text-amber-700',
  'Alta': 'bg-red-100 text-red-700',
};

export default function RecentTasksTable({ tarefas, pessoas }) {
  const getPessoaNome = (id) => {
    const pessoa = pessoas.find(p => p.id === id);
    return pessoa?.nome || '-';
  };

  const getDiasRestantes = (dataVencimento) => {
    if (!dataVencimento) return null;
    const dias = differenceInDays(parseISO(dataVencimento), new Date());
    return dias;
  };

  const sortedTarefas = [...tarefas]
    .filter(t => t.status !== 'Concluída')
    .sort((a, b) => {
      if (a.status === 'Atrasada' && b.status !== 'Atrasada') return -1;
      if (b.status === 'Atrasada' && a.status !== 'Atrasada') return 1;
      if (a.prioridade === 'Alta' && b.prioridade !== 'Alta') return -1;
      if (b.prioridade === 'Alta' && a.prioridade !== 'Alta') return 1;
      return 0;
    })
    .slice(0, 8);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-card"
    >
      <div className="border-b border-border px-6 py-4">
        <h3 className="text-lg font-semibold text-foreground">Tarefas em Aberto</h3>
        <p className="text-sm text-muted-foreground">Ordenadas por urgência e prioridade</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <th className="px-6 py-3">Tarefa</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Prioridade</th>
              <th className="px-6 py-3">Responsável</th>
              <th className="px-6 py-3">Prazo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sortedTarefas.length > 0 ? (
              sortedTarefas.map((tarefa, index) => {
                const StatusIcon = statusConfig[tarefa.status]?.icon || Circle;
                const diasRestantes = getDiasRestantes(tarefa.data_vencimento);
                
                return (
                  <motion.tr
                    key={tarefa.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-muted/40 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <p className="font-medium text-foreground">{tarefa.titulo}</p>
                      {tarefa.descricao && (
                        <p className="text-sm text-muted-foreground truncate max-w-xs">{tarefa.descricao}</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <Badge className={`${statusConfig[tarefa.status]?.color} border gap-1`}>
                        <StatusIcon className="h-3 w-3" />
                        {tarefa.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Badge className={prioridadeConfig[tarefa.prioridade]}>
                        {tarefa.prioridade}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {getPessoaNome(tarefa.responsavel_id)}
                    </td>
                    <td className="px-6 py-4">
                      {tarefa.data_vencimento ? (
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-slate-400" />
                          <span className={`text-sm ${diasRestantes < 0 ? 'text-red-400 font-medium' : diasRestantes <= 3 ? 'text-amber-400' : 'text-muted-foreground'}`}>
                            {format(parseISO(tarefa.data_vencimento), 'dd/MM/yyyy', { locale: ptBR })}
                          </span>
                          {diasRestantes !== null && diasRestantes < 0 && (
                            <span className="text-xs text-red-500">({Math.abs(diasRestantes)}d atrasada)</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </td>
                  </motion.tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                  Nenhuma tarefa em aberto
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}