import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { flowdesk } from '@/api/flowdeskClient';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { motion, AnimatePresence } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Search, Building2, ArrowLeft, Users, Pencil, Trash2, Calendar, AlertTriangle, MoreVertical } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useLocation } from 'react-router-dom';

import AbaVisaoGeralAdm from '@/components/admInss/AbaVisaoGeralAdm';
import AbaAgendamentosAdm from '@/components/admInss/AbaAgendamentosAdm';
import AbaProtocolosAdm from '@/components/admInss/AbaProtocolosAdm';
import AbaExigenciasAdm from '@/components/admInss/AbaExigenciasAdm';
import AbaDeferidosAdm from '@/components/admInss/AbaDeferidosAdm';
import AbaIndeferidosAdm from '@/components/admInss/AbaIndeferidosAdm';
import AbaConcluidosAdm from '@/components/admInss/AbaConcluidosAdm';
import AbaCopiasPA from '@/components/admInss/AbaCopiasPA';

import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Colunas Kanban — cada coluna agrupa um ou mais status_geral
const COLUNAS = [
  {
    id: 'protocolos',
    label: 'Protocolos e Requerimentos',
    statuses: ['Não iniciado', 'Em preparação', 'Protocolado'],
    color: 'bg-brand-electric/5 border-brand-electric/25',
    headerColor: 'bg-brand-electric',
    badgeColor: 'bg-brand-electric/10 text-brand-electric',
    dotColor: 'bg-brand-electric',
    defaultStatus: 'Protocolado',
  },
  {
    id: 'aguardando-analise',
    label: 'Aguardando Análise INSS',
    statuses: ['Aguardando agendamento'],
    color: 'bg-muted/60 border-border',
    headerColor: 'bg-muted-foreground',
    badgeColor: 'bg-muted text-muted-foreground',
    dotColor: 'bg-muted-foreground',
    defaultStatus: 'Aguardando agendamento',
  },
  {
    id: 'aguardando-pericia',
    label: 'Aguardando Perícia',
    statuses: ['Aguardando perícia'],
    color: 'bg-brand-sky/10 border-brand-sky/30',
    headerColor: 'bg-brand-sky',
    badgeColor: 'bg-brand-sky/15 text-brand-steel',
    dotColor: 'bg-brand-sky',
    defaultStatus: 'Aguardando perícia',
  },
  {
    id: 'aguardando-avaliacao',
    label: 'Aguardando Av. Social',
    statuses: ['Aguardando avaliação social'],
    color: 'bg-brand-steel/5 border-brand-steel/20',
    headerColor: 'bg-brand-steel',
    badgeColor: 'bg-brand-steel/10 text-brand-steel',
    dotColor: 'bg-brand-steel',
    defaultStatus: 'Aguardando avaliação social',
  },
  {
    id: 'exigencia',
    label: 'Exigência',
    statuses: ['Exigência pendente'],
    color: 'bg-amber-50 border-amber-200',
    headerColor: 'bg-amber-500',
    badgeColor: 'bg-amber-100 text-amber-700',
    dotColor: 'bg-amber-500',
    defaultStatus: 'Exigência pendente',
  },
  {
    id: 'deferidos',
    label: 'Deferidos',
    statuses: ['Deferido'],
    color: 'bg-green-50 border-green-200',
    headerColor: 'bg-green-600',
    badgeColor: 'bg-green-100 text-green-700',
    dotColor: 'bg-green-500',
    defaultStatus: 'Deferido',
  },
  {
    id: 'indeferidos',
    label: 'Indeferidos',
    statuses: ['Indeferido'],
    color: 'bg-red-50 border-red-200',
    headerColor: 'bg-red-600',
    badgeColor: 'bg-red-100 text-red-700',
    dotColor: 'bg-red-500',
    defaultStatus: 'Indeferido',
  },
  {
    id: 'concluidos',
    label: 'Concluídos',
    statuses: ['Concluído', 'Encerrado'],
    color: 'bg-emerald-50 border-emerald-200',
    headerColor: 'bg-emerald-700',
    badgeColor: 'bg-emerald-100 text-emerald-800',
    dotColor: 'bg-emerald-600',
    defaultStatus: 'Concluído',
  },
  {
    id: 'copias-pa',
    label: "Cópias PA's",
    statuses: ['Cópia de PA'],
    color: 'bg-orange-50 border-orange-200',
    headerColor: 'bg-orange-600',
    badgeColor: 'bg-orange-100 text-orange-700',
    dotColor: 'bg-orange-500',
    defaultStatus: 'Cópia de PA',
  },
];

