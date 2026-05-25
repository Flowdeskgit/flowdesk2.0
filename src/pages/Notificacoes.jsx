import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { flowdesk } from '@/api/flowdeskClient';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Bell, CheckCircle, Trash2, AlertTriangle, Clock, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

const tipoIcons = {
  'tarefa_criada': Bell,
  'tarefa_atrasada': AlertTriangle,
  'prazo_vencendo': Clock,
  'alerta': AlertTriangle,
  'info': Info,
};

const tipoColors = {
  'tarefa_criada': 'bg-blue-100 text-blue-700',
  'tarefa_atrasada': 'bg-red-100 text-red-700',
  'prazo_vencendo': 'bg-amber-100 text-amber-700',
  'alerta': 'bg-orange-100 text-orange-700',
  'info': 'bg-slate-100 text-slate-700',
};

export default function Notificacoes() {
  const queryClient = useQueryClient();

  const { data: notificacoes = [], isLoading } = useQuery({
    queryKey: ['notificacoes'],
    queryFn: () => flowdesk.entities.Notificacao.list('-created_date', 100),
  });

  const marcarComoLida = useMutation({
    mutationFn: ({ id, data }) => flowdesk.entities.Notificacao.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificacoes'] });
      queryClient.invalidateQueries({ queryKey: ['notificacoes-nao-lidas'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => flowdesk.entities.Notificacao.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificacoes'] });
      queryClient.invalidateQueries({ queryKey: ['notificacoes-nao-lidas'] });
    },
  });

  const marcarTodasComoLidas = async () => {
    const naoLidas = notificacoes.filter(n => !n.lida);
    for (const notificacao of naoLidas) {
      await marcarComoLida.mutateAsync({
        id: notificacao.id,
        data: { ...notificacao, lida: true, data_leitura: new Date().toISOString() }
      });
    }
  };

  const handleMarcarLida = (notificacao) => {
    if (!notificacao.lida) {
      marcarComoLida.mutate({
        id: notificacao.id,
        data: { ...notificacao, lida: true, data_leitura: new Date().toISOString() }
      });
    }
  };

  const naoLidas = notificacoes.filter(n => !n.lida).length;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-4xl space-y-6">
          <Skeleton className="h-10 w-48" />
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 md:text-3xl">Notificações</h1>
            <p className="text-slate-600">
              {naoLidas > 0 ? `${naoLidas} não lida${naoLidas > 1 ? 's' : ''}` : 'Nenhuma notificação não lida'}
            </p>
          </div>
          {naoLidas > 0 && (
            <Button 
              onClick={marcarTodasComoLidas}
              className="bg-gradient-to-r from-stone-700 to-stone-800 hover:from-stone-800 hover:to-stone-900"
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Marcar todas como lidas
            </Button>
          )}
        </div>

        {/* Lista de Notificações */}
        <div className="space-y-3">
          <AnimatePresence>
            {notificacoes.map((notificacao, index) => {
              const Icon = tipoIcons[notificacao.tipo] || Bell;
              
              return (
                <motion.div
                  key={notificacao.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => handleMarcarLida(notificacao)}
                  className={`rounded-2xl border bg-white p-4 md:p-6 hover:shadow-md transition-all cursor-pointer ${
                    !notificacao.lida 
                      ? 'border-amber-200 bg-amber-50/50' 
                      : 'border-slate-200 opacity-60'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`rounded-xl p-3 ${tipoColors[notificacao.tipo]}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-semibold text-slate-800">{notificacao.titulo}</h3>
                        {!notificacao.lida && (
                          <Badge className="bg-red-500 text-white shrink-0">Nova</Badge>
                        )}
                      </div>
                      
                      <p className="text-slate-600 mb-3">{notificacao.mensagem}</p>
                      
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span>
                          {format(new Date(notificacao.created_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </span>
                        {notificacao.lida && notificacao.data_leitura && (
                          <span className="flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Lida em {format(new Date(notificacao.data_leitura), "dd/MM 'às' HH:mm", { locale: ptBR })}
                          </span>
                        )}
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteMutation.mutate(notificacao.id);
                      }}
                      className="text-slate-400 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          
          {notificacoes.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
              <Bell className="h-12 w-12 mb-4" />
              <p className="text-lg">Nenhuma notificação</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}