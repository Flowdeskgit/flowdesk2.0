import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { flowdesk } from '@/api/flowdeskClient';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, FileCheck, Edit, Trash2, CheckCircle2,
  MoreVertical, Calendar, User, Eye, EyeOff, Lock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const EMPTY_AGENDAMENTO = {
  cliente: '',
  atendimento_id: '',
  numero_protocolo: '',
  data_protocolo: '',
  data_pericia: '',
  data_avaliacao_social: '',
  observacoes: '',
  status: 'Agendado',
  responsavel_id: '',
};

const EMPTY_PROCESSO = {
  cliente: '',
  atendimento_id: '',
  numero_protocolo: '',
  tipo_beneficio: '',
  data_requerimento: '',
  status: 'Em análise',
  observacoes: '',
  login_meu_inss: '',
  cpf: '',
  senha_gov: '',
  responsavel_id: '',
};

const statusColors = {
  'Agendado': 'bg-blue-100 text-blue-700',
  'Em análise': 'bg-amber-100 text-amber-700',
  'Aguardando documentos': 'bg-orange-100 text-orange-700',
  'Deferido': 'bg-emerald-100 text-emerald-700',
  'Indeferido': 'bg-red-100 text-red-700',
  'Recurso': 'bg-purple-100 text-purple-700',
  'Concluído': 'bg-slate-100 text-slate-600',
  'Cancelado': 'bg-red-100 text-red-600',
};

