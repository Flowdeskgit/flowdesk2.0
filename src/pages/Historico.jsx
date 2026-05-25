import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { flowdesk } from '@/api/flowdeskClient';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Plus,
  Search,
  History,
  Calendar,
  User,
  MoreVertical,
  Edit,
  Trash2,
  FileText,
  MessageSquare,
  RefreshCw,
  UserPlus,
  Paperclip
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';

const tipoAcaoConfig = {
  'Criação': { icon: Plus, color: 'bg-emerald-100 text-emerald-700' },
  'Atualização': { icon: RefreshCw, color: 'bg-blue-100 text-blue-700' },
  'Delegação': { icon: UserPlus, color: 'bg-purple-100 text-purple-700' },
  'Alteração de Status': { icon: RefreshCw, color: 'bg-amber-100 text-amber-700' },
  'Comentário': { icon: MessageSquare, color: 'bg-slate-100 text-slate-700' },
  'Anexo de Documento': { icon: Paperclip, color: 'bg-pink-100 text-pink-700' },
  'Outro': { icon: FileText, color: 'bg-slate-100 text-slate-600' },
};

export default function Historico() {
  const [searchTerm, setSearchTerm] = useState('');
  const [tipoFilter, setTipoFilter] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    atendimento_id: '',
    responsavel_id: '',
    tipo_acao: 'Outro',
    descricao: '',
    alteracoes: '',
  });

  const queryClient = useQueryClient();

  const { data: historicos = [], isLoading } = useQuery({
    queryKey: ['historicos'],
    queryFn: () => flowdesk.entities.HistoricoAtendimento.list('-created_date'),
  });

  const { data: pessoas = [] } = useQuery({
    queryKey: ['pessoas'],
    queryFn: () => flowdesk.entities.Pessoa.list(),
  });

  const { data: atendimentos = [] } = useQuery({
    queryKey: ['atendimentos'],
    queryFn: () => flowdesk.entities.Atendimento.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => flowdesk.entities.HistoricoAtendimento.create({
      ...data,
      data_hora: new Date().toISOString(),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['historicos'] });
      closeDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => flowdesk.entities.HistoricoAtendimento.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['historicos'] });
      closeDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => flowdesk.entities.HistoricoAtendimento.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['historicos'] });
    },
  });

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingItem(null);
    setFormData({
      atendimento_id: '',
      responsavel_id: '',
      tipo_acao: 'Outro',
      descricao: '',
      alteracoes: '',
    });
  };

  const openEditDialog = (item) => {
    setEditingItem(item);
    setFormData({
      atendimento_id: item.atendimento_id || '',
      responsavel_id: item.responsavel_id || '',
      tipo_acao: item.tipo_acao || 'Outro',
      descricao: item.descricao || '',
      alteracoes: item.alteracoes || '',
    });
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

  const getAtendimentoInfo = (id) => {
    const atendimento = atendimentos.find(a => a.id === id);
    return atendimento ? `${atendimento.numero_caso} - ${atendimento.cliente}` : '-';
  };

  const filteredHistoricos = historicos.filter(h => {
    const matchesSearch = 
      h.descricao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      h.alteracoes?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTipo = tipoFilter === 'all' || h.tipo_acao === tipoFilter;
    return matchesSearch && matchesTipo;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="mx-auto max-w-7xl space-y-6">
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
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground md:text-3xl">Histórico</h1>
            <p className="text-muted-foreground">Registro de ações realizadas</p>
          </div>
          <Button 
            onClick={() => setIsDialogOpen(true)}
            className="bg-gradient-to-r from-stone-700 to-stone-800 hover:from-stone-800 hover:to-stone-900"
          >
            <Plus className="mr-2 h-4 w-4" />
            Nova Entrada
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Buscar no histórico..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={tipoFilter} onValueChange={setTipoFilter}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="Tipo de Ação" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Tipos</SelectItem>
              <SelectItem value="Criação">Criação</SelectItem>
              <SelectItem value="Atualização">Atualização</SelectItem>
              <SelectItem value="Delegação">Delegação</SelectItem>
              <SelectItem value="Alteração de Status">Alteração de Status</SelectItem>
              <SelectItem value="Comentário">Comentário</SelectItem>
              <SelectItem value="Anexo de Documento">Anexo de Documento</SelectItem>
              <SelectItem value="Outro">Outro</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Timeline */}
        <div className="relative">
          <div className="absolute left-6 top-0 bottom-0 w-px bg-border hidden md:block" />
          
          <div className="space-y-4">
            <AnimatePresence>
              {filteredHistoricos.map((historico, index) => {
                const config = tipoAcaoConfig[historico.tipo_acao] || tipoAcaoConfig['Outro'];
                const Icon = config.icon;
                
                return (
                  <motion.div
                    key={historico.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.05 }}
                    className="relative flex gap-4"
                  >
                    <div className={`hidden md:flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${config.color} z-10`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    
                    <div className="flex-1 rounded-2xl border border-border bg-card p-4 md:p-6 hover:shadow-lg transition-shadow">
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div className="flex-1 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge className={`${config.color} md:hidden`}>
                              {historico.tipo_acao}
                            </Badge>
                            <Badge className={`${config.color} hidden md:inline-flex`}>
                              {historico.tipo_acao}
                            </Badge>
                            {historico.atendimento_id && (
                              <span className="text-sm text-muted-foreground">
                                {getAtendimentoInfo(historico.atendimento_id)}
                              </span>
                            )}
                          </div>
                          
                          {historico.descricao && (
                            <p className="text-foreground">{historico.descricao}</p>
                          )}
                          
                          {historico.alteracoes && (
                            <p className="text-sm text-muted-foreground bg-muted/40 rounded-lg p-3">
                              {historico.alteracoes}
                            </p>
                          )}
                          
                          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                            {historico.created_date && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                {format(new Date(historico.created_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                              </span>
                            )}
                            {historico.responsavel_id && (
                              <span className="flex items-center gap-1">
                                <User className="h-4 w-4" />
                                {getPessoaNome(historico.responsavel_id)}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditDialog(historico)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => deleteMutation.mutate(historico.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            
            {filteredHistoricos.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <History className="h-12 w-12 mb-4" />
                <p>Nenhum registro encontrado</p>
              </div>
            )}
          </div>
        </div>

        {/* Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingItem ? 'Editar Registro' : 'Nova Entrada'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Atendimento</Label>
                <Select 
                  value={formData.atendimento_id} 
                  onValueChange={(value) => setFormData({ ...formData, atendimento_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um atendimento" />
                  </SelectTrigger>
                  <SelectContent>
                    {atendimentos.map((atendimento) => (
                      <SelectItem key={atendimento.id} value={atendimento.id}>
                        {atendimento.numero_caso} - {atendimento.cliente}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de Ação</Label>
                  <Select 
                    value={formData.tipo_acao} 
                    onValueChange={(value) => setFormData({ ...formData, tipo_acao: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Criação">Criação</SelectItem>
                      <SelectItem value="Atualização">Atualização</SelectItem>
                      <SelectItem value="Delegação">Delegação</SelectItem>
                      <SelectItem value="Alteração de Status">Alteração de Status</SelectItem>
                      <SelectItem value="Comentário">Comentário</SelectItem>
                      <SelectItem value="Anexo de Documento">Anexo de Documento</SelectItem>
                      <SelectItem value="Outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Responsável</Label>
                  <Select 
                    value={formData.responsavel_id} 
                    onValueChange={(value) => setFormData({ ...formData, responsavel_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
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
              </div>

              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  placeholder="Descreva a ação realizada..."
                  rows={3}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Alterações Realizadas</Label>
                <Textarea
                  value={formData.alteracoes}
                  onChange={(e) => setFormData({ ...formData, alteracoes: e.target.value })}
                  placeholder="Detalhes das alterações (opcional)..."
                  rows={2}
                />
              </div>

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