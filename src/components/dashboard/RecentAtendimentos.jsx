import React from 'react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, DollarSign, User } from 'lucide-react';

const statusColors = {
  'Aberto': 'bg-blue-100 text-blue-700 border-blue-200',
  'Em andamento': 'bg-purple-100 text-purple-700 border-purple-200',
  'Aguardando resposta': 'bg-amber-100 text-amber-700 border-amber-200',
  'Concluído': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'Arquivado': 'bg-slate-100 text-slate-700 border-slate-200',
};

export default function RecentAtendimentos({ atendimentos, pessoas }) {
  const getPessoaNome = (id) => {
    const pessoa = pessoas.find(p => p.id === id);
    return pessoa?.nome || '-';
  };

  const recentAtendimentos = [...atendimentos]
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
    .slice(0, 5);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-card"
    >
      <div className="border-b border-border px-6 py-4">
        <h3 className="text-lg font-semibold text-foreground">Novos Atendimentos</h3>
        <p className="text-sm text-muted-foreground">Últimos casos abertos</p>
      </div>
      <div className="divide-y divide-border">
        {recentAtendimentos.length > 0 ? (
          recentAtendimentos.map((atendimento, index) => (
            <motion.div
              key={atendimento.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="p-4 hover:bg-muted/40 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs text-muted-foreground">{atendimento.numero_caso}</span>
                    <Badge className={`${statusColors[atendimento.status]} border text-xs`}>
                      {atendimento.status}
                    </Badge>
                  </div>
                  <p className="font-medium text-foreground truncate">{atendimento.cliente}</p>
                  {atendimento.descricao && (
                    <p className="text-sm text-muted-foreground truncate mt-1">{atendimento.descricao}</p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    {atendimento.data_abertura && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(parseISO(atendimento.data_abertura), 'dd/MM/yyyy', { locale: ptBR })}
                      </span>
                    )}
                    {atendimento.valor_causa && (
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(atendimento.valor_causa)}
                      </span>
                    )}
                    {atendimento.responsavel_principal && (
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {getPessoaNome(atendimento.responsavel_principal)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="p-12 text-center text-muted-foreground">
            Nenhum atendimento cadastrado
          </div>
        )}
      </div>
    </motion.div>
  );
}