export default function AndamentoAdministrativo() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');

  // Agendamento INSS
  const [isAgendDialogOpen, setIsAgendDialogOpen] = useState(false);
  const [editingAgend, setEditingAgend] = useState(null);
  const [agendForm, setAgendForm] = useState(EMPTY_AGENDAMENTO);

  // Processo Administrativo
  const [isProcDialogOpen, setIsProcDialogOpen] = useState(false);
  const [editingProc, setEditingProc] = useState(null);
  const [procForm, setProcForm] = useState(EMPTY_PROCESSO);
  const [showSenha, setShowSenha] = useState(false);

  const { data: agendamentos = [] } = useQuery({
    queryKey: ['agendamentos-inss'],
    queryFn: () => flowdesk.entities.AgendamentoINSS.list('-created_date'),
  });

  const { data: processos = [] } = useQuery({
    queryKey: ['processos-inss'],
    queryFn: () => flowdesk.entities.ProcessoAdministrativoINSS.list('-created_date'),
  });

  const { data: pessoas = [] } = useQuery({
    queryKey: ['pessoas'],
    queryFn: () => flowdesk.entities.Pessoa.list(),
  });

  const getPessoaNome = (id) => pessoas.find((p) => p.id === id)?.nome || '-';

  // ── Mutations Agendamento ──
  const createAgendMutation = useMutation({
    mutationFn: (data) => flowdesk.entities.AgendamentoINSS.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agendamentos-inss'] });
      closeAgendDialog();
    },
  });

  const updateAgendMutation = useMutation({
    mutationFn: ({ id, data }) => flowdesk.entities.AgendamentoINSS.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agendamentos-inss'] });
      closeAgendDialog();
    },
  });

  const deleteAgendMutation = useMutation({
    mutationFn: (id) => flowdesk.entities.AgendamentoINSS.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['agendamentos-inss'] }),
  });

  const concludeAgendMutation = useMutation({
    mutationFn: (item) => flowdesk.entities.AgendamentoINSS.update(item.id, { status: 'Concluído' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['agendamentos-inss'] }),
  });

  // ── Mutations Processo ──
  const createProcMutation = useMutation({
    mutationFn: (data) => flowdesk.entities.ProcessoAdministrativoINSS.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['processos-inss'] });
      closeProcDialog();
    },
  });

  const updateProcMutation = useMutation({
    mutationFn: ({ id, data }) => flowdesk.entities.ProcessoAdministrativoINSS.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['processos-inss'] });
      closeProcDialog();
    },
  });

  const deleteProcMutation = useMutation({
    mutationFn: (id) => flowdesk.entities.ProcessoAdministrativoINSS.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['processos-inss'] }),
  });

  const concludeProcMutation = useMutation({
    mutationFn: async (item) => {
      const user = await flowdesk.auth.me();
      return flowdesk.entities.ProcessoAdministrativoINSS.update(item.id, {
        status: 'Concluído',
        concluido_por: user?.full_name || user?.email || 'Usuário',
        data_conclusao: new Date().toISOString(),
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['processos-inss'] }),
  });

  // ── Dialog helpers Agendamento ──
  const closeAgendDialog = () => {
    setIsAgendDialogOpen(false);
    setEditingAgend(null);
    setAgendForm(EMPTY_AGENDAMENTO);
  };

  const openEditAgend = (item) => {
    setEditingAgend(item);
    setAgendForm({
      cliente: item.cliente || '',
      atendimento_id: item.atendimento_id || '',
      numero_protocolo: item.numero_protocolo || '',
      data_protocolo: item.data_protocolo || '',
      data_pericia: item.data_pericia || '',
      data_avaliacao_social: item.data_avaliacao_social || '',
      observacoes: item.observacoes || '',
      status: item.status || 'Agendado',
      responsavel_id: item.responsavel_id || '',
    });
    setIsAgendDialogOpen(true);
  };

  const handleAgendSubmit = (e) => {
    e.preventDefault();
    if (!agendForm.cliente.trim()) { alert('Cliente é obrigatório.'); return; }
    if (editingAgend) {
      updateAgendMutation.mutate({ id: editingAgend.id, data: agendForm });
    } else {
      createAgendMutation.mutate(agendForm);
    }
  };

  // ── Dialog helpers Processo ──
  const closeProcDialog = () => {
    setIsProcDialogOpen(false);
    setEditingProc(null);
    setProcForm(EMPTY_PROCESSO);
    setShowSenha(false);
  };

  const openEditProc = (item) => {
    setEditingProc(item);
    setProcForm({
      cliente: item.cliente || '',
      atendimento_id: item.atendimento_id || '',
      numero_protocolo: item.numero_protocolo || '',
      tipo_beneficio: item.tipo_beneficio || '',
      data_requerimento: item.data_requerimento || '',
      status: item.status || 'Em análise',
      observacoes: item.observacoes || '',
      login_meu_inss: item.login_meu_inss || '',
      cpf: item.cpf || '',
      senha_gov: item.senha_gov || '',
      responsavel_id: item.responsavel_id || '',
    });
    setIsProcDialogOpen(true);
  };

  const handleProcSubmit = (e) => {
    e.preventDefault();
    if (!procForm.cliente.trim()) { alert('Cliente é obrigatório.'); return; }
    if (editingProc) {
      updateProcMutation.mutate({ id: editingProc.id, data: procForm });
    } else {
      createProcMutation.mutate(procForm);
    }
  };

  // Filters
  const filteredAgend = agendamentos.filter((a) =>
    !searchTerm ||
    (a.cliente || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (a.numero_protocolo || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredProc = processos.filter((p) =>
    !searchTerm ||
    (p.cliente || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.numero_protocolo || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const agendAtivos = filteredAgend.filter((a) => a.status !== 'Concluído' && a.status !== 'Cancelado');
  const agendConcluidos = filteredAgend.filter((a) => a.status === 'Concluído' || a.status === 'Cancelado');
  const procAtivos = filteredProc.filter((p) => p.status !== 'Concluído');
  const procConcluidos = filteredProc.filter((p) => p.status === 'Concluído');

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 p-3">
            <FileCheck className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground md:text-3xl">
              Andamento Administrativo
            </h1>
            <p className="text-muted-foreground text-sm">Agendamentos e processos INSS</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Buscar por cliente ou protocolo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-white"
          />
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="agendamentos" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="agendamentos">
              Agendamentos INSS ({agendAtivos.length})
            </TabsTrigger>
            <TabsTrigger value="processos">
              Proc. Administrativo ({procAtivos.length})
            </TabsTrigger>
            <TabsTrigger value="concluidos">
              Concluídos ({agendConcluidos.length + procConcluidos.length})
            </TabsTrigger>
          </TabsList>

          {/* ─── Aba 1: Agendamentos INSS ─── */}
          <TabsContent value="agendamentos">
            <div className="flex justify-end mb-4">
              <Button
                onClick={() => { setEditingAgend(null); setAgendForm(EMPTY_AGENDAMENTO); setIsAgendDialogOpen(true); }}
                className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
              >
                <Plus className="mr-2 h-4 w-4" />
                Novo Agendamento
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <AnimatePresence>
                {agendAtivos.map((item, idx) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: idx * 0.04 }}
                    className="rounded-2xl border border-border bg-card p-5 hover:shadow-lg transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={statusColors[item.status] || 'bg-slate-100 text-slate-700'}>
                            {item.status}
                          </Badge>
                        </div>
                        <p className="font-semibold text-foreground">{item.cliente}</p>
                        {item.numero_protocolo && (
                          <p className="text-xs text-muted-foreground font-mono">Prot.: {item.numero_protocolo}</p>
                        )}
                        <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                          {item.data_protocolo && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Protocolo: {item.data_protocolo}
                            </span>
                          )}
                          {item.data_pericia && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3 text-amber-500" />
                              Perícia: {item.data_pericia}
                            </span>
                          )}
                          {item.data_avaliacao_social && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3 text-orange-500" />
                              Aval. Social: {item.data_avaliacao_social}
                            </span>
                          )}
                          {item.responsavel_id && (
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {getPessoaNome(item.responsavel_id)}
                            </span>
                          )}
                        </div>
                        {item.observacoes && (
                          <p className="text-xs text-muted-foreground line-clamp-2">{item.observacoes}</p>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditAgend(item)}>
                            <Edit className="mr-2 h-4 w-4" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-emerald-600"
                            onClick={() => {
                              if (window.confirm('Concluir este agendamento?')) concludeAgendMutation.mutate(item);
                            }}
                          >
                            <CheckCircle2 className="mr-2 h-4 w-4" /> Concluir
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => {
                              if (window.confirm('Excluir?')) deleteAgendMutation.mutate(item.id);
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              {agendAtivos.length === 0 && (
                <p className="col-span-2 text-center text-muted-foreground py-12">Nenhum agendamento ativo</p>
              )}
            </div>
          </TabsContent>

          {/* ─── Aba 2: Acompanhamento de Processo Administrativo ─── */}
          <TabsContent value="processos">
            <div className="flex justify-end mb-4">
              <Button
                onClick={() => { setEditingProc(null); setProcForm(EMPTY_PROCESSO); setIsProcDialogOpen(true); }}
                className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
              >
                <Plus className="mr-2 h-4 w-4" />
                Novo Processo
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <AnimatePresence>
                {procAtivos.map((item, idx) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: idx * 0.04 }}
                    className="rounded-2xl border border-border bg-card p-5 hover:shadow-lg transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 space-y-2">
                        <Badge className={statusColors[item.status] || 'bg-slate-100 text-slate-700'}>
                          {item.status}
                        </Badge>
                        <p className="font-semibold text-foreground">{item.cliente}</p>
                        {item.numero_protocolo && (
                          <p className="text-xs text-muted-foreground font-mono">Prot.: {item.numero_protocolo}</p>
                        )}
                        {item.tipo_beneficio && (
                          <p className="text-xs text-muted-foreground">Benefício: {item.tipo_beneficio}</p>
                        )}
                        <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                          {item.data_requerimento && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Req.: {item.data_requerimento}
                            </span>
                          )}
                          {item.responsavel_id && (
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {getPessoaNome(item.responsavel_id)}
                            </span>
                          )}
                        </div>
                        {item.observacoes && (
                          <p className="text-xs text-muted-foreground line-clamp-2">{item.observacoes}</p>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditProc(item)}>
                            <Edit className="mr-2 h-4 w-4" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-emerald-600"
                            onClick={() => {
                              if (window.confirm('Concluir este processo?')) concludeProcMutation.mutate(item);
                            }}
                          >
                            <CheckCircle2 className="mr-2 h-4 w-4" /> Concluir
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => {
                              if (window.confirm('Excluir?')) deleteProcMutation.mutate(item.id);
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              {procAtivos.length === 0 && (
                <p className="col-span-2 text-center text-muted-foreground py-12">Nenhum processo ativo</p>
              )}
            </div>
          </TabsContent>

          {/* ─── Aba 3: Concluídos ─── */}
          <TabsContent value="concluidos">
            <div className="space-y-6">
              {agendConcluidos.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                    <Calendar className="h-4 w-4" /> Agendamentos Concluídos ({agendConcluidos.length})
                  </h3>
                  <div className="grid gap-3 md:grid-cols-2">
                    {agendConcluidos.map((item) => (
                      <div key={item.id} className="rounded-2xl border border-border bg-card/70 p-4 opacity-75">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-foreground">{item.cliente}</p>
                            {item.numero_protocolo && (
                              <p className="text-xs text-muted-foreground font-mono">Prot.: {item.numero_protocolo}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className="bg-emerald-100 text-emerald-700 border-0">Concluído</Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-red-400"
                              onClick={() => { if (window.confirm('Excluir?')) deleteAgendMutation.mutate(item.id); }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {procConcluidos.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                    <FileCheck className="h-4 w-4" /> Processos Concluídos ({procConcluidos.length})
                  </h3>
                  <div className="grid gap-3 md:grid-cols-2">
                    {procConcluidos.map((item) => (
                      <div key={item.id} className="rounded-2xl border border-border bg-card/70 p-4 opacity-75">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-foreground">{item.cliente}</p>
                            {item.numero_protocolo && (
                              <p className="text-xs text-muted-foreground font-mono">Prot.: {item.numero_protocolo}</p>
                            )}
                            {item.concluido_por && (
                              <p className="text-xs text-muted-foreground">
                                Concluído por: {item.concluido_por}
                                {item.data_conclusao && ` em ${format(new Date(item.data_conclusao), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className="bg-emerald-100 text-emerald-700 border-0">Concluído</Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-red-400"
                              onClick={() => { if (window.confirm('Excluir?')) deleteProcMutation.mutate(item.id); }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {agendConcluidos.length === 0 && procConcluidos.length === 0 && (
                <p className="text-center text-muted-foreground py-12">Nenhum item concluído</p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Dialog: Agendamento INSS ── */}
      <Dialog open={isAgendDialogOpen} onOpenChange={(open) => { if (!open) closeAgendDialog(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingAgend ? 'Editar Agendamento' : 'Novo Agendamento INSS'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAgendSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Cliente *</Label>
              <Input
                value={agendForm.cliente}
                onChange={(e) => setAgendForm({ ...agendForm, cliente: e.target.value })}
                placeholder="Nome do cliente"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Número do Protocolo</Label>
              <Input
                value={agendForm.numero_protocolo}
                onChange={(e) => setAgendForm({ ...agendForm, numero_protocolo: e.target.value })}
                placeholder="Ex: 001.123456.2024-0"
              />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Data do Protocolo</Label>
                <Input
                  type="date"
                  value={agendForm.data_protocolo}
                  onChange={(e) => setAgendForm({ ...agendForm, data_protocolo: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Data da Perícia</Label>
                <Input
                  type="date"
                  value={agendForm.data_pericia}
                  onChange={(e) => setAgendForm({ ...agendForm, data_pericia: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Data da Avaliação Social</Label>
                <Input
                  type="date"
                  value={agendForm.data_avaliacao_social}
                  onChange={(e) => setAgendForm({ ...agendForm, data_avaliacao_social: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Responsável</Label>
                <Select value={agendForm.responsavel_id} onValueChange={(v) => setAgendForm({ ...agendForm, responsavel_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {pessoas.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={agendForm.status} onValueChange={(v) => setAgendForm({ ...agendForm, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Agendado">Agendado</SelectItem>
                    <SelectItem value="Concluído">Concluído</SelectItem>
                    <SelectItem value="Cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                value={agendForm.observacoes}
                onChange={(e) => setAgendForm({ ...agendForm, observacoes: e.target.value })}
                rows={3}
                placeholder="Observações adicionais..."
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={closeAgendDialog}>Cancelar</Button>
              <Button type="submit" className="bg-amber-600 hover:bg-amber-700">
                {editingAgend ? 'Salvar' : 'Criar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Processo Administrativo ── */}
      <Dialog open={isProcDialogOpen} onOpenChange={(open) => { if (!open) closeProcDialog(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProc ? 'Editar Processo' : 'Novo Processo Administrativo'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleProcSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Cliente *</Label>
                <Input
                  value={procForm.cliente}
                  onChange={(e) => setProcForm({ ...procForm, cliente: e.target.value })}
                  placeholder="Nome do cliente"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Número do Protocolo</Label>
                <Input
                  value={procForm.numero_protocolo}
                  onChange={(e) => setProcForm({ ...procForm, numero_protocolo: e.target.value })}
                  placeholder="Ex: 001.123456.2024-0"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Tipo de Benefício</Label>
                <Input
                  value={procForm.tipo_beneficio}
                  onChange={(e) => setProcForm({ ...procForm, tipo_beneficio: e.target.value })}
                  placeholder="Ex: BPC, Aposentadoria por invalidez..."
                />
              </div>
              <div className="space-y-2">
                <Label>Data do Requerimento</Label>
                <Input
                  type="date"
                  value={procForm.data_requerimento}
                  onChange={(e) => setProcForm({ ...procForm, data_requerimento: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={procForm.status} onValueChange={(v) => setProcForm({ ...procForm, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Em análise">Em análise</SelectItem>
                    <SelectItem value="Aguardando documentos">Aguardando documentos</SelectItem>
                    <SelectItem value="Deferido">Deferido</SelectItem>
                    <SelectItem value="Indeferido">Indeferido</SelectItem>
                    <SelectItem value="Recurso">Recurso</SelectItem>
                    <SelectItem value="Concluído">Concluído</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Responsável</Label>
                <Select value={procForm.responsavel_id} onValueChange={(v) => setProcForm({ ...procForm, responsavel_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {pessoas.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Observações internas</Label>
              <Textarea
                value={procForm.observacoes}
                onChange={(e) => setProcForm({ ...procForm, observacoes: e.target.value })}
                rows={3}
                placeholder="Notas internas..."
              />
            </div>

            {/* Credenciais */}
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
              <p className="text-sm font-semibold text-amber-800 flex items-center gap-2">
                <Lock className="h-4 w-4" /> Credenciais de Acesso
              </p>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Login Meu INSS</Label>
                  <Input
                    value={procForm.login_meu_inss}
                    onChange={(e) => setProcForm({ ...procForm, login_meu_inss: e.target.value })}
                    placeholder="Login Meu INSS"
                  />
                </div>
                <div className="space-y-2">
                  <Label>CPF</Label>
                  <Input
                    value={procForm.cpf}
                    onChange={(e) => setProcForm({ ...procForm, cpf: e.target.value })}
                    placeholder="000.000.000-00"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Senha Gov.br</Label>
                <div className="relative">
                  <Input
                    type={showSenha ? 'text' : 'password'}
                    value={procForm.senha_gov}
                    onChange={(e) => setProcForm({ ...procForm, senha_gov: e.target.value })}
                    placeholder="Senha Gov.br"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    onClick={() => setShowSenha(!showSenha)}
                  >
                    {showSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-amber-700">Campo sensível — acesso restrito aos responsáveis.</p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={closeProcDialog}>Cancelar</Button>
              <Button type="submit" className="bg-amber-600 hover:bg-amber-700">
                {editingProc ? 'Salvar' : 'Criar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}