import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { flowdesk } from '@/api/flowdeskClient';
import { useCurrentUser, userLabel } from '@/hooks/useCurrentUser';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Plus,
  Search,
  CheckSquare,
  Calendar,
  User,
  MoreVertical,
  Edit,
  Trash2,
  Circle,
  Play,
  AlertTriangle,
  CheckCircle2,
  Paperclip,
  Upload,
  X,
  GitBranch,
  ExternalLink,
  ArrowRight,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
import EncaminharTarefaModal from '@/components/tarefas/EncaminharTarefaModal';

const statusConfig = {
  Urgente: { color: 'bg-purple-100 text-purple-800 border-purple-500', icon: AlertTriangle },
  Pendente: { color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Circle },
  'Em andamento': { color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Play },
  Atrasada: { color: 'bg-red-100 text-red-700 border-red-200', icon: AlertTriangle },
  Concluída: { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
};

const prioridadeColors = {
  Baixa: 'bg-slate-100 text-slate-600',
  Média: 'bg-amber-100 text-amber-700',
  Alta: 'bg-red-100 text-red-700',
};

export default function Tarefas() {
  const currentUser = useCurrentUser();
  const [searchTerm, setSearchTerm] = useState('');
  const [prioridadeFilter, setPrioridadeFilter] = useState('all');
  const [responsavelFilter, setResponsavelFilter] = useState('all');
  const [dataInicioFilter, setDataInicioFilter] = useState('');
  const [dataVencimentoFilter, setDataVencimentoFilter] = useState('');
  const [kanbanFilter, setKanbanFilter] = useState('todas');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [encaminharTarefa, setEncaminharTarefa] = useState(null);

  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    atendimento_id: '',
    cliente_id: '',
    cliente_nome: '',
    responsavel_id: '',
    data_inicio: '',
    data_vencimento: '',
    status: 'Em aberto',
    status_detalhado: 'Pendente',
    prioridade: 'Média',
    observacoes: '',
    motivo_atraso: '',
    retorno_executivo: '',
    anexos: [],
    transferido_para: '',
    mencoes: [],
  });

  const queryClient = useQueryClient();

  const createNotification = useMutation({
    mutationFn: (data) => flowdesk.entities.Notificacao.create(data),
  });

  const { data: tarefas = [], isLoading } = useQuery({
    queryKey: ['tarefas'],
    queryFn: () => flowdesk.entities.Tarefa.list('-created_date'),
  });

  const { data: pessoas = [] } = useQuery({
    queryKey: ['pessoas'],
    queryFn: () => flowdesk.entities.Pessoa.list(),
  });

  const { data: atendimentos = [] } = useQuery({
    queryKey: ['atendimentos'],
    queryFn: () => flowdesk.entities.Atendimento.list(),
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => flowdesk.entities.Cliente.list(),
  });

  // Helper: tarefa não tem responsável válido
  const semResponsavelValido = (t) =>
    !t.responsavel_id || !pessoas.find((p) => p.id === t.responsavel_id);

  const getClienteInfo = (tarefa) => {
    if (tarefa.cliente_id) {
      const c = clientes.find((c) => c.id === tarefa.cliente_id);
      if (c) return { id: c.id, nome: c.nome_completo };
    }
    if (tarefa.cliente_nome) return { id: tarefa.cliente_id || null, nome: tarefa.cliente_nome };
    if (tarefa.atendimento_id) {
      const at = atendimentos.find((a) => a.id === tarefa.atendimento_id);
      if (at) {
        const c = clientes.find((c) => c.nome_completo === at.cliente);
        if (c) return { id: c.id, nome: c.nome_completo };
        if (at.cliente) return { id: null, nome: at.cliente };
      }
    }
    return null;
  };

  const getPessoaNome = (id) => {
    const pessoa = pessoas.find((p) => p.id === id);
    return pessoa?.nome || '-';
  };

  const notifyDoctorIfLate = (tarefa) => {
    if (!tarefa?.data_vencimento) return;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const vencimento = new Date(tarefa.data_vencimento);
    vencimento.setHours(0, 0, 0, 0);
    if (vencimento < hoje && tarefa.status !== 'Concluída') {
      createNotification.mutate({
        titulo: '⚠️ Tarefa Atrasada',
        mensagem: `Tarefa atrasada: "${tarefa.titulo}" - Responsável: ${getPessoaNome(tarefa.responsavel_id)}`,
        tipo: 'tarefa_atrasada',
        usuario_id: 'dra',
        tarefa_id: tarefa.id,
        lida: false,
      });
    }
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingItem(null);
    setFormData({
      titulo: '',
      descricao: '',
      atendimento_id: '',
      cliente_id: '',
      cliente_nome: '',
      responsavel_id: '',
      data_inicio: '',
      data_vencimento: '',
      status: 'Em aberto',
      status_detalhado: 'Pendente',
      prioridade: 'Média',
      observacoes: '',
      motivo_atraso: '',
      retorno_executivo: '',
      anexos: [],
      transferido_para: '',
      mencoes: [],
    });
  };

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => {
      const label = userLabel(currentUser);
      const ts = new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
      const existing = tarefas.find((t) => t.id === id);
      const prevHistory = Array.isArray(existing?.historico_autoria) ? existing.historico_autoria : [];

      let actionLabel = 'Atualizado';
      if (data.status === 'Concluída') actionLabel = 'Concluído';
      else if (data.status === 'Atrasada') actionLabel = 'Marcado como Atrasado';
      else if (data.transferido_para && data.transferido_para !== existing?.transferido_para) {
        actionLabel = `Delegado`;
      }

      const enriched = {
        ...data,
        editado_por_email: currentUser?.email || '',
        historico_autoria: [...prevHistory, `[${ts}] ${actionLabel} por ${label}`],
        ...(data.status === 'Concluída' ? { concluido_por_email: currentUser?.email || '' } : {}),
      };
      return flowdesk.entities.Tarefa.update(id, enriched);
    },
    onSuccess: (tarefaAtualizada, { data: dataAtualizada }) => {
      if (
        (dataAtualizada.status === 'Concluída' ||
          dataAtualizada.status === 'Não realizada / Impedimento') &&
        !dataAtualizada.retorno_executivo
      ) {
        alert('Retorno Executivo é obrigatório para conclusão da tarefa');
        return;
      }

      queryClient.invalidateQueries({ queryKey: ['tarefas'] });

      if (
        dataAtualizada.transferido_para &&
        editingItem &&
        editingItem.transferido_para !== dataAtualizada.transferido_para
      ) {
        createNotification.mutate({
          titulo: '🔄 Tarefa Transferida',
          mensagem: `Uma tarefa foi transferida para você: "${tarefaAtualizada.titulo}"`,
          tipo: 'tarefa_criada',
          usuario_id: dataAtualizada.transferido_para,
          tarefa_id: tarefaAtualizada.id,
          lida: false,
        });
      }

      if (dataAtualizada.mencoes && Array.isArray(dataAtualizada.mencoes)) {
        dataAtualizada.mencoes.forEach((usuarioId) => {
          if (!editingItem?.mencoes?.includes(usuarioId)) {
            createNotification.mutate({
              titulo: '💬 Você foi mencionado',
              mensagem: `Você foi mencionado na tarefa: "${tarefaAtualizada.titulo}"`,
              tipo: 'info',
              usuario_id: usuarioId,
              tarefa_id: tarefaAtualizada.id,
              lida: false,
            });
          }
        });
      }

      notifyDoctorIfLate(tarefaAtualizada);
      closeDialog();
    },
  });

  React.useEffect(() => {
    if (!tarefas || tarefas.length === 0) return;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    tarefas.forEach((tarefa) => {
      if (tarefa.status === 'Concluída' || tarefa.status === 'Não realizada / Impedimento') {
        if (tarefa.status_detalhado !== 'Concluída') {
          updateMutation.mutate({ id: tarefa.id, data: { ...tarefa, status_detalhado: 'Concluída' } });
        }
        return;
      }
      if (tarefa.status_detalhado === 'Atrasada') return;
      if (tarefa.data_vencimento) {
        const dataVencimento = new Date(tarefa.data_vencimento);
        dataVencimento.setHours(0, 0, 0, 0);
        if (dataVencimento < hoje) {
          updateMutation.mutate({ id: tarefa.id, data: { ...tarefa, status_detalhado: 'Atrasada' } });
        }
      }
    });

  }, [tarefas]);

  const createMutation = useMutation({
    mutationFn: (data) => {
      const label = userLabel(currentUser);
      const ts = new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
      return flowdesk.entities.Tarefa.create({
        ...data,
        criado_por_email: currentUser?.email || '',
        editado_por_email: currentUser?.email || '',
        historico_autoria: [`[${ts}] Criado por ${label}`],
      });
    },
    onSuccess: (novaTarefa) => {
      queryClient.invalidateQueries({ queryKey: ['tarefas'] });
      if (novaTarefa.responsavel_id) {
        createNotification.mutate({
          titulo: '📋 Nova Tarefa Atribuída',
          mensagem: `Você recebeu uma nova tarefa: "${novaTarefa.titulo}"`,
          tipo: 'tarefa_criada',
          usuario_id: novaTarefa.responsavel_id,
          tarefa_id: novaTarefa.id,
          lida: false,
        });
      }
      closeDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => flowdesk.entities.Tarefa.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tarefas'] });
    },
  });

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploadingFiles(true);
    const uploadedUrls = [];
    for (const file of files) {
      try {
        const { file_url } = await flowdesk.integrations.Core.UploadFile({ file });
        uploadedUrls.push(file_url);
      } catch (error) {
        console.error('Erro ao fazer upload:', error);
      }
    }
    setFormData((prev) => ({
      ...prev,
      anexos: [...(prev.anexos || []), ...uploadedUrls],
    }));
    setUploadingFiles(false);
  };

  const removeAnexo = (url) => {
    setFormData((prev) => ({
      ...prev,
      anexos: (prev.anexos || []).filter((a) => a !== url),
    }));
  };

  const openEditDialog = (item) => {
    setEditingItem(item);
    setFormData({
      titulo: item.titulo || '',
      descricao: item.descricao || '',
      atendimento_id: item.atendimento_id || '',
      cliente_id: item.cliente_id || '',
      cliente_nome: item.cliente_nome || '',
      responsavel_id: item.responsavel_id || '',
      data_inicio: item.data_inicio || '',
      data_vencimento: item.data_vencimento || '',
      status: item.status || 'Em aberto',
      status_detalhado: item.status_detalhado || item.status || 'Pendente',
      prioridade: item.prioridade || 'Média',
      observacoes: item.observacoes || '',
      motivo_atraso: item.motivo_atraso || '',
      retorno_executivo: item.retorno_executivo || '',
      anexos: item.anexos || [],
      transferido_para: item.transferido_para || '',
      mencoes: item.mencoes || [],
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.responsavel_id || !formData.data_vencimento) {
      alert('Responsável e Data de Vencimento são obrigatórios');
      return;
    }
    const sd = formData.status_detalhado || formData.status || '';
    if (sd === 'Atrasada' && !String(formData.motivo_atraso || '').trim()) {
      alert('Motivo do Atraso é obrigatório para tarefas atrasadas');
      return;
    }
    if (
      (sd === 'Concluída' || sd === 'Não realizada / Impedimento') &&
      !formData.retorno_executivo
    ) {
      alert('Retorno Executivo é obrigatório para conclusão da tarefa');
      return;
    }
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const hojeStr = hoje.toISOString().split('T')[0];
  const semanaStr = new Date(hoje.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const isConcluida = (t) => t.status === 'Concluída' || t.status === 'Não realizada / Impedimento';

  const getStatusEfetivo = (t) => {
    if (isConcluida(t)) return 'Concluída';
    return t.status_detalhado || 'Pendente';
  };

  const filteredTarefas = (tarefas || []).filter((t) => {
    const matchesSearch =
      (t.titulo || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.descricao || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesPrioridade = prioridadeFilter === 'all' || t.prioridade === prioridadeFilter;

    const matchesResponsavel =
      responsavelFilter === 'all'
        ? true
        : responsavelFilter === 'sem_responsavel'
        ? semResponsavelValido(t)
        : t.responsavel_id === responsavelFilter;

    const matchesDataInicio = !dataInicioFilter || (t.data_inicio && t.data_inicio >= dataInicioFilter);
    const matchesDataVencimento =
      !dataVencimentoFilter || (t.data_vencimento && t.data_vencimento <= dataVencimentoFilter);

    const statusEfetivo = getStatusEfetivo(t);
    let matchesKanban = true;
    if (kanbanFilter === 'urgentes') matchesKanban = statusEfetivo === 'Urgente';
    else if (kanbanFilter === 'atrasadas') matchesKanban = statusEfetivo === 'Atrasada';
    else if (kanbanFilter === 'vence_hoje') matchesKanban = t.data_vencimento === hojeStr && !isConcluida(t);
    else if (kanbanFilter === 'vence_semana') matchesKanban = t.data_vencimento >= hojeStr && t.data_vencimento <= semanaStr && !isConcluida(t);
    else if (kanbanFilter === 'alta_prioridade') matchesKanban = t.prioridade === 'Alta' && !isConcluida(t);
    else if (kanbanFilter === 'pendentes') matchesKanban = statusEfetivo === 'Pendente';
    else if (kanbanFilter === 'em_andamento') matchesKanban = statusEfetivo === 'Em andamento';
    else if (kanbanFilter === 'concluidas') matchesKanban = statusEfetivo === 'Concluída';
    else if (kanbanFilter === 'sem_responsavel') matchesKanban = semResponsavelValido(t) && !isConcluida(t);

    return (
      matchesSearch &&
      matchesPrioridade &&
      matchesResponsavel &&
      matchesDataInicio &&
      matchesDataVencimento &&
      matchesKanban
    );
  });

  const tarefasPorStatus = {
    Urgente: filteredTarefas.filter((t) => getStatusEfetivo(t) === 'Urgente'),
    Pendente: filteredTarefas.filter((t) => getStatusEfetivo(t) === 'Pendente'),
    'Em andamento': filteredTarefas.filter((t) => getStatusEfetivo(t) === 'Em andamento'),
    Atrasada: filteredTarefas.filter((t) => getStatusEfetivo(t) === 'Atrasada'),
    Concluída: filteredTarefas.filter((t) => getStatusEfetivo(t) === 'Concluída'),
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <Skeleton className="h-10 w-48" />
          <div className="grid gap-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-2xl" />
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
            <h1 className="text-2xl font-bold text-foreground md:text-3xl">Tarefas</h1>
            <p className="text-muted-foreground">Gerencie suas atividades</p>
          </div>
          <Button
            onClick={() => setIsDialogOpen(true)}
            className="bg-gradient-to-r from-stone-700 to-stone-800 hover:from-stone-800 hover:to-stone-900"
          >
            <Plus className="mr-2 h-4 w-4" />
            Nova Tarefa
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Buscar tarefas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={prioridadeFilter} onValueChange={setPrioridadeFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Prioridade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="Baixa">Baixa</SelectItem>
                <SelectItem value="Média">Média</SelectItem>
                <SelectItem value="Alta">Alta</SelectItem>
              </SelectContent>
            </Select>

            <Select value={responsavelFilter} onValueChange={setResponsavelFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Responsável" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="sem_responsavel">👤 Sem Responsável</SelectItem>
                {pessoas.map((pessoa) => (
                  <SelectItem key={pessoa.id} value={pessoa.id}>
                    {pessoa.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-4 md:flex-row md:items-end">
            <div className="flex-1 space-y-1">
              <Label className="text-xs text-slate-600">Data Início (a partir de)</Label>
              <Input
                type="date"
                value={dataInicioFilter}
                onChange={(e) => setDataInicioFilter(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="flex-1 space-y-1">
              <Label className="text-xs text-slate-600">Data Vencimento (até)</Label>
              <Input
                type="date"
                value={dataVencimentoFilter}
                onChange={(e) => setDataVencimentoFilter(e.target.value)}
                className="w-full"
              />
            </div>
            {(dataInicioFilter || dataVencimentoFilter) && (
              <Button
                variant="outline"
                onClick={() => {
                  setDataInicioFilter('');
                  setDataVencimentoFilter('');
                }}
              >
                Limpar Datas
              </Button>
            )}
          </div>
        </div>

        {/* Filtros rápidos Kanban */}
        <div className="flex flex-wrap gap-2">
          {[
            { value: 'todas', label: 'Todas' },
            { value: 'urgentes', label: '⚡ Urgentes' },
            { value: 'atrasadas', label: '⚠️ Atrasadas' },
            { value: 'vence_hoje', label: '📅 Vence Hoje' },
            { value: 'vence_semana', label: '🗓️ Vence essa semana' },
            { value: 'alta_prioridade', label: '🔴 Alta Prioridade' },
            { value: 'pendentes', label: 'Pendentes' },
            { value: 'em_andamento', label: 'Em andamento' },
            { value: 'concluidas', label: '✅ Concluídas' },
            { value: 'sem_responsavel', label: '👤 Sem Responsável' },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => setKanbanFilter(opt.value)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium border transition-all ${
                kanbanFilter === opt.value
                  ? 'bg-slate-800 text-white border-slate-800'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Kanban Board */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
          {Object.entries(tarefasPorStatus).map(([status, tarefasDoStatus]) => {
            const StatusIcon = status === 'Urgente' ? Zap : (statusConfig[status]?.icon || Circle);
            const isUrgente = status === 'Urgente';

            return (
              <div key={status} className="flex flex-col">
                <div
                  className={`rounded-t-2xl p-4 ${statusConfig[status]?.color} border-2 ${isUrgente ? 'shadow-lg shadow-purple-200' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <StatusIcon className="h-5 w-5" />
                      <h3 className="font-semibold">{status}</h3>
                    </div>
                    <Badge className="bg-white/50">{tarefasDoStatus.length}</Badge>
                  </div>
                </div>

                <div className={`min-h-[200px] space-y-3 rounded-b-2xl p-2 ${isUrgente ? 'bg-purple-50/60' : 'bg-muted/30'}`}>
                  <AnimatePresence>
                    {tarefasDoStatus.map((tarefa, index) => {
                      const diasRestantes = tarefa.data_vencimento
                        ? differenceInDays(parseISO(tarefa.data_vencimento), new Date())
                        : null;

                      return (
                        <motion.div
                          key={tarefa.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ delay: index * 0.05 }}
                          className="cursor-pointer rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-lg"
                          onClick={() => openEditDialog(tarefa)}
                        >
                          <div className="space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="line-clamp-2 text-sm font-semibold text-foreground">
                                {tarefa.titulo}
                              </h4>

                              <DropdownMenu>
                                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                  <Button variant="ghost" size="icon" className="h-6 w-6">
                                    <MoreVertical className="h-3 w-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={(e) => { e.stopPropagation(); openEditDialog(tarefa); }}
                                  >
                                    <Edit className="mr-2 h-4 w-4" />
                                    Editar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={(e) => { e.stopPropagation(); setEncaminharTarefa(tarefa); }}
                                  >
                                    <GitBranch className="mr-2 h-4 w-4 text-rose-500" />
                                    Encaminhar como nova tarefa
                                  </DropdownMenuItem>
                                  {(() => {
                                    const cli = getClienteInfo(tarefa);
                                    return cli?.id ? (
                                      <DropdownMenuItem asChild>
                                        <Link to={`/ClienteDetalhe?id=${cli.id}`} onClick={(e) => e.stopPropagation()}>
                                          <ExternalLink className="mr-2 h-4 w-4 text-blue-500" />
                                          Ver Ficha do Cliente
                                        </Link>
                                      </DropdownMenuItem>
                                    ) : null;
                                  })()}
                                  <DropdownMenuItem
                                    onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(tarefa.id); }}
                                    className="text-red-600"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Excluir
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>

                            {tarefa.descricao && (
                              <p className="line-clamp-2 text-xs text-muted-foreground">
                                {tarefa.descricao}
                              </p>
                            )}

                            {/* Sugestão urgente */}
                            {(() => {
                              const sd = tarefa.status_detalhado || tarefa.status || '';
                              if (sd === 'Urgente' || sd === 'Concluída') return null;
                              if (!tarefa.data_vencimento) return null;
                              const diffMs = new Date(tarefa.data_vencimento).setHours(23,59,59,0) - Date.now();
                              if (diffMs > 0 && diffMs < 24 * 60 * 60 * 1000) {
                                return (
                                  <button
                                    className="w-full text-left text-[10px] font-semibold text-purple-700 bg-purple-50 border border-purple-300 rounded px-2 py-1 flex items-center gap-1 hover:bg-purple-100 transition-colors"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      updateMutation.mutate({ id: tarefa.id, data: { ...tarefa, status_detalhado: 'Urgente' } });
                                    }}
                                  >
                                    <Zap className="h-3 w-3 flex-shrink-0" />
                                    Vence hoje — marcar como Urgente?
                                  </button>
                                );
                              }
                              return null;
                            })()}

                            {/* Badge sem responsável */}
                            {semResponsavelValido(tarefa) && (
                              <p className="text-[10px] text-orange-500 flex items-center gap-1 font-medium">
                                <User className="h-3 w-3" />
                                Sem responsável
                              </p>
                            )}

                            {tarefa.tarefa_origem_titulo && (
                              <p className="text-[10px] text-rose-500 flex items-center gap-1">
                                <ArrowRight className="h-3 w-3" />
                                De: {tarefa.tarefa_origem_titulo.replace('[Continuação] ', '')}
                              </p>
                            )}

                            {Array.isArray(tarefa.tarefas_encaminhadas) && tarefa.tarefas_encaminhadas.length > 0 && (
                              <p className="text-[10px] text-blue-500 flex items-center gap-1">
                                <GitBranch className="h-3 w-3" />
                                {tarefa.tarefas_encaminhadas.length} encaminhamento(s)
                              </p>
                            )}

                            <div className="flex flex-wrap gap-1">
                              <Badge className={`${prioridadeColors[tarefa.prioridade]} text-xs`}>
                                {tarefa.prioridade}
                              </Badge>
                              {diasRestantes !== null && diasRestantes < 0 && tarefa.status !== 'Concluída' && (
                                <Badge className="bg-red-100 text-xs text-red-700">
                                  {Math.abs(diasRestantes)}d
                                </Badge>
                              )}
                              {tarefa.anexos && tarefa.anexos.length > 0 && (
                                <Badge variant="outline" className="text-xs">
                                  <Paperclip className="mr-1 h-3 w-3" />
                                  {tarefa.anexos.length}
                                </Badge>
                              )}
                            </div>

                            <div className="flex items-center justify-between border-t border-border pt-2 text-xs text-muted-foreground">
                              {tarefa.data_vencimento && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {format(parseISO(tarefa.data_vencimento), 'dd/MM', { locale: ptBR })}
                                </span>
                              )}
                              {tarefa.responsavel_id && pessoas.find((p) => p.id === tarefa.responsavel_id) && (
                                <span className="flex items-center gap-1 truncate">
                                  <User className="h-3 w-3" />
                                  {getPessoaNome(tarefa.responsavel_id).split(' ')[0]}
                                </span>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>

                  {tarefasDoStatus.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                      <CheckSquare className="mb-2 h-8 w-8" />
                      <p className="text-xs">Nenhuma tarefa</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Encaminhar */}
        <EncaminharTarefaModal
          open={!!encaminharTarefa}
          onClose={() => setEncaminharTarefa(null)}
          tarefaOrigem={encaminharTarefa}
          pessoas={pessoas}
        />

        {/* Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
            <DialogHeader>
              <div className="flex items-start justify-between gap-3 pr-6">
                <DialogTitle>{editingItem ? 'Editar Tarefa' : 'Nova Tarefa'}</DialogTitle>
                {editingItem && (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {(() => {
                      const cli = getClienteInfo(editingItem);
                      return cli?.id ? (
                        <Link
                          to={`/ClienteDetalhe?id=${cli.id}`}
                          target="_blank"
                          className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors"
                        >
                          <ExternalLink className="h-3 w-3" />
                          {cli.nome.split(' ')[0]}
                        </Link>
                      ) : null;
                    })()}
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="text-rose-600 border-rose-200 hover:bg-rose-50 text-xs h-7 px-2"
                      onClick={() => {
                        setIsDialogOpen(false);
                        setEncaminharTarefa(editingItem);
                      }}
                    >
                      <GitBranch className="mr-1 h-3 w-3" />
                      Encaminhar
                    </Button>
                  </div>
                )}
              </div>
              {editingItem?.tarefa_origem_titulo && (
                <p className="mt-1 text-xs text-rose-500 flex items-center gap-1">
                  <ArrowRight className="h-3 w-3" />
                  Originada de: <span className="font-medium">{editingItem.tarefa_origem_titulo}</span>
                </p>
              )}
              {Array.isArray(editingItem?.tarefas_encaminhadas) && editingItem.tarefas_encaminhadas.length > 0 && (
                <p className="mt-0.5 text-xs text-blue-500 flex items-center gap-1">
                  <GitBranch className="h-3 w-3" />
                  {editingItem.tarefas_encaminhadas.length} tarefa(s) encaminhada(s) a partir desta
                </p>
              )}
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Título</Label>
                <Input
                  value={formData.titulo}
                  onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                  placeholder="Título da tarefa"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  placeholder="Descreva a tarefa..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Data de Início</Label>
                  <Input
                    type="date"
                    value={formData.data_inicio}
                    onChange={(e) => setFormData({ ...formData, data_inicio: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>
                    Data de Vencimento{' '}
                    {editingItem && (
                      <span className="text-xs text-slate-500">(não pode ser alterada)</span>
                    )}
                  </Label>
                  <Input
                    type="date"
                    value={formData.data_vencimento}
                    onChange={(e) => setFormData({ ...formData, data_vencimento: e.target.value })}
                    disabled={!!editingItem}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Status da Tarefa</Label>
                  <Select
                    value={formData.status_detalhado || 'Pendente'}
                    onValueChange={(value) => setFormData({
                      ...formData,
                      status_detalhado: value,
                      status: value === 'Concluída'
                        ? 'Concluída'
                        : value === 'Não realizada / Impedimento'
                        ? 'Não realizada / Impedimento'
                        : 'Em aberto',
                    })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Urgente">⚡ Urgente</SelectItem>
                      <SelectItem value="Pendente">Pendente</SelectItem>
                      <SelectItem value="Em andamento">Em andamento</SelectItem>
                      <SelectItem value="Atrasada">Atrasada</SelectItem>
                      <SelectItem value="Concluída">Concluída</SelectItem>
                      <SelectItem value="Não realizada / Impedimento">Não realizada / Impedimento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Prioridade</Label>
                  <Select
                    value={formData.prioridade}
                    onValueChange={(value) => setFormData({ ...formData, prioridade: value })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Baixa">Baixa</SelectItem>
                      <SelectItem value="Média">Média</SelectItem>
                      <SelectItem value="Alta">Alta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {(formData.status_detalhado === 'Atrasada' || formData.status === 'Atrasada') && (
                <div className="space-y-2 rounded-lg border border-red-200 bg-red-50 p-3">
                  <Label className="font-bold text-red-700">Motivo do Atraso *</Label>
                  <Textarea
                    value={formData.motivo_atraso}
                    onChange={(e) => setFormData({ ...formData, motivo_atraso: e.target.value })}
                    placeholder="Explique o motivo do atraso da tarefa..."
                    rows={3}
                    className="border-red-200"
                    required
                  />
                  <p className="text-xs text-red-600">Campo obrigatório para tarefas atrasadas</p>
                </div>
              )}

              <div className="space-y-2">
                <Label>Responsável pela Execução</Label>
                <Select
                  value={formData.responsavel_id}
                  onValueChange={(value) => setFormData({ ...formData, responsavel_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o responsável..." />
                  </SelectTrigger>
                  <SelectContent>
                    {pessoas.map((pessoa) => (
                      <SelectItem key={pessoa.id} value={pessoa.id}>
                        {pessoa.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Cliente Vinculado</Label>
                <Select
                  value={formData.cliente_id}
                  onValueChange={(value) => {
                    const c = clientes.find((c) => c.id === value);
                    setFormData({ ...formData, cliente_id: value, cliente_nome: c?.nome_completo || '' });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um cliente (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nome_completo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formData.cliente_id && (
                  <Link
                    to={`/ClienteDetalhe?id=${formData.cliente_id}`}
                    target="_blank"
                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-1"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Abrir ficha do cliente
                  </Link>
                )}
              </div>

              <div className="space-y-2">
                <Label>Atendimento Relacionado</Label>
                <Select
                  value={formData.atendimento_id}
                  onValueChange={(value) => setFormData({ ...formData, atendimento_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um atendimento (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {atendimentos.map((atendimento) => (
                      <SelectItem key={atendimento.id} value={atendimento.id}>
                        {atendimento.cliente}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Anexos (Documentos e Imagens)</Label>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      multiple
                      accept="image/*,application/pdf,.doc,.docx"
                      onChange={handleFileUpload}
                      disabled={uploadingFiles}
                      className="flex-1"
                      id="file-upload"
                    />
                    <label htmlFor="file-upload">
                      <Button type="button" disabled={uploadingFiles} variant="outline" asChild>
                        <span>
                          <Upload className="mr-2 h-4 w-4" />
                          {uploadingFiles ? 'Enviando...' : 'Anexar'}
                        </span>
                      </Button>
                    </label>
                  </div>
                  {formData.anexos && formData.anexos.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.anexos.map((url, idx) => (
                        <Badge key={idx} variant="outline" className="pr-1">
                          <Paperclip className="mr-1 h-3 w-3" />
                          Anexo {idx + 1}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="ml-1 h-4 w-4"
                            onClick={() => removeAnexo(url)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>
                  Retorno Executivo{' '}
                  {(formData.status_detalhado === 'Concluída' ||
                    formData.status_detalhado === 'Não realizada / Impedimento' ||
                    formData.status === 'Concluída' ||
                    formData.status === 'Não realizada / Impedimento') && (
                    <span className="text-red-600">*</span>
                  )}
                </Label>
                <Textarea
                  value={formData.retorno_executivo}
                  onChange={(e) => setFormData({ ...formData, retorno_executivo: e.target.value })}
                  placeholder="Descreva os resultados, ações tomadas e próximos passos..."
                  rows={3}
                />
                <p className="text-xs text-slate-500">
                  Obrigatório para marcar como Concluída ou Não realizada / Impedimento
                </p>
              </div>

              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  placeholder="Observações internas..."
                  rows={2}
                />
              </div>

              {editingItem && Array.isArray(editingItem.historico_autoria) && editingItem.historico_autoria.length > 0 && (
                <div className="rounded-xl border border-border bg-muted/40 p-3 space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Histórico de Autoria
                  </p>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {editingItem.historico_autoria.map((entry, i) => (
                      <p key={i} className="text-xs text-muted-foreground border-l-2 border-border pl-2">
                        {entry}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={closeDialog}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-slate-900 hover:bg-slate-800">
                  {editingItem ? 'Salvar' : 'Criar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}