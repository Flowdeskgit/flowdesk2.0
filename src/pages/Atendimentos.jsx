import React, { useState, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { flowdesk } from '@/api/flowdeskClient';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
  Briefcase, Plus, Search, MoreVertical, CheckCircle2,
  ExternalLink, User, Calendar, ChevronRight, Hash, AlertCircle,
} from 'lucide-react';

const STATUS_DETALHADO = [
  'Em triagem', 'Em atendimento', 'Aguardando documentos',
  'Aguardando retorno', 'Em análise', 'Encerrado', 'Sem direito/interesse',
];
const POTENCIAL = ['Alto', 'Médio', 'Baixo'];
const TIPOS_ATENDIMENTO = ['Presencial', 'Online', 'Telefone', 'WhatsApp'];
const STATUS_TAREFA = ['Pendente', 'Em andamento', 'Urgente', 'Atrasado'];
const PRIORIDADE_TAREFA = ['Baixa', 'Média', 'Alta', 'Urgente'];

const EMPTY_FORM = {
  numero_caso: '',
  cliente: '',
  cliente_id: '',
  qualificacao: '',
  assunto: '',
  potencial: 'Médio',
  status_detalhado: 'Em triagem',
  tipo_atendimento: 'Presencial',
  data_chegada: '',
  data_atendimento: '',
  observacoes: '',
  motivo_encerramento: '',
  responsavel_id: '',
  status: 'Aberto',
};

const STATUS_COLORS = {
  'Em triagem':            'bg-slate-100 text-slate-700 border-slate-200',
  'Em atendimento':        'bg-blue-100 text-blue-700 border-blue-200',
  'Aguardando documentos': 'bg-amber-100 text-amber-700 border-amber-200',
  'Aguardando retorno':    'bg-orange-100 text-orange-700 border-orange-200',
  'Em análise':            'bg-purple-100 text-purple-700 border-purple-200',
  'Encerrado':             'bg-emerald-100 text-emerald-700 border-emerald-200',
  'Sem direito/interesse': 'bg-red-100 text-red-700 border-red-200',
};

const POTENCIAL_COLORS = {
  'Alto':  'bg-green-100 text-green-700',
  'Médio': 'bg-yellow-100 text-yellow-700',
  'Baixo': 'bg-slate-100 text-slate-600',
};

function extrairNumeroAtendimento(item) {
  const raw = String(item?.numero_caso || '').trim();
  const match = raw.match(/\d+/);
  const numero = match ? parseInt(match[0], 10) : Number.POSITIVE_INFINITY;

  return Number.isFinite(numero) ? numero : Number.POSITIVE_INFINITY;
}

function ordenarAtendimentosPorNumero(lista) {
  return [...lista].sort((a, b) => {
    const numeroA = extrairNumeroAtendimento(a);
    const numeroB = extrairNumeroAtendimento(b);

    if (numeroA !== numeroB) return numeroA - numeroB;

    const dataA = a.data_chegada || a.created_date || '';
    const dataB = b.data_chegada || b.created_date || '';

    return String(dataA).localeCompare(String(dataB));
  });
}

function proximoNumeroDia(atendimentos) {
  const hoje = new Date().toISOString().split('T')[0];
  const deHoje = atendimentos.filter(a => {
    const d = (a.data_chegada || '').slice(0, 10) || (a.created_date || '').slice(0, 10);
    return d === hoje;
  });

  const maiorNumeroHoje = deHoje.reduce((maior, item) => {
    const numero = extrairNumeroAtendimento(item);
    if (!Number.isFinite(numero)) return maior;
    return Math.max(maior, numero);
  }, 0);

  return String(maiorNumeroHoje + 1); // ✅ sempre string
}