const PRIORIDADE_COLORS = {
  Baixa:   'bg-muted text-muted-foreground',
  Média:   'bg-amber-50 text-amber-700',
  Alta:    'bg-destructive/10 text-destructive',
  Urgente: 'bg-brand-steel/15 text-brand-steel',
};

const TIPOS = [
  'Aposentadoria',
  'Benefício por incapacidade',
  'BPC/LOAS',
  'Pensão por morte',
  'Salário-maternidade',
  'Auxílio Doença',
  'Auxílio Acidente',
  'Revisão',
  'Recurso administrativo',
  'Exigência administrativa',
  'Emissão de guias',
  'Outro'
];

const STATUS_LIST = [
  'Não iniciado',
  'Em preparação',
  'Protocolado',
  'Aguardando agendamento',
  'Aguardando perícia',
  'Aguardando avaliação social',
  'Exigência pendente',
  'Deferido',
  'Indeferido',
  'Concluído',
  'Encerrado',
  'Cópia de PA'
];

const EMPTY_FORM = {
  cliente_id: '',
  titulo_administrativo: '',
  tipo_administrativo: '',
  numero_beneficio: '',
  numero_protocolo_principal: '',
  status_geral: 'Protocolado',
  orgao_responsavel: 'INSS',
  unidade_responsavel: '',
  prioridade: 'Média',
  data_inicio: '',
  data_fim: '',
  resumo_do_caso: '',
  observacoes_gerais: '',
};

function getColumnForStatus(status) {
  return COLUNAS.find(c => c.statuses.includes(status)) || COLUNAS[0];
}

