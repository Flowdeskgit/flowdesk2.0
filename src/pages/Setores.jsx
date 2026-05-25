import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { flowdesk } from '@/api/flowdeskClient';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Search,
  Building2,
  Mail,
  Phone,
  MoreVertical,
  Edit,
  Trash2
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

const tipoColors = {
  'Setor': 'bg-blue-100 text-blue-700',
  'Usuário': 'bg-purple-100 text-purple-700',
  'Recepção': 'bg-pink-100 text-pink-700',
  'Administrativo': 'bg-amber-100 text-amber-700',
  'Jurídico': 'bg-emerald-100 text-emerald-700',
  'Financeiro': 'bg-green-100 text-green-700',
  'Gestão': 'bg-slate-100 text-slate-700',
};

export default function Setores() {
  const [searchTerm, setSearchTerm] = useState('');
  const [tipoFilter, setTipoFilter] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    nome: '',
    tipo: 'Setor',
    cargo: '',
    email: '',
    telefone: '',
    observacoes: '',
  });

  const queryClient = useQueryClient();

  const { data: setores = [], isLoading } = useQuery({
    queryKey: ['setores'],
    queryFn: () => flowdesk.entities.Setor.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => flowdesk.entities.Setor.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['setores'] });
      closeDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => flowdesk.entities.Setor.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['setores'] });
      closeDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => flowdesk.entities.Setor.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['setores'] });
    },
  });

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingItem(null);
    setFormData({
      nome: '',
      tipo: 'Setor',
      cargo: '',
      email: '',
      telefone: '',
      observacoes: '',
    });
  };

  const openEditDialog = (item) => {
    setEditingItem(item);
    setFormData({
      nome: item.nome || '',
      tipo: item.tipo || 'Setor',
      cargo: item.cargo || '',
      email: item.email || '',
      telefone: item.telefone || '',
      observacoes: item.observacoes || '',
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

  const filteredSetores = setores.filter(s => {
    const matchesSearch = 
      s.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTipo = tipoFilter === 'all' || s.tipo === tipoFilter;
    return matchesSearch && matchesTipo;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <Skeleton className="h-10 w-48" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-2xl" />
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
            <h1 className="text-2xl font-bold text-foreground md:text-3xl">Setores</h1>
            <p className="text-muted-foreground">Organização departamental</p>
          </div>
          <Button 
            onClick={() => setIsDialogOpen(true)}
            className="bg-gradient-to-r from-stone-700 to-stone-800 hover:from-stone-800 hover:to-stone-900"
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo Setor
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Buscar setores..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={tipoFilter} onValueChange={setTipoFilter}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Tipos</SelectItem>
              <SelectItem value="Setor">Setor</SelectItem>
              <SelectItem value="Usuário">Usuário</SelectItem>
              <SelectItem value="Recepção">Recepção</SelectItem>
              <SelectItem value="Administrativo">Administrativo</SelectItem>
              <SelectItem value="Jurídico">Jurídico</SelectItem>
              <SelectItem value="Financeiro">Financeiro</SelectItem>
              <SelectItem value="Gestão">Gestão</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence>
            {filteredSetores.map((setor, index) => (
              <motion.div
                key={setor.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: index * 0.05 }}
                className="rounded-2xl border border-border bg-card p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="rounded-xl bg-muted p-3">
                    <Building2 className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEditDialog(setor)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => deleteMutation.mutate(setor.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <h3 className="text-lg font-semibold text-foreground mb-1">{setor.nome}</h3>
                <Badge className={`${tipoColors[setor.tipo]} mb-4`}>
                  {setor.tipo}
                </Badge>

                {setor.cargo && (
                  <p className="text-sm text-muted-foreground mb-2">{setor.cargo}</p>
                )}

                <div className="space-y-2 text-sm text-muted-foreground">
                  {setor.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      <span className="truncate">{setor.email}</span>
                    </div>
                  )}
                  {setor.telefone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      <span>{setor.telefone}</span>
                    </div>
                  )}
                </div>

                {setor.observacoes && (
                  <p className="mt-4 pt-4 border-t border-border text-sm text-muted-foreground line-clamp-2">
                    {setor.observacoes}
                  </p>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
          
          {filteredSetores.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Building2 className="h-12 w-12 mb-4" />
              <p>Nenhum setor encontrado</p>
            </div>
          )}
        </div>

        {/* Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingItem ? 'Editar Setor' : 'Novo Setor'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Nome do setor"
                  required
                />
              </div>

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
                    <SelectItem value="Setor">Setor</SelectItem>
                    <SelectItem value="Usuário">Usuário</SelectItem>
                    <SelectItem value="Recepção">Recepção</SelectItem>
                    <SelectItem value="Administrativo">Administrativo</SelectItem>
                    <SelectItem value="Jurídico">Jurídico</SelectItem>
                    <SelectItem value="Financeiro">Financeiro</SelectItem>
                    <SelectItem value="Gestão">Gestão</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Cargo</Label>
                <Input
                  value={formData.cargo}
                  onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                  placeholder="Cargo (opcional)"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>E-mail</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@exemplo.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input
                    value={formData.telefone}
                    onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                    placeholder="(00) 0000-0000"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  placeholder="Observações..."
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