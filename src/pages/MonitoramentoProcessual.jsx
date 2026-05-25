import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { flowdesk } from '@/api/flowdeskClient';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Plus,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  CheckCircle2,
  Scale,
  Calendar,
  User,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';

const TRIBUNAIS = ['1º Grau', '2º Grau (TJ/TRF)', 'STJ', 'STF'];

const TIPOS_CONTROLE = [
  'Apenas acompanhamento',
  'Aguardando decisão',
  'Em fase de recurso',
  'Recurso interposto',
  'Aguardando julgamento',
  'Decisão publicada (analisar)',
];

const tipoColors = {
  'Apenas acompanhamento': 'bg-slate-100 text-slate-700',
  'Aguardando decisão': 'bg-amber-100 text-amber-700',
  'Em fase de recurso': 'bg-orange-100 text-orange-700',
  'Recurso interposto': 'bg-blue-100 text-blue-700',
  'Aguardando julgamento': 'bg-purple-100 text-purple-700',
  'Decisão publicada (analisar)': 'bg-red-100 text-red-700',
};

const tribunalColors = {
  '1º Grau': 'bg-slate-100 text-slate-700',
  '2º Grau (TJ/TRF)': 'bg-indigo-100 text-indigo-700',
  STJ: 'bg-emerald-100 text-emerald-700',
  STF: 'bg-rose-100 text-rose-700',
};

const EMPTY_FORM = {
  numero_processo: '',
  cliente_parte: '',
  responsavel_id: '',
  tribunal_orgao_atual: '',
  tipo_controle: '',
  o_que_precisa_ser_feito: '',
  proxima_checagem: '',
  observacoes: '',
};

