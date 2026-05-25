import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { flowdesk } from '@/api/flowdeskClient';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Phone, Plus, Search, Clock, CheckCircle, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const statusColors = {
  'Pendente': 'bg-amber-100 text-amber-700 border-amber-200',
  'Contatado': 'bg-blue-100 text-blue-700 border-blue-200',
  'Concluído': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'Não Atendeu': 'bg-red-100 text-red-700 border-red-200',
};

export default function RetornoCliente() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    cliente: '',
    atendimento_id: '',
    motivo: '',
    data_prevista: '',
    data_realizado: '',
    status: 'Pendente',
    responsavel_id: '',
    observacoes: '',
  });

  const queryClient = useQueryClient();

  const { data: retornos = [], isLoading } = useQuery({
    queryKey: ['retorno-cliente'],
    queryFn: () => flowdesk.entities.RetornoCliente.list('-created_date'),
  });

  const { data: pessoas = [] } = useQuery({
    queryKey: ['pessoas'],
    queryFn: () => flowdesk.entities.Pessoa.list(),
  });

  const { data: atendimentos = [] } = useQuery({
    queryKey: ['atendimentos'],
    queryFn: () => flowdesk.entities.Atendimento.list('-created_date'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => flowdesk.entities.RetornoCliente.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['retorno-cliente'] });
      closeDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => flowdesk.entities.RetornoCliente.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['retorno-cliente'] });
      closeDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => flowdesk.entities.RetornoCliente.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['retorno-cliente'] });
    },
  });

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingItem(null);
    setFormData({
      cliente: '',
      atendimento_id: '',
      motivo: '',
      data_prevista: '',
      data_realizado: '',
      status: 'Pendente',
      responsavel_id: '',
      observacoes: '',
    });
  };

  const openEditDialog = (item) => {
    setEditingItem(item);
    setFormData(item);
    setIsDialogOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const getPessoaNome = (id) => {
    const pessoa = pessoas.find(p => p.id === id);
    return pessoa?.nome || '-';
  };

  const filteredRetornos = retornos.filter(ret =>
    ret.cliente?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ret.motivo?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const abertos = filteredRetornos.filter(r => r.status === 'Pendente' || r.status === 'Contatado' || r.status === 'Não Atendeu');
  const concluidos = filteredRetornos.filter(r => r.status === 'Concluído');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground md:text-3xl">Retorno ao Cliente</h1>
            <p className="text-muted-foreground">Agendamentos de retorno e acompanhamento</p>
          </div>
          <Button
            onClick={() => setIsDialogOpen(true)}
            className="bg-[#378ADD] hover:bg-[#185FA5] text-white"
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo Retorno
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Buscar por cliente ou motivo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="abertos" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="abertos">Em aberto ({abertos.length})</TabsTrigger>
            <TabsTrigger value="concluidos">Concluídos ({concluidos.length})</TabsTrigger>
          </TabsList>

          {/* Abertos */}
          <TabsContent value="abertos" className="mt-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <AnimatePresence>
                {abertos.map((ret, index) => {
                  const diasRestantes = ret.data_prevista
                    ? differenceInDays(parseISO(ret.data_prevista), new Date())
                    : null;

                  return (
                    <motion.div
                      key={ret.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: index * 0.05 }}
                      className="rounded-2xl border border-border bg-card p-6 hover:shadow-lg transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="font-semibold text-foreground text-lg mb-1">{ret.cliente}</h3>
                          <Badge className={`${statusColors[ret.status]} border`}>
                            {ret.status}
                          </Badge>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditDialog(ret)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => deleteMutation.mutate(ret.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div className="space-y-3 text-sm">
                        <div>
                          <p className="text-muted-foreground text-xs mb-1">Motivo:</p>
                          <p className="text-foreground">{ret.motivo}</p>
                        </div>

                        {ret.data_prevista && (
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-slate-400" />
                            <span className={`text-xs ${
                              diasRestantes < 0
                                ? 'text-red-400 font-medium'
                                : diasRestantes <= 2
                                ? 'text-amber-400'
                                : 'text-muted-foreground'
                            }`}>
                              Previsto: {format(parseISO(ret.data_prevista), 'dd/MM/yyyy', { locale: ptBR })}
                              {diasRestantes !== null && (
                                <span className="ml-1">
                                  ({diasRestantes < 0
                                    ? `${Math.abs(diasRestantes)}d atrasado`
                                    : `${diasRestantes}d restantes`})
                                </span>
                              )}
                            </span>
                          </div>
                        )}

                        {ret.responsavel_id && (
                          <div className="text-xs text-muted-foreground">
                            Responsável: {getPessoaNome(ret.responsavel_id)}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {abertos.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Phone className="h-12 w-12 mb-4" />
                <p className="text-lg">Nenhum retorno em aberto</p>
              </div>
            )}
          </TabsContent>

          {/* Concluídos */}
          <TabsContent value="concluidos" className="mt-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <AnimatePresence>
                {concluidos.map((ret, index) => (
                  <motion.div
                    key={ret.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: index * 0.05 }}
                    className="rounded-2xl border border-border bg-card p-6 opacity-75"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground text-lg mb-1">{ret.cliente}</h3>
                        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 border">
                          Concluído
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-600"
                        onClick={() => deleteMutation.mutate(ret.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="space-y-3 text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs mb-1">Motivo:</p>
                        <p className="text-foreground">{ret.motivo}</p>
                      </div>

                      {ret.data_realizado && (
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-emerald-500" />
                          <span className="text-xs text-muted-foreground">
                            Realizado: {format(parseISO(ret.data_realizado), 'dd/MM/yyyy', { locale: ptBR })}
                          </span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {concluidos.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Phone className="h-12 w-12 mb-4" />
                <p className="text-lg">Nenhum retorno concluído</p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Editar Retorno' : 'Novo Retorno'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">Cliente *</label>
                  <Input
                    value={formData.cliente}
                    onChange={(e) => setFormData({...formData, cliente: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Atendimento Relacionado</label>
                  <Select value={formData.atendimento_id} onValueChange={(value) => setFormData({...formData, atendimento_id: value})}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {atendimentos.map(a => (
                        <SelectItem key={a.id} value={a.id}>{a.numero_caso} - {a.cliente}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Motivo *</label>
                <Textarea
                  value={formData.motivo}
                  onChange={(e) => setFormData({...formData, motivo: e.target.value})}
                  placeholder="Motivo do retorno..."
                  required
                />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="text-sm font-medium">Data Prevista</label>
                  <Input
                    type="date"
                    value={formData.data_prevista}
                    onChange={(e) => setFormData({...formData, data_prevista: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Data Realizado</label>
                  <Input
                    type="date"
                    value={formData.data_realizado}
                    onChange={(e) => setFormData({...formData, data_realizado: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pendente">Pendente</SelectItem>
                      <SelectItem value="Contatado">Contatado</SelectItem>
                      <SelectItem value="Concluído">Concluído</SelectItem>
                      <SelectItem value="Não Atendeu">Não Atendeu</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Responsável</label>
                <Select value={formData.responsavel_id} onValueChange={(value) => setFormData({...formData, responsavel_id: value})}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {pessoas.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Observações</label>
                <Textarea
                  value={formData.observacoes}
                  onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
                  placeholder="Observações adicionais..."
                />
              </div>

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={closeDialog}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="bg-[#378ADD] hover:bg-[#185FA5] text-white"
                >
                  {editingItem ? 'Atualizar' : 'Criar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}