export default function AdministrativoINSS() {
  const user = useCurrentUser();
  const queryClient = useQueryClient();
  const location = useLocation();
  const [selectedAdm, setSelectedAdm] = useState(null);
  const [activeTab, setActiveTab] = useState('visao-geral');
  const [showForm, setShowForm] = useState(false);
  const [editingAdm, setEditingAdm] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [search, setSearch] = useState('');
  const [filterTipo, setFilterTipo] = useState('');
  const [filterCliente, setFilterCliente] = useState('');
  const [defaultColStatus, setDefaultColStatus] = useState('Protocolado');

  const { data: adms = [], isLoading } = useQuery({
    queryKey: ['adm-inss-list'],
    queryFn: () => flowdesk.entities.AdministrativoINSS.list('-created_date', 500),
  });

  // Abre direto o processo se vier com admId no state (ex: vindo da tela de Clientes)
  useEffect(() => {
    const admId = location.state?.admId;
    if (admId && adms.length > 0 && !selectedAdm) {
      const found = adms.find(a => a.id === admId);
      if (found) setSelectedAdm(found);
    }
  }, [adms, location.state]);

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes-adm-inss'],
    queryFn: () => flowdesk.entities.Cliente.list('-created_date', 500),
  });

  const { data: admDetalhe } = useQuery({
    queryKey: ['adm-inss', selectedAdm?.id],
    queryFn: () => flowdesk.entities.AdministrativoINSS.filter({ id: selectedAdm?.id }),
    enabled: !!selectedAdm?.id,
    select: (d) => d?.[0],
  });

  const createMutation = useMutation({
    mutationFn: (data) =>
      flowdesk.entities.AdministrativoINSS.create({
        ...data,
        criado_por: user?.email || '',
        atualizado_por: user?.email || ''
      }),
    onSuccess: () => {
      queryClient.invalidateQueries(['adm-inss-list']);
      setShowForm(false);
      setForm(EMPTY_FORM);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) =>
      flowdesk.entities.AdministrativoINSS.update(id, {
        ...data,
        atualizado_por: user?.email || ''
      }),
    onSuccess: () => {
      queryClient.invalidateQueries(['adm-inss-list']);
      setEditingAdm(null);
      setShowForm(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => flowdesk.entities.AdministrativoINSS.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['adm-inss-list']);
      if (selectedAdm) setSelectedAdm(null);
    },
  });

  const getClienteNome = (id) =>
    clientes.find(c => c.id === id)?.nome_completo || '—';

  const filtered = adms.filter(a => {
    const nome = getClienteNome(a.cliente_id);
    const matchSearch =
      !search ||
      [
        a.titulo_administrativo,
        nome,
        a.tipo_administrativo,
        a.numero_beneficio,
        a.numero_protocolo_principal
      ].some(v => (v || '').toLowerCase().includes(search.toLowerCase()));

    const matchTipo = !filterTipo || a.tipo_administrativo === filterTipo;
    const matchCliente = !filterCliente || a.cliente_id === filterCliente;

    return matchSearch && matchTipo && matchCliente;
  });

  const f = (key) => (v) =>
    setForm(p => ({
      ...p,
      [key]: typeof v === 'string' ? v : v.target.value
    }));

  const openCreate = (colStatus = 'Protocolado') => {
    setDefaultColStatus(colStatus);
    setForm({ ...EMPTY_FORM, status_geral: colStatus });
    setEditingAdm(null);
    setShowForm(true);
  };

  const openEdit = (adm) => {
    setEditingAdm(adm);
    setForm({ ...adm });
    setShowForm(true);
  };

  const onDragEnd = (result) => {
    const { destination, source, draggableId } = result;
    if (!destination || destination.droppableId === source.droppableId) return;

    const destCol = COLUNAS.find(c => c.id === destination.droppableId);
    if (!destCol) return;

    const adm = adms.find(a => a.id === draggableId);
    if (!adm) return;

    updateMutation.mutate({
      id: adm.id,
      data: { ...adm, status_geral: destCol.defaultStatus }
    });
  };

  if (selectedAdm) {
    const adm = admDetalhe || selectedAdm;
    const col = getColumnForStatus(adm.status_geral);

    return (
      <div className="min-h-screen bg-background p-4 md:p-6">
        <div className="mb-6 flex items-center gap-3 flex-wrap">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedAdm(null)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Building2 className="h-6 w-6 text-brand-electric" />
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-foreground truncate">{adm.titulo_administrativo || adm.tipo_administrativo}</h1>
            <p className="text-sm text-muted-foreground">{getClienteNome(adm.cliente_id)} · INSS Administrativo</p>
          </div>
          <span className={`text-xs font-semibold px-3 py-1 rounded-full ${col.badgeColor}`}>{adm.status_geral}</span>
          <Button size="sm" variant="outline" onClick={() => openEdit(adm)}><Pencil className="h-3 w-3 mr-1" />Editar</Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex flex-wrap h-auto gap-1 bg-card border border-border p-1 rounded-xl mb-6">
            {[
              { id: 'visao-geral', label: 'Visão Geral' },
              { id: 'agendamentos', label: 'Agendamentos' },
              { id: 'protocolos', label: 'Protocolos' },
              { id: 'exigencias', label: 'Exigências' },
              { id: 'deferidos', label: 'Deferidos' },
              { id: 'indeferidos', label: 'Indeferidos' },
              { id: 'concluidos', label: 'Concluídos' },
              { id: 'copias-pa', label: "Cópias PA's" },
            ].map(t => (
              <TabsTrigger key={t.id} value={t.id} className="text-xs data-[state=active]:bg-brand-electric data-[state=active]:text-white rounded-lg">
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
          <div className="bg-card border border-border rounded-xl p-4 md:p-6">
            <TabsContent value="visao-geral"><AbaVisaoGeralAdm adm={adm} user={user} /></TabsContent>
            <TabsContent value="agendamentos"><AbaAgendamentosAdm admId={adm.id} user={user} /></TabsContent>
            <TabsContent value="protocolos"><AbaProtocolosAdm admId={adm.id} /></TabsContent>
            <TabsContent value="exigencias"><AbaExigenciasAdm admId={adm.id} user={user} /></TabsContent>
            <TabsContent value="deferidos"><AbaDeferidosAdm admId={adm.id} /></TabsContent>
            <TabsContent value="indeferidos"><AbaIndeferidosAdm admId={adm.id} /></TabsContent>
            <TabsContent value="concluidos"><AbaConcluidosAdm admId={adm.id} /></TabsContent>
            <TabsContent value="copias-pa"><AbaCopiasPA admId={adm.id} /></TabsContent>
          </div>
        </Tabs>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="mb-5 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Building2 className="h-6 w-6 text-brand-electric" />
          <div>
            <h1 className="text-xl font-bold text-foreground">Administrativo INSS</h1>
            <p className="text-sm text-muted-foreground">{adms.length} registro(s)</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap gap-3 mb-5">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar cliente, tipo, protocolo..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select
            value={filterCliente || 'all'}
            onValueChange={v => setFilterCliente(v === 'all' ? '' : v)}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Todos os clientes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os clientes</SelectItem>
              {clientes.map(c => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nome_completo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filterTipo || 'all'}
            onValueChange={v => setFilterTipo(v === 'all' ? '' : v)}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Todos os tipos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              {TIPOS.map(t => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            onClick={() => openCreate()}
            className="bg-brand-electric hover:bg-brand-steel text-white ml-auto"
          >
            <Plus className="h-4 w-4 mr-1" />
            Novo Administrativo
          </Button>
        </div>

        {isLoading && (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-brand-electric/20 border-t-brand-electric rounded-full animate-spin" />
          </div>
        )}

        {!isLoading && (
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex gap-4 overflow-x-auto pb-6" style={{ minHeight: '60vh' }}>
              {COLUNAS.map(col => {
                const cards = filtered.filter(a => col.statuses.includes(a.status_geral));

                return (
                  <div key={col.id} className="flex-shrink-0 w-72 flex flex-col">
                    <div className={`rounded-t-2xl px-4 py-3 ${col.color} border-2 border-b-0`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`h-2.5 w-2.5 rounded-full ${col.dotColor}`} />
                          <h3 className="font-semibold text-foreground text-sm leading-tight">
                            {col.label}
                          </h3>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${col.badgeColor}`}>
                            {cards.length}
                          </span>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 text-muted-foreground hover:text-foreground"
                            onClick={() => openCreate(col.defaultStatus)}
                            title="Adicionar nesta coluna"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    <Droppable droppableId={col.id}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`flex-1 min-h-[200px] rounded-b-2xl border-2 border-t-0 p-2 space-y-2 transition-colors ${col.color} ${snapshot.isDraggingOver ? 'ring-2 ring-inset ring-brand-electric/40' : ''}`}
                        >
                          <AnimatePresence>
                            {cards.map((adm, index) => (
                              <Draggable key={adm.id} draggableId={adm.id} index={index}>
                                {(prov, snap) => (
                                  <div
                                    ref={prov.innerRef}
                                    {...prov.draggableProps}
                                    {...prov.dragHandleProps}
                                  >
                                    <motion.div
                                      initial={{ opacity: 0, y: 8 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      exit={{ opacity: 0, scale: 0.95 }}
                                      transition={{ delay: index * 0.03 }}
                                      className={`bg-card rounded-xl border border-border p-3 cursor-pointer hover:shadow-md hover:border-brand-electric/30 transition-all ${snap.isDragging ? 'shadow-xl rotate-1' : ''}`}
                                      onClick={() => setSelectedAdm(adm)}
                                    >
                                      <div className="flex items-start justify-between gap-1 mb-2">
                                        <p className="text-sm font-semibold text-foreground line-clamp-2 leading-snug flex-1">
                                          {adm.titulo_administrativo || adm.tipo_administrativo || '—'}
                                        </p>

                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                                            <Button variant="ghost" size="icon" className="h-5 w-5 flex-shrink-0">
                                              <MoreVertical className="h-3 w-3" />
                                            </Button>
                                          </DropdownMenuTrigger>

                                          <DropdownMenuContent align="end">
                                            <DropdownMenuItem
                                              onClick={e => {
                                                e.stopPropagation();
                                                openEdit(adm);
                                              }}
                                            >
                                              <Pencil className="h-3.5 w-3.5 mr-2" />
                                              Editar
                                            </DropdownMenuItem>

                                            <DropdownMenuItem
                                              className="text-red-600"
                                              onClick={e => {
                                                e.stopPropagation();
                                                deleteMutation.mutate(adm.id);
                                              }}
                                            >
                                              <Trash2 className="h-3.5 w-3.5 mr-2" />
                                              Excluir
                                            </DropdownMenuItem>
                                          </DropdownMenuContent>
                                        </DropdownMenu>
                                      </div>

                                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                                        <Users className="h-3 w-3 flex-shrink-0" />
                                        <span className="truncate">{getClienteNome(adm.cliente_id)}</span>
                                      </div>

                                      {adm.tipo_administrativo && (
                                        <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground mb-2">
                                          {adm.tipo_administrativo}
                                        </span>
                                      )}

                                      {adm.numero_protocolo_principal && (
                                        <p className="text-[10px] text-muted-foreground font-mono mb-2 truncate">
                                          Prot.: {adm.numero_protocolo_principal}
                                        </p>
                                      )}

                                      <div className="flex items-center justify-between mt-1 pt-2 border-t border-border">
                                        <div className="flex gap-1 flex-wrap">
                                          {adm.prioridade && adm.prioridade !== 'Média' && (
                                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${PRIORIDADE_COLORS[adm.prioridade] || ''}`}>
                                              {adm.prioridade}
                                            </span>
                                          )}

                                          {adm.prioridade === 'Urgente' && (
                                            <AlertTriangle className="h-3 w-3 text-brand-steel" />
                                          )}
                                        </div>

                                        {adm.data_inicio && (
                                          <span className="flex items-center gap-1 text-[10px] text-slate-400">
                                            <Calendar className="h-2.5 w-2.5" />
                                            {format(parseISO(adm.data_inicio), 'dd/MM/yy', { locale: ptBR })}
                                          </span>
                                        )}
                                      </div>
                                    </motion.div>
                                  </div>
                                )}
                              </Draggable>
                            ))}
                          </AnimatePresence>

                          {provided.placeholder}

                          {cards.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground/40 gap-2">
                              <Building2 className="h-6 w-6 opacity-20" />
                              <p className="text-xs">Nenhum registro</p>
                            </div>
                          )}
                        </div>
                      )}
                    </Droppable>
                  </div>
                );
              })}
            </div>
          </DragDropContext>
        )}
      </div>

      <Dialog
        open={showForm}

        onOpenChange={(o) => {
          if (!o) {
            setShowForm(false);
            setEditingAdm(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingAdm ? 'Editar Administrativo INSS' : 'Novo Administrativo INSS'}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="md:col-span-2">
              <Label>Cliente *</Label>
              <Select value={form.cliente_id} onValueChange={f('cliente_id')}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clientes.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome_completo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2">
              <Label>Título do Administrativo</Label>
              <Input
                value={form.titulo_administrativo}
                onChange={f('titulo_administrativo')}
                placeholder="Ex: BPC/LOAS - João Silva"
              />
            </div>

            <div>
              <Label>Tipo Administrativo *</Label>
              <Select value={form.tipo_administrativo} onValueChange={f('tipo_administrativo')}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS.map(t => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Status Geral</Label>
              <Select value={form.status_geral} onValueChange={f('status_geral')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_LIST.map(s => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Número do Benefício</Label>
              <Input value={form.numero_beneficio} onChange={f('numero_beneficio')} />
            </div>

            <div>
              <Label>Protocolo Principal</Label>
              <Input value={form.numero_protocolo_principal} onChange={f('numero_protocolo_principal')} />
            </div>

            <div>
              <Label>Órgão Responsável</Label>
              <Input value={form.orgao_responsavel} onChange={f('orgao_responsavel')} />
            </div>

            <div>
              <Label>Unidade Responsável</Label>
              <Input value={form.unidade_responsavel} onChange={f('unidade_responsavel')} />
            </div>

            <div>
              <Label>Prioridade</Label>
              <Select value={form.prioridade} onValueChange={f('prioridade')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['Baixa', 'Média', 'Alta', 'Urgente'].map(p => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Data de Início</Label>
              <Input type="date" value={form.data_inicio} onChange={f('data_inicio')} />
            </div>

            <div className="md:col-span-2">
              <Label>Resumo do Caso</Label>
              <Textarea value={form.resumo_do_caso} onChange={f('resumo_do_caso')} rows={3} />
            </div>

            <div className="md:col-span-2">
              <Label>Observações Gerais</Label>
              <Textarea value={form.observacoes_gerais} onChange={f('observacoes_gerais')} rows={2} />
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowForm(false);
                setEditingAdm(null);
              }}
            >
              Cancelar
            </Button>

            <Button
              className="bg-brand-electric hover:bg-brand-steel text-white"
              onClick={() =>
                editingAdm
                  ? updateMutation.mutate({ id: editingAdm.id, data: form })
                  : createMutation.mutate(form)
              }
              disabled={
                !form.cliente_id ||
                !form.tipo_administrativo ||
                createMutation.isPending ||
                updateMutation.isPending
              }
            >
              {editingAdm ? 'Atualizar' : 'Criar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}