export default function MonitoramentoProcessual() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);

  const { data: registros = [], isLoading } = useQuery({
    queryKey: ['monitoramento-processual'],
    queryFn: () => flowdesk.entities.MonitoramentoProcessual.list('-created_date'),
  });

  const { data: pessoas = [] } = useQuery({
    queryKey: ['pessoas'],
    queryFn: () => flowdesk.entities.Pessoa.list(),
  });

  const getPessoaNome = (id) => pessoas.find((p) => p.id === id)?.nome || '-';

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingItem(null);
    setFormData(EMPTY_FORM);
  };

  const openCreateDialog = () => {
    setEditingItem(null);
    setFormData(EMPTY_FORM);
    setIsDialogOpen(true);
  };

  const openEditDialog = (item) => {
    setEditingItem(item);
    setFormData({
      numero_processo: item.numero_processo || '',
      cliente_parte: item.cliente_parte || '',
      responsavel_id: item.responsavel_id || '',
      tribunal_orgao_atual: item.tribunal_orgao_atual || '',
      tipo_controle: item.tipo_controle || '',
      o_que_precisa_ser_feito: item.o_que_precisa_ser_feito || '',
      proxima_checagem: item.proxima_checagem || '',
      observacoes: item.observacoes || '',
    });
    setIsDialogOpen(true);
  };

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const registro = await flowdesk.entities.MonitoramentoProcessual.create({
        ...data,
        status: 'Em Monitoramento',
      });
      await flowdesk.entities.Auditoria.create({
        modulo: 'Processo Judicial',
        tipo_acao: 'Criação',
        registro_id: registro.id,
        registro_nome: `Proc ${registro.numero_processo}`,
        observacao_sistema: `Monitoramento Processual criado: Proc ${registro.numero_processo}`,
      });
      return registro;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monitoramento-processual'] });
      closeDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const registro = await flowdesk.entities.MonitoramentoProcessual.update(id, data);
      await flowdesk.entities.Auditoria.create({
        modulo: 'Processo Judicial',
        tipo_acao: 'Edição',
        registro_id: registro.id,
        registro_nome: `Proc ${registro.numero_processo}`,
        observacao_sistema: `Monitoramento Processual atualizado: Proc ${registro.numero_processo}`,
      });
      return registro;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monitoramento-processual'] });
      closeDialog();
    },
  });

  const concludeMutation = useMutation({
    mutationFn: async (item) => {
      const registro = await flowdesk.entities.MonitoramentoProcessual.update(item.id, {
        status: 'Concluído',
      });
      await flowdesk.entities.Auditoria.create({
        modulo: 'Processo Judicial',
        tipo_acao: 'Conclusão',
        registro_id: registro.id,
        registro_nome: `Proc ${registro.numero_processo}`,
        observacao_sistema: `Monitoramento Processual concluído: Proc ${registro.numero_processo}`,
      });
      return registro;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monitoramento-processual'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => flowdesk.entities.MonitoramentoProcessual.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monitoramento-processual'] });
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const required = [
      'numero_processo',
      'cliente_parte',
      'responsavel_id',
      'tribunal_orgao_atual',
      'tipo_controle',
      'o_que_precisa_ser_feito',
      'proxima_checagem',
    ];
    for (const field of required) {
      if (!formData[field]?.trim()) {
        alert('Preencha todos os campos obrigatórios.');
        return;
      }
    }
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const filtered = registros.filter((r) => {
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return (
      (r.numero_processo || '').toLowerCase().includes(s) ||
      (r.cliente_parte || '').toLowerCase().includes(s) ||
      (r.o_que_precisa_ser_feito || '').toLowerCase().includes(s) ||
      (r.tribunal_orgao_atual || '').toLowerCase().includes(s) ||
      (r.tipo_controle || '').toLowerCase().includes(s)
    );
  });

  const emMonitoramento = filtered.filter((r) => r.status === 'Em Monitoramento');
  const concluidos = filtered.filter((r) => r.status === 'Concluído');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="mx-auto max-w-5xl space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-gradient-to-br from-stone-700 to-stone-900 p-3">
              <Scale className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground md:text-3xl">
                Monitoramento Processual
              </h1>
              <p className="text-muted-foreground text-sm">
                Acompanhe decisões, recursos e fases processuais
              </p>
            </div>
          </div>
          <Button
            onClick={openCreateDialog}
            className="bg-gradient-to-r from-stone-700 to-stone-800 hover:from-stone-800 hover:to-stone-900"
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo Monitoramento
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Buscar por processo, cliente, ação necessária..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="monitoramento" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="monitoramento">
              Em Monitoramento ({emMonitoramento.length})
            </TabsTrigger>
            <TabsTrigger value="concluidos">
              Concluídos ({concluidos.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="monitoramento">
            <RegistroGrid
              registros={emMonitoramento}
              pessoas={pessoas}
              getPessoaNome={getPessoaNome}
              onEdit={openEditDialog}
              onConclude={(item) => {
                if (window.confirm('Deseja concluir este monitoramento?')) {
                  concludeMutation.mutate(item);
                }
              }}
              onDelete={(id) => {
                if (window.confirm('Deseja excluir este registro?')) {
                  deleteMutation.mutate(id);
                }
              }}
              emptyMessage="Nenhum processo em monitoramento"
              showConclude
            />
          </TabsContent>

          <TabsContent value="concluidos">
            <RegistroGrid
              registros={concluidos}
              pessoas={pessoas}
              getPessoaNome={getPessoaNome}
              onEdit={null}
              onConclude={null}
              onDelete={(id) => {
                if (window.confirm('Deseja excluir este registro?')) {
                  deleteMutation.mutate(id);
                }
              }}
              emptyMessage="Nenhum processo concluído"
              showConclude={false}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialog Criar/Editar */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'Editar Monitoramento' : 'Novo Monitoramento'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Número do processo *</Label>
                <Input
                  value={formData.numero_processo}
                  onChange={(e) => setFormData({ ...formData, numero_processo: e.target.value })}
                  placeholder="Ex: 1000664-12.2022.8.26.0691"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Cliente / Parte *</Label>
                <Input
                  value={formData.cliente_parte}
                  onChange={(e) => setFormData({ ...formData, cliente_parte: e.target.value })}
                  placeholder="Nome do cliente ou parte"
                  required
                />
              </div>
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
                <Label>Tribunal / Órgão atual *</Label>
                <Select
                  value={formData.tribunal_orgao_atual}
                  onValueChange={(value) =>
                    setFormData({ ...formData, tribunal_orgao_atual: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {TRIBUNAIS.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tipo de controle *</Label>
              <Select
                value={formData.tipo_controle}
                onValueChange={(value) => setFormData({ ...formData, tipo_controle: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo..." />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_CONTROLE.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>O que precisa ser feito *</Label>
              <Input
                value={formData.o_que_precisa_ser_feito}
                onChange={(e) =>
                  setFormData({ ...formData, o_que_precisa_ser_feito: e.target.value })
                }
                placeholder="Ex: Checar andamento no e-SAJ"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Próxima checagem *</Label>
              <Input
                type="date"
                value={formData.proxima_checagem}
                onChange={(e) =>
                  setFormData({ ...formData, proxima_checagem: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                value={formData.observacoes}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                placeholder="Observações adicionais..."
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-stone-800 hover:bg-stone-900"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {editingItem
                  ? updateMutation.isPending ? 'Salvando...' : 'Salvar'
                  : createMutation.isPending ? 'Criando...' : 'Criar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RegistroGrid({
  registros,
  getPessoaNome,
  onEdit,
  onConclude,
  onDelete,
  emptyMessage,
  showConclude,
}) {
  if (registros.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400">
        <Scale className="h-12 w-12 mb-4 opacity-40" />
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <AnimatePresence>
        {registros.map((item, index) => {
          const diasParaChecagem = item.proxima_checagem
            ? differenceInDays(parseISO(item.proxima_checagem), new Date())
            : null;

          const checagemAtrasada = diasParaChecagem !== null && diasParaChecagem < 0;
          const checagemProxima =
            diasParaChecagem !== null && diasParaChecagem >= 0 && diasParaChecagem <= 3;

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: index * 0.04 }}
              className={`rounded-2xl border bg-card p-5 hover:shadow-lg transition-shadow ${
                checagemAtrasada
                  ? 'border-red-500/40'
                  : checagemProxima
                  ? 'border-amber-500/40'
                  : 'border-border'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 space-y-2 min-w-0">
                  {/* Badges topo */}
                  <div className="flex flex-wrap gap-1.5">
                    <Badge className={`${tribunalColors[item.tribunal_orgao_atual] || 'bg-slate-100 text-slate-700'} border-0 text-xs`}>
                      {item.tribunal_orgao_atual}
                    </Badge>
                    <Badge className={`${tipoColors[item.tipo_controle] || 'bg-slate-100 text-slate-700'} border-0 text-xs`}>
                      {item.tipo_controle}
                    </Badge>
                    {item.status === 'Concluído' && (
                      <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Concluído
                      </Badge>
                    )}
                  </div>

                  {/* Processo e cliente */}
                  <div>
                    <p className="font-mono text-sm font-semibold text-foreground truncate">
                      {item.numero_processo}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">{item.cliente_parte}</p>
                  </div>

                  {/* O que fazer */}
                  <div className="rounded-lg bg-muted/40 px-3 py-2">
                    <p className="text-xs text-muted-foreground font-medium mb-0.5">Ação necessária</p>
                    <p className="text-sm text-foreground">{item.o_que_precisa_ser_feito}</p>
                  </div>

                  {/* Meta info */}
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground pt-1 border-t border-border">
                    {item.proxima_checagem && (
                      <span
                        className={`flex items-center gap-1 ${
                          checagemAtrasada
                            ? 'text-red-600 font-semibold'
                            : checagemProxima
                            ? 'text-amber-600 font-semibold'
                            : ''
                        }`}
                      >
                        {checagemAtrasada ? (
                          <AlertTriangle className="h-3 w-3" />
                        ) : (
                          <Calendar className="h-3 w-3" />
                        )}
                        {checagemAtrasada
                          ? `Atrasado ${Math.abs(diasParaChecagem)}d`
                          : checagemProxima
                          ? `Vence em ${diasParaChecagem}d`
                          : format(parseISO(item.proxima_checagem), 'dd/MM/yyyy', { locale: ptBR })}
                      </span>
                    )}
                    {item.responsavel_id && (
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {getPessoaNome(item.responsavel_id)}
                      </span>
                    )}
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {onEdit && (
                      <DropdownMenuItem onClick={() => onEdit(item)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
                    )}
                    {showConclude && onConclude && (
                      <DropdownMenuItem
                        onClick={() => onConclude(item)}
                        className="text-emerald-600"
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Concluir
                      </DropdownMenuItem>
                    )}
                    {onDelete && (
                      <DropdownMenuItem
                        onClick={() => onDelete(item.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Excluir
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}