import React from 'react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { format, parseISO, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Bell, AlertTriangle, Clock, CheckCircle, Info } from 'lucide-react';

const tipoIcons = {
  'Pendência': AlertTriangle,
  'Prazo': Clock,
  'Atualização': Info,
  'Outro': Bell,
};

const tipoColors = {
  'Pendência':   'text-amber-600 bg-amber-50',
  'Prazo':       'text-destructive bg-destructive/10',
  'Atualização': 'text-brand-electric bg-brand-electric/10',
  'Outro':       'text-muted-foreground bg-muted',
};

export default function AlertsList({ alertas }) {
  const alertasAtivos = alertas
    .filter(a => a.status === 'Ativo')
    .sort((a, b) => {
      if (a.tipo === 'Prazo' && b.tipo !== 'Prazo') return -1;
      if (b.tipo === 'Prazo' && a.tipo !== 'Prazo') return 1;
      return new Date(a.data_vencimento) - new Date(b.data_vencimento);
    })
    .slice(0, 5);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-card"
    >
      <div className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Alertas Ativos</h3>
          <p className="text-sm text-muted-foreground">Notificações e lembretes</p>
        </div>
        {alertasAtivos.length > 0 && (
          <Badge className="bg-destructive/10 text-destructive border-0">
            {alertasAtivos.length}
          </Badge>
        )}
      </div>
      <div className="divide-y divide-border">
        {alertasAtivos.length > 0 ? (
          alertasAtivos.map((alerta, index) => {
            const Icon = tipoIcons[alerta.tipo] || Bell;
            const diasRestantes = alerta.data_vencimento 
              ? differenceInDays(parseISO(alerta.data_vencimento), new Date())
              : null;
            
            return (
              <motion.div
                key={alerta.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-4 hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className={`rounded-lg p-2 ${tipoColors[alerta.tipo]}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground">{alerta.titulo}</p>
                    {alerta.descricao && (
                      <p className="text-sm text-muted-foreground truncate mt-0.5">{alerta.descricao}</p>
                    )}
                    {alerta.data_vencimento && (
                      <div className="flex items-center gap-2 mt-2">
                        <Clock className="h-3 w-3 text-slate-400" />
                        <span className={`text-xs ${diasRestantes < 0 ? 'text-red-400 font-medium' : diasRestantes <= 3 ? 'text-amber-400' : 'text-muted-foreground'}`}>
                          {format(parseISO(alerta.data_vencimento), 'dd/MM/yyyy', { locale: ptBR })}
                          {diasRestantes !== null && (
                            <span className="ml-1">
                              ({diasRestantes < 0 ? `${Math.abs(diasRestantes)}d atrasado` : `${diasRestantes}d restantes`})
                            </span>
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                  <Badge className={`${tipoColors[alerta.tipo]} border-0 text-xs`}>
                    {alerta.tipo}
                  </Badge>
                </div>
              </motion.div>
            );
          })
        ) : (
          <div className="p-12 text-center text-muted-foreground flex flex-col items-center gap-2">
            <CheckCircle className="h-8 w-8 text-emerald-400" />
            <p>Nenhum alerta ativo</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}