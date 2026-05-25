import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { flowdesk } from '@/api/flowdeskClient';
import { useCurrentUser, userLabel } from '@/hooks/useCurrentUser';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, GitBranch } from 'lucide-react';

const SETORES = ['Administrativo', 'Jurídico', 'Comercial', 'Financeiro', 'Outro'];

export default function EncaminharTarefaModal({ open, onClose, tarefaOrigem, pessoas = [] }) {
  const currentUser = useCurrentUser();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    titulo: tarefaOrigem ? `[Continuação] ${tarefaOrigem.titulo}` : '',
    descricao: tarefaOrigem?.descricao || '',
    responsavel_id: '',
    data_vencimento: '',
    prioridade: tarefaOrigem?.prioridade || 'Média',
    setor_destino: '',
    observacoes: tarefaOrigem?.observacoes || '',
    observacoes_encaminhamento: '',
    fechar_original: false,
  });

  // Resetar form quando a tarefa de origem muda
  React.useEffect(() => {
    if (tarefaOrigem) {
      setFormData({
        titulo: `[Continuação] ${tarefaOrigem.titulo}`,
        descricao: tarefaOrigem.descricao || '',
        responsavel_id: '',
        data_vencimento: '',
        prioridade: tarefaOrigem.prioridade || 'Média',
        setor_destino: '',
        observacoes: '',
        observacoes_encaminhamento: '',
        fechar_original: false,
      });
    }
  }, [tarefaOrigem?.id]);

  const createMutation = useMutation({
    mutationFn: async ({ novaTarefa, fecharOriginal }) => {
      const label = userLabel(currentUser);
      const ts = new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

      // Criar nova tarefa encaminhada
      const nova = await flowdesk.entities.Tarefa.create({
        ...novaTarefa,
        origem: 'Encaminhamento',
        tarefa_origem_id: tarefaOrigem.id,
        tarefa_origem_titulo: tarefaOrigem.titulo,
        cliente_id: tarefaOrigem.cliente_id || '',
        cliente_nome: tarefaOrigem.cliente_nome || '',
        atendimento_id: tarefaOrigem.atendimento_id || '',
        status: 'Pendente',
        criado_por_email: currentUser?.email || '',
        editado_por_email: currentUser?.email || '',
        historico_autoria: [
          `[${ts}] Criado por ${label}`,
          `[${ts}] Encaminhado a partir da tarefa: "${tarefaOrigem.titulo}"`,
        ],
      });

      // Registrar encaminhamento na tarefa original
      const prevEncaminhadas = Array.isArray(tarefaOrigem.tarefas_encaminhadas)
        ? tarefaOrigem.tarefas_encaminhadas
        : [];
      const prevHistorico = Array.isArray(tarefaOrigem.historico_autoria)
        ? tarefaOrigem.historico_autoria
        : [];

      const novoStatusOriginal = fecharOriginal ? 'Concluída' : tarefaOrigem.status;

      await flowdesk.entities.Tarefa.update(tarefaOrigem.id, {
        tarefas_encaminhadas: [...prevEncaminhadas, nova.id],
        historico_autoria: [
          ...prevHistorico,
          `[${ts}] Nova tarefa encaminhada para ${novaTarefa.setor_destino || 'setor não informado'} - Responsável: ${
            pessoas.find((p) => p.id === novaTarefa.responsavel_id)?.nome || 'não definido'
          } — por ${label}`,
          ...(fecharOriginal ? [`[${ts}] Tarefa original marcada como Concluída após encaminhamento`] : []),
        ],
        ...(fecharOriginal ? { status: 'Concluída', status_detalhado: 'Concluída' } : {}),
      });

      // Notificar responsável da nova tarefa
      if (novaTarefa.responsavel_id) {
        await flowdesk.entities.Notificacao.create({
          titulo: '📋 Nova Tarefa Encaminhada',
          mensagem: `Uma tarefa foi encaminhada para você: "${novaTarefa.titulo}" (originada de: "${tarefaOrigem.titulo}")`,
          tipo: 'tarefa_criada',
          usuario_id: novaTarefa.responsavel_id,
          tarefa_id: nova.id,
          lida: false,
        });
      }

      return nova;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tarefas'] });
      onClose();
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.responsavel_id || !formData.data_vencimento) {
      alert('Responsável e Data de Vencimento são obrigatórios');
      return;
    }
    const { fechar_original, observacoes_encaminhamento, ...restForm } = formData;
    const obs = [
      restForm.observacoes,
      observacoes_encaminhamento
        ? `Obs. de encaminhamento: ${observacoes_encaminhamento}`
        : '',
    ]
      .filter(Boolean)
      .join('\n\n');

    createMutation.mutate({
      novaTarefa: { ...restForm, observacoes: obs },
      fecharOriginal: fechar_original,
    });
  };

  if (!tarefaOrigem) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-rose-500" />
            Encaminhar como Nova Tarefa
          </DialogTitle>
        </DialogHeader>

        {/* Origem */}
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
            Originada de
          </p>
          <div className="flex items-center gap-2">
            <ArrowRight className="h-4 w-4 text-rose-400 flex-shrink-0" />
            <span className="font-medium text-slate-700">{tarefaOrigem.titulo}</span>
            {tarefaOrigem.cliente_nome && (
              <Badge variant="outline" className="text-xs ml-auto flex-shrink-0">
                {tarefaOrigem.cliente_nome}
              </Badge>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Título da Nova Tarefa</Label>
            <Input
              value={formData.titulo}
              onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
              placeholder="Título da tarefa encaminhada"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Descrição / Contexto</Label>
            <Textarea
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              placeholder="Descreva o que deve ser feito..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Observações do Encaminhamento</Label>
            <Textarea
              value={formData.observacoes_encaminhamento}
              onChange={(e) =>
                setFormData({ ...formData, observacoes_encaminhamento: e.target.value })
              }
              placeholder="O que precisa ser feito, instruções especiais..."
              rows={2}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Responsável *</Label>
              <Select
                value={formData.responsavel_id}
                onValueChange={(value) => setFormData({ ...formData, responsavel_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o responsável..." />
                </SelectTrigger>
                <SelectContent>
                  {pessoas.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Setor de Destino</Label>
              <Select
                value={formData.setor_destino}
                onValueChange={(value) => setFormData({ ...formData, setor_destino: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o setor..." />
                </SelectTrigger>
                <SelectContent>
                  {SETORES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Data de Vencimento *</Label>
              <Input
                type="date"
                value={formData.data_vencimento}
                onChange={(e) => setFormData({ ...formData, data_vencimento: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Prioridade</Label>
              <Select
                value={formData.prioridade}
                onValueChange={(value) => setFormData({ ...formData, prioridade: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Baixa">Baixa</SelectItem>
                  <SelectItem value="Média">Média</SelectItem>
                  <SelectItem value="Alta">Alta</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Opção sobre tarefa original */}
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider">
              Tarefa Original
            </p>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                size="sm"
                variant={!formData.fechar_original ? 'default' : 'outline'}
                className={!formData.fechar_original ? 'bg-slate-800 hover:bg-slate-700' : ''}
                onClick={() => setFormData({ ...formData, fechar_original: false })}
              >
                Manter aberta
              </Button>
              <Button
                type="button"
                size="sm"
                variant={formData.fechar_original ? 'default' : 'outline'}
                className={formData.fechar_original ? 'bg-emerald-700 hover:bg-emerald-600' : ''}
                onClick={() => setFormData({ ...formData, fechar_original: true })}
              >
                Marcar como concluída
              </Button>
            </div>
            <p className="text-xs text-amber-600">
              {formData.fechar_original
                ? 'A tarefa original será marcada como Concluída após o encaminhamento.'
                : 'A tarefa original permanecerá aberta.'}
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              <GitBranch className="mr-2 h-4 w-4" />
              {createMutation.isPending ? 'Encaminhando...' : 'Encaminhar Tarefa'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}