export default function Atendimentos() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const dialogScrollRef = useRef(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [apiError, setApiError] = useState(''); // ✅ erro de API visível
  const [clienteSearch, setClienteSearch] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const clienteRef = useRef(null);
  const [formData, setFormData] = useState(EMPTY_FORM);

  const [isConvertOpen, setIsConvertOpen] = useState(false);
  const [convertItem, setConvertItem] = useState(null);
  const [convertForm, setConvertForm] = useState({
    titulo: '', descricao: '', responsavel_id: '',
    data_inicio: new Date().toISOString().split('T')[0],
    data_vencimento: '', status_detalhado: 'Pendente', prioridade: 'Média', observacoes: '',
  });

  const { data: atendimentos = [], isLoading } = useQuery({
    queryKey: ['atendimentos'],
    queryFn: () => flowdesk.entities.Atendimento.list('-created_date'),
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => flowdesk.entities.Cliente.list('nome_completo'),
  });

  const { data: pessoas = [] } = useQuery({
    queryKey: ['pessoas'],
    queryFn: () => flowdesk.entities.Pessoa.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => flowdesk.entities.Atendimento.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['atendimentos'] }); closeDialog(); },
    onError: (err) => { // ✅ mostra erro
      setApiError(err?.message || 'Erro ao criar atendimento. Tente novamente.');
      dialogScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => flowdesk.entities.Atendimento.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['atendimentos'] }); closeDialog(); },
    onError: (err) => { // ✅ mostra erro
      setApiError(err?.message || 'Erro ao salvar alterações. Tente novamente.');
      dialogScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => flowdesk.entities.Atendimento.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['atendimentos'] }),
  });

  const concluirMutation = useMutation({
    mutationFn: (id) => flowdesk.entities.Atendimento.update(id, { status: 'Concluído', status_detalhado: 'Encerrado' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['atendimentos'] }),
  });

  const createTarefaMutation = useMutation({
    mutationFn: (data) => flowdesk.entities.Tarefa.create(data),
    onSuccess: async () => {
      if (convertItem) {
        await flowdesk.entities.Atendimento.update(convertItem.id, { status: 'Concluído', status_detalhado: 'Encerrado' });
        queryClient.invalidateQueries({ queryKey: ['atendimentos'] });
      }
      setIsConvertOpen(false);
      setConvertItem(null);
    },
  });

  const abertos = useMemo(() => {
    const t = searchTerm.toLowerCase();

    const filtrados = atendimentos
      .filter(a => a.status !== 'Concluído')
      .filter(a =>
        !t ||
        a.cliente?.toLowerCase().includes(t) ||
        a.assunto?.toLowerCase().includes(t) ||
        String(a.numero_caso || '').includes(t)
      );

    return ordenarAtendimentosPorNumero(filtrados);
  }, [atendimentos, searchTerm]);

  const concluidos = useMemo(() => {
    const t = searchTerm.toLowerCase();

    const filtrados = atendimentos
      .filter(a => a.status === 'Concluído')
      .filter(a =>
        !t ||
        a.cliente?.toLowerCase().includes(t) ||
        a.assunto?.toLowerCase().includes(t) ||
        String(a.numero_caso || '').includes(t)
      );

    return ordenarAtendimentosPorNumero(filtrados);
  }, [atendimentos, searchTerm]);

  const suggestions = useMemo(() => {
    if (!clienteSearch || clienteSearch.length < 1) return [];
    const t = clienteSearch.toLowerCase();
    return clientes.filter(c =>
      c.nome_completo?.toLowerCase().includes(t) || c.cpf?.includes(clienteSearch)
    ).slice(0, 8);
  }, [clientes, clienteSearch]);

  const getPessoaNome = (id) => pessoas.find(p => p.id === id)?.nome || '-';

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingItem(null);
    setFormData(EMPTY_FORM);
    setFormErrors({});
    setApiError('');
    setClienteSearch('');
    setShowSuggestions(false);
  };

  const openCreate = () => {
    const numero = proximoNumeroDia(atendimentos);
    const hoje = new Date().toISOString().split('T')[0];
    setEditingItem(null);
    setFormData({ ...EMPTY_FORM, numero_caso: numero, data_chegada: hoje });
    setClienteSearch('');
    setFormErrors({});
    setApiError('');
    setIsDialogOpen(true);
  };

  const openEdit = (item) => {
    const clienteIdResolvido = item.cliente_id ||
      clientes.find(c => c.nome_completo === item.cliente)?.id || '';

    setEditingItem(item);
    setFormData({
      numero_caso: String(item.numero_caso || ''), // ✅ sempre string
      cliente: item.cliente || '',
      cliente_id: clienteIdResolvido,
      qualificacao: item.qualificacao || '',
      assunto: item.assunto || '',
      potencial: item.potencial || 'Médio',
      status_detalhado: item.status_detalhado || 'Em triagem',
      tipo_atendimento: item.tipo_atendimento || 'Presencial',
      data_chegada: item.data_chegada || '',
      data_atendimento: item.data_atendimento || '',
      observacoes: item.observacoes || '',
      motivo_encerramento: item.motivo_encerramento || '',
      responsavel_id: item.responsavel_id || '',
      status: item.status || 'Aberto',
    });
    setClienteSearch(item.cliente || '');
    setFormErrors({});
    setApiError('');
    setIsDialogOpen(true);
  };

  const selecionarCliente = (c) => {
    const qual = [
      c.nome_completo,
      c.cpf ? `CPF ${c.cpf}` : '',
      c.rg ? `RG ${c.rg}` : '',
      c.estado_civil || '',
      c.nacionalidade || 'Brasileiro(a)',
      c.profissao || '',
      [c.endereco, c.cidade, c.estado].filter(Boolean).join(', '),
    ].filter(Boolean).join(', ');
    setFormData({ ...formData, cliente: c.nome_completo, cliente_id: c.id, qualificacao: qual });
    setClienteSearch(c.nome_completo);
    setShowSuggestions(false);
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.cliente) errors.cliente = 'Cliente é obrigatório';
    if (!formData.assunto) errors.assunto = 'Assunto é obrigatório';
    if (!formData.responsavel_id) errors.responsavel_id = 'Responsável é obrigatório';
    if (!formData.observacoes) errors.observacoes = 'Observações são obrigatórias';
    return errors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setApiError('');
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      dialogScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const openConvert = (item) => {
    setConvertItem(item);
    setConvertForm({
      titulo: `${item.cliente || ''} — ${item.assunto || ''}`,
      descricao: item.observacoes || '',
      responsavel_id: item.responsavel_id || '',
      data_inicio: new Date().toISOString().split('T')[0],
      data_vencimento: '',
      status_detalhado: 'Pendente',
      prioridade: 'Média',
      observacoes: '',
    });
    setIsConvertOpen(true);
  };

  const handleConvertSubmit = (e) => {
    e.preventDefault();
    createTarefaMutation.mutate({
      ...convertForm,
      status: 'Em aberto',
      origem: 'Atendimento',
      atendimento_id: convertItem?.id || '',
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="mx-auto max-w-7xl space-y-4">
          <Skeleton className="h-10 w-48" />
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Briefcase className="h-6 w-6 text-[#378ADD]" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">Atendimentos</h1>
              <p className="text-sm text-muted-foreground">{abertos.length} em aberto · {concluidos.length} concluídos</p>
            </div>
          </div>
          <Button onClick={openCreate} className="bg-[#378ADD] hover:bg-[#185FA5] text-white">
            <Plus className="mr-2 h-4 w-4" />Novo Atendimento
          </Button>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente, assunto, número..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        <Tabs defaultValue="abertos">
          <TabsList className="grid w-full max-w-sm grid-cols-2">
            <TabsTrigger value="abertos">Em aberto ({abertos.length})</TabsTrigger>
            <TabsTrigger value="concluidos">Concluídos ({concluidos.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="abertos" className="mt-4 space-y-3">
            {abertos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Briefcase className="h-12 w-12 mb-4 opacity-30" />
                <p>Nenhum atendimento em aberto</p>
              </div>
            ) : abertos.map(item => {
              const clienteId = item.cliente_id || clientes.find(c => c.nome_completo === item.cliente)?.id;
              return (
                <AtendimentoCard
                  key={item.id}
                  item={item}
                  getPessoaNome={getPessoaNome}
                  onEdit={() => openEdit(item)}
                  onDelete={() => { if (confirm('Excluir atendimento?')) deleteMutation.mutate(item.id); }}
                  onConcluir={() => concluirMutation.mutate(item.id)}
                  onConverter={() => openConvert(item)}
                  onVerCliente={clienteId ? () => navigate(createPageUrl('ClienteDetalhe') + `?id=${clienteId}`) : null}
                />
              );
            })}
          </TabsContent>

          <TabsContent value="concluidos" className="mt-4 space-y-3">
            {concluidos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mb-4 opacity-30" />
                <p>Nenhum atendimento concluído</p>
              </div>
            ) : concluidos.map(item => {
              const clienteId = item.cliente_id || clientes.find(c => c.nome_completo === item.cliente)?.id;
              return (
                <AtendimentoCard
                  key={item.id}
                  item={item}
                  concluido
                  getPessoaNome={getPessoaNome}
                  onEdit={() => openEdit(item)}
                  onDelete={() => { if (confirm('Excluir atendimento?')) deleteMutation.mutate(item.id); }}
                  onVerCliente={clienteId ? () => navigate(createPageUrl('ClienteDetalhe') + `?id=${clienteId}`) : null}
                />
              );
            })}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); else setIsDialogOpen(true); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" ref={dialogScrollRef}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingItem ? 'Editar Atendimento' : 'Novo Atendimento'}
              {formData.numero_caso && (
                <span className="flex items-center gap-1 text-sm font-normal text-muted-foreground">
                  <Hash className="h-3.5 w-3.5" />Nº {formData.numero_caso} do dia
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">

            {/* ✅ banner de erro da API */}
            {apiError && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 flex items-start gap-2 text-sm text-red-700">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{apiError}</span>
              </div>
            )}

            {/* ✅ banner de validação */}
            {Object.values(formErrors).some(Boolean) && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 flex items-start gap-2 text-sm text-red-700">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold mb-1">Preencha os campos obrigatórios:</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    {Object.values(formErrors).filter(Boolean).map((msg, i) => <li key={i}>{msg}</li>)}
                  </ul>
                </div>
              </div>
            )}

            <div className="rounded-lg bg-[#EAF4FF] border border-[#BFDDF7] px-3 py-2 flex items-center gap-2">
              <Hash className="h-4 w-4 text-[#378ADD]" />
              <span className="text-sm text-[#185FA5] font-medium">
                Atendimento nº <strong>{formData.numero_caso}</strong> do dia {new Date().toLocaleDateString('pt-BR')}
              </span>
            </div>

            <div className="space-y-1 relative">
              <Label>Cliente *</Label>
              <div className="relative">
                <Input
                  ref={clienteRef}
                  value={clienteSearch}
                  onChange={e => {
                    setClienteSearch(e.target.value);
                    setFormData({ ...formData, cliente: e.target.value, cliente_id: '', qualificacao: '' });
                    setShowSuggestions(true);
                    setFormErrors({ ...formErrors, cliente: '' });
                  }}
                  onFocus={() => { if (clienteSearch) setShowSuggestions(true); }}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  placeholder="Digite o nome ou CPF do cliente..."
                  className={formErrors.cliente ? 'border-red-500' : ''}
                  autoComplete="off"
                />
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-border rounded-xl shadow-xl overflow-hidden">
                    {suggestions.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        className="w-full text-left px-4 py-3 hover:bg-[#EAF4FF] transition-colors border-b border-border last:border-0"
                        onMouseDown={() => selecionarCliente(c)}
                      >
                        <p className="text-sm font-semibold text-foreground">{c.nome_completo}</p>
                        <p className="text-xs text-muted-foreground">
                          {c.cpf && <span className="font-mono">{c.cpf}</span>}
                          {c.cidade && <span> · {c.cidade}/{c.estado}</span>}
                          {c.telefone && <span> · {c.telefone}</span>}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {formErrors.cliente && <p className="text-xs text-red-500">{formErrors.cliente}</p>}

              {formData.cliente_id && (
                <button
                  type="button"
                  onClick={() => navigate(createPageUrl('ClienteDetalhe') + `?id=${formData.cliente_id}`)}
                  className="flex items-center gap-1.5 text-xs text-[#378ADD] hover:text-[#185FA5] hover:underline mt-1 font-medium"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Abrir perfil de {formData.cliente}
                </button>
              )}
            </div>

            {formData.qualificacao && (
              <div className="space-y-1">
                <Label>Qualificação <span className="text-xs text-muted-foreground">(preenchida automaticamente)</span></Label>
                <Textarea rows={2} value={formData.qualificacao} onChange={e => setFormData({ ...formData, qualificacao: e.target.value })} className="text-xs text-muted-foreground" />
              </div>
            )}

            <div className="space-y-1">
              <Label>Assunto *</Label>
              <Textarea
                rows={3}
                value={formData.assunto}
                onChange={e => { setFormData({ ...formData, assunto: e.target.value }); setFormErrors({ ...formErrors, assunto: '' }); }}
                placeholder="Ex: Aposentadoria por invalidez, BPC/LOAS, revisão de benefício..."
                className={formErrors.assunto ? 'border-red-500' : ''}
              />
              {formErrors.assunto && <p className="text-xs text-red-500">{formErrors.assunto}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Tipo de Atendimento</Label>
                <Select value={formData.tipo_atendimento} onValueChange={v => setFormData({ ...formData, tipo_atendimento: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TIPOS_ATENDIMENTO.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Potencial</Label>
                <Select value={formData.potencial} onValueChange={v => setFormData({ ...formData, potencial: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{POTENCIAL.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Status</Label>
                <Select value={formData.status_detalhado} onValueChange={v => setFormData({ ...formData, status_detalhado: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUS_DETALHADO.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Responsável *</Label>
                <Select value={formData.responsavel_id} onValueChange={v => { setFormData({ ...formData, responsavel_id: v }); setFormErrors({ ...formErrors, responsavel_id: '' }); }}>
                  <SelectTrigger className={formErrors.responsavel_id ? 'border-red-500' : ''}><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{pessoas.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent>
                </Select>
                {formErrors.responsavel_id && <p className="text-xs text-red-500">{formErrors.responsavel_id}</p>}
              </div>
              <div className="space-y-1">
                <Label>Data de Chegada</Label>
                <Input type="date" value={formData.data_chegada} onChange={e => setFormData({ ...formData, data_chegada: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Data de Atendimento</Label>
                <Input type="date" value={formData.data_atendimento} onChange={e => setFormData({ ...formData, data_atendimento: e.target.value })} />
              </div>
            </div>

            {/* ✅ sem .trim() para permitir espaços e quebras de linha */}
            <div className="space-y-1">
              <Label>Observações *</Label>
              <Textarea
                rows={4}
                value={(formData.observacoes || '').replace(/<!--HIDDEN_FICHA:[\s\S]*?-->/g, '')}
                onChange={e => { setFormData({ ...formData, observacoes: e.target.value }); setFormErrors({ ...formErrors, observacoes: '' }); }}
                placeholder="Relato do atendimento, informações relevantes, próximos passos..."
                className={formErrors.observacoes ? 'border-red-500' : ''}
              />
              {formErrors.observacoes && <p className="text-xs text-red-500">{formErrors.observacoes}</p>}
            </div>

            {(formData.status_detalhado === 'Encerrado' || formData.status_detalhado === 'Sem direito/interesse') && (
              <div className="space-y-1">
                <Label>Motivo do Encerramento</Label>
                <Textarea rows={2} value={formData.motivo_encerramento} onChange={e => setFormData({ ...formData, motivo_encerramento: e.target.value })} placeholder="Descreva o motivo do encerramento..." />
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2 border-t border-border">
              <Button type="button" variant="outline" onClick={closeDialog}>Cancelar</Button>
              <Button type="submit" className="bg-[#378ADD] hover:bg-[#185FA5] text-white" disabled={createMutation.isPending || updateMutation.isPending}>
                {(createMutation.isPending || updateMutation.isPending) ? 'Salvando...' : editingItem ? 'Salvar Alterações' : 'Criar Atendimento'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isConvertOpen} onOpenChange={setIsConvertOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Converter em Tarefa</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleConvertSubmit} className="space-y-4 pt-2">
            <div className="rounded-xl bg-[#EAF4FF] border border-[#BFDDF7] px-3 py-2 text-xs text-[#185FA5]">
              Atendimento nº <strong>{convertItem?.numero_caso}</strong> — <strong>{convertItem?.cliente}</strong> — {convertItem?.assunto}
            </div>
            <div className="space-y-1">
              <Label>Título da Tarefa *</Label>
              <Input required value={convertForm.titulo} onChange={e => setConvertForm({ ...convertForm, titulo: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Descrição</Label>
              <Textarea rows={3} value={convertForm.descricao} onChange={e => setConvertForm({ ...convertForm, descricao: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Data de Início</Label>
                <Input type="date" value={convertForm.data_inicio} onChange={e => setConvertForm({ ...convertForm, data_inicio: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Prazo Fatal *</Label>
                <Input required type="date" value={convertForm.data_vencimento} onChange={e => setConvertForm({ ...convertForm, data_vencimento: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Status da Tarefa</Label>
                <Select value={convertForm.status_detalhado} onValueChange={v => setConvertForm({ ...convertForm, status_detalhado: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUS_TAREFA.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Prioridade</Label>
                <Select value={convertForm.prioridade} onValueChange={v => setConvertForm({ ...convertForm, prioridade: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PRIORIDADE_TAREFA.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1 col-span-2">
                <Label>Responsável pela Tarefa *</Label>
                <Select value={convertForm.responsavel_id} onValueChange={v => setConvertForm({ ...convertForm, responsavel_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{pessoas.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Observações</Label>
              <Textarea rows={2} value={convertForm.observacoes} onChange={e => setConvertForm({ ...convertForm, observacoes: e.target.value })} />
            </div>
            <div className="flex justify-end gap-3 pt-2 border-t border-border">
              <Button type="button" variant="outline" onClick={() => setIsConvertOpen(false)}>Cancelar</Button>
              <Button type="submit" className="bg-[#378ADD] hover:bg-[#185FA5] text-white" disabled={createTarefaMutation.isPending}>
                {createTarefaMutation.isPending ? 'Criando...' : 'Criar Tarefa e Concluir'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AtendimentoCard({ item, concluido, getPessoaNome, onEdit, onDelete, onConcluir, onConverter, onVerCliente }) {
  return (
    <div
      className={`rounded-xl border bg-card p-4 transition-all cursor-pointer ${
        concluido ? 'opacity-70 border-border' : 'border-border hover:border-[#BFDDF7] hover:shadow-sm'
      }`}
      onClick={onEdit}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            {item.numero_caso && (
              <span className="flex items-center gap-1 text-xs font-bold text-[#378ADD] bg-[#EAF4FF] px-2 py-0.5 rounded-full">
                <Hash className="h-3 w-3" />{item.numero_caso}
              </span>
            )}
            <Badge className={`border text-xs ${STATUS_COLORS[item.status_detalhado] || 'bg-slate-100 text-slate-600'}`}>
              {item.status_detalhado || item.status}
            </Badge>
            {item.potencial && (
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${POTENCIAL_COLORS[item.potencial] || ''}`}>
                {item.potencial}
              </span>
            )}
            {item.tipo_atendimento && (
              <Badge variant="outline" className="text-xs">{item.tipo_atendimento}</Badge>
            )}
          </div>

          <p className="font-bold text-foreground text-base">{item.cliente}</p>

          {item.assunto && (
            <p className="text-sm text-[#185FA5] font-semibold mt-1">{item.assunto}</p>
          )}

          <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
            {item.responsavel_id && (
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />{getPessoaNome(item.responsavel_id)}
              </span>
            )}
            {(item.data_atendimento || item.data_chegada) && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date((item.data_atendimento || item.data_chegada) + 'T00:00:00').toLocaleDateString('pt-BR')}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
          {onVerCliente && (
            <Button
              variant="ghost" size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-[#378ADD]"
              title="Abrir perfil do cliente"
              onClick={onVerCliente}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>Ver / Editar</DropdownMenuItem>
              {!concluido && onConverter && (
                <DropdownMenuItem onClick={onConverter}>
                  <ChevronRight className="mr-2 h-4 w-4 text-[#378ADD]" />
                  Converter em tarefa
                </DropdownMenuItem>
              )}
              {!concluido && onConcluir && (
                <DropdownMenuItem onClick={onConcluir} className="text-emerald-600">
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Concluir atendimento
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={onDelete} className="text-red-600">
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}