import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { flowdesk } from '@/api/flowdeskClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, BellOff, CheckCheck, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function NotificacoesCard() {
  const queryClient = useQueryClient();

  const { data: notificacoes = [], isLoading } = useQuery({
    queryKey: ['notificacoes-todas'],
    queryFn: () => flowdesk.entities.Notificacao.list('-created_date', 50),
  });

  const marcarLidaMutation = useMutation({
    mutationFn: (id) => flowdesk.entities.Notificacao.update(id, { lida: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificacoes-todas'] });
      queryClient.invalidateQueries({ queryKey: ['notificacoes-nao-lidas'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => flowdesk.entities.Notificacao.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificacoes-todas'] });
      queryClient.invalidateQueries({ queryKey: ['notificacoes-nao-lidas'] });
    },
  });

  const marcarTodasLidas = async () => {
    const naoLidas = notificacoes.filter(n => !n.lida);
    await Promise.all(naoLidas.map(n => flowdesk.entities.Notificacao.update(n.id, { lida: true })));
    queryClient.invalidateQueries({ queryKey: ['notificacoes-todas'] });
    queryClient.invalidateQueries({ queryKey: ['notificacoes-nao-lidas'] });
  };

  const naoLidas = notificacoes.filter(n => !n.lida);

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-lg text-slate-800 flex items-center gap-2">
          <Bell className="h-4 w-4 text-rose-500" />
          Notificações
          {naoLidas.length > 0 && (
            <Badge className="bg-red-500 text-white border-0 text-xs">{naoLidas.length} nova{naoLidas.length > 1 ? 's' : ''}</Badge>
          )}
        </CardTitle>
        {naoLidas.length > 0 && (
          <Button variant="ghost" size="sm" onClick={marcarTodasLidas} className="text-xs text-slate-500 hover:text-slate-700">
            <CheckCheck className="h-3.5 w-3.5 mr-1" />
            Marcar todas como lidas
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-slate-400 text-center py-4">Carregando...</p>
        ) : notificacoes.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-slate-400">
            <BellOff className="h-8 w-8 opacity-30" />
            <p className="text-sm">Nenhuma notificação.</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {notificacoes.map(n => (
              <div
                key={n.id}
                className={`flex items-start gap-3 rounded-xl p-3 transition-colors ${n.lida ? 'bg-slate-50' : 'bg-rose-50 border border-rose-100'}`}
              >
                <div className={`flex-shrink-0 mt-0.5 h-2 w-2 rounded-full ${n.lida ? 'bg-slate-300' : 'bg-rose-500'}`} />
                <div className="flex-1 min-w-0">
                  {n.titulo && <p className="text-sm font-medium text-slate-800">{n.titulo}</p>}
                  {n.mensagem && <p className="text-xs text-slate-500 mt-0.5">{n.mensagem}</p>}
                  {n.created_date && (
                    <p className="text-[10px] text-slate-400 mt-1">
                      {format(new Date(n.created_date), "dd/MM/yy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  )}
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  {!n.lida && (
                    <Button size="icon" variant="ghost" className="h-6 w-6" title="Marcar como lida" onClick={() => marcarLidaMutation.mutate(n.id)}>
                      <CheckCheck className="h-3 w-3 text-emerald-500" />
                    </Button>
                  )}
                  <Button size="icon" variant="ghost" className="h-6 w-6" title="Excluir" onClick={() => deleteMutation.mutate(n.id)}>
                    <Trash2 className="h-3 w-3 text-red-400" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}