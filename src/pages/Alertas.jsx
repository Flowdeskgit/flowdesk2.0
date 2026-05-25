import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { flowdesk } from '@/api/flowdeskClient';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Plus,
  Search,
  Bell,
  Calendar,
  User,
  MoreVertical,
  Edit,
  Trash2,
  AlertTriangle,
  Clock,
  Info,
  CheckCircle
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

const tipoConfig = {
  'Pendência': { color: 'bg-amber-100 text-amber-700 border-amber-200', icon: AlertTriangle },
  'Prazo': { color: 'bg-red-100 text-red-700 border-red-200', icon: Clock },
  'Atualização': { color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Info },
  'Outro': { color: 'bg-slate-100 text-slate-700 border-slate-200', icon: Bell },
};

const statusColors = {
  'Ativo': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'Resolvido': 'bg-slate-100 text-slate-600 border-slate-200',
  'Ignorado': 'bg-slate-50 text-slate-400 border-slate-100',
};

export default function Alertas() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [tipoFilter, setTipoFilter] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    tipo: 'Outro',
    data_vencimento: '',
    status: 'Ativo',
    responsavel_id: '',
    atendimento_id: '',
    tarefa_id: '',
  });

  const queryClient = useQueryClient();

  const { data: alertas = [], isLoading } = useQuery({
    queryKey: ['alertas'],
    queryFn: () => flowdesk.entities.Alerta.list('-created_date'),
  });

  const { data: pessoas = [] } = useQuery({
    queryKey: ['pessoas'],
    queryFn: () => flowdesk.entities.Pessoa.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => flowdesk.entities.Alerta.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alertas'] });
      closeDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => flowdesk.entities.Alerta.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alertas'] });
      closeDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => flowdesk.entities.Alerta.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alertas'] });
    },
  });

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingItem(null);
    setFormData({
      titulo: '',
      descricao: '',
      tipo: 'Outro',
      data_vencimento: '',
      status: 'Ativo',
      responsavel_id: '',
      atendimento_id: '',
      tarefa_id: '',
    });
  };

  const openEditDialog = (item) => {
    setEditingItem(item);
    setFormData({
      titulo: item.titulo || '',
      descricao: item.descricao || '',
      tipo: item.tipo || 'Outro',
      data_vencimento: item.data_vencimento || '',
      status: item.status || 'Ativo',
      responsavel_id: item.responsavel_id || '',
      atendimento_id: item.atendimento_id || '',
      tarefa_id: item.tarefa_id || '',
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

  const resolverAlerta = (alerta) => {
    updateMutation.mutate({
      id: alerta.id,
      data: { ...alerta, status: 'Resolvido', data_resolucao: new Date().toISOString().split('T')[0] }
    });
  };

  const getPessoaNome = (id) => {
    const pessoa = pessoas.find(p => p.id === id);
    return pessoa?.nome || '-';
  };

  const filteredAlertas = alertas.filter(a => {
    const matchesSearch = 
      a.titulo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.descricao?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || a.status === statusFilter;
    const matchesTipo = tipoFilter === 'all' || a.tipo === tipoFilter;
    return matchesSearch && matchesStatus && matchesTipo;
  });

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
            <h1 className="text-2xl font-bold text-foreground md:text-3xl">Alertas</h1>
            <p className="text-muted-foreground">Notificações e lembretes</p>
          </div>
          <Button 
            onClick={() => setIsDialogOpen(true)}
            className="bg-gradient-to-r from-stone-700 to-stone-800 hover:from-stone-800 hover:to-stone-900"
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo Alerta
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Buscar alertas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="Ativo">Ativo</SelectItem>
              <SelectItem value="Resolvido">Resolvido</SelectItem>
              <SelectItem value="Ignorado">Ignorado</SelectItem>
            </SelectContent>
          </Select>
          <Select value={tipoFilter} onValueChange={setTipoFilter}>
            <SelectTrigger className="w-full md:w-40">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="Pendência">Pendência</SelectItem>
              <SelectItem value="Prazo">Prazo</SelectItem>
              <SelectItem value="Atualização">Atualização</SelectItem>
              <SelectItem value="Outro">Outro</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* List */}
        <div className="space-y-3">
          <AnimatePresence>
            {filteredAlertas.map((alerta, index) => {
              const TipoIcon = tipoConfig[alerta.tipo]?.icon || Bell;
              const diasRestantes = alerta.data_vencimento 
                ? differenceInDays(parseISO(alerta.data_vencimento), new Date())
                : null;
              
              return (
                <motion.div
                  key={alerta.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.05 }}
                  className={`rounded-2xl border bg-card p-4 md:p-6 hover:shadow-lg transition-shadow ${
                    alerta.status === 'Resolvido' ? 'opacity-60' : ''
                  }`}
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="flex gap-4">
                      <div className={`rounded-xl p-3 ${tipoConfig[alerta.tipo]?.color}`}>
                        <TipoIcon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge className={`${statusColors[alerta.status]} border`}>
                            {alerta.status}
                          </Badge>
                          <Badge className={`${tipoConfig[alerta.tipo]?.color} border`}>
                            {alerta.tipo}
                          </Badge>
                          {diasRestantes !== null && diasRestantes < 0 && alerta.status === 'Ativo' && (
                            <Badge className="bg-red-100 text-red-700 border-red-200 border">
                              {Math.abs(diasRestantes)}d atrasado
                            </Badge>
                          )}
                        </div>
                        <h3 className="text-lg font-semibold text-foreground">{alerta.titulo}</h3>
                        {alerta.descricao && (
                          <p className="text-muted-foreground">{alerta.descricao}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                          {alerta.data_vencimento && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {format(parseISO(alerta.data_vencimento), 'dd/MM/yyyy', { locale: ptBR })}
                            </span>
                          )}
                          {alerta.responsavel_id && (
                            <span className="flex items-center gap-1">
                              <User className="h-4 w-4" />
                              {getPessoaNome(alerta.responsavel_id)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {alerta.status === 'Ativo' && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => resolverAlerta(alerta)}
                          className="text-emerald-600 hover:text-emerald-700"
                        >
                          <CheckCircle className="mr-1 h-4 w-4" />
                          Resolver
                        </Button>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(alerta)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => deleteMutation.mutate(alerta.id)}
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
          
          {filteredAlertas.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Bell className="h-12 w-12 mb-4" />
              <p>Nenhum alerta encontrado</p>
            </div>
          )}
        </div>

        {/* Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingItem ? 'Editar Alerta' : 'Novo Alerta'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Título</Label>
                <Input
                  value={formData.titulo}
                  onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                  placeholder="Título do alerta"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  placeholder="Descrição..."
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select 
                    value={formData.tipo} 
                    onValueChange={(value) => setFormData({ ...formData, tipo: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pendência">Pendência</SelectItem>
                      <SelectItem value="Prazo">Prazo</SelectItem>
                      <SelectItem value="Atualização">Atualização</SelectItem>
                      <SelectItem value="Outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select 
                    value={formData.status} 
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Ativo">Ativo</SelectItem>
                      <SelectItem value="Resolvido">Resolvido</SelectItem>
                      <SelectItem value="Ignorado">Ignorado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Data de Vencimento</Label>
                <Input
                  type="date"
                  value={formData.data_vencimento}
                  onChange={(e) => setFormData({ ...formData, data_vencimento: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Responsável</Label>
                <Select 
                  value={formData.responsavel_id} 
                  onValueChange={(value) => setFormData({ ...formData, responsavel_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um responsável" />
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