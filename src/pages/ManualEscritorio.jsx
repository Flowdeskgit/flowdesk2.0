import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { flowdesk } from '@/api/flowdeskClient';
import { motion, AnimatePresence } from 'framer-motion';

import {
  BookOpen,
  Plus,
  Search,
  MoreVertical,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';

const categoriaColors = {
  Comportamento: 'bg-[#EAF4FF] text-[#185FA5] border-[#BFDDF7]',
  Processos: 'bg-blue-50 text-blue-700 border-blue-200',
  Normas: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  Diretrizes: 'bg-amber-50 text-amber-700 border-amber-200',
  Outro: 'bg-slate-100 text-slate-700 border-slate-200',
};

export default function ManualEscritorio() {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoriaFilter, setCategoriaFilter] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [expandedItems, setExpandedItems] = useState([]);

  const [formData, setFormData] = useState({
    titulo: '',
    conteudo: '',
    categoria: 'Comportamento',
    ordem: 0,
  });

  const queryClient = useQueryClient();

  const { data: manuais = [], isLoading } = useQuery({
    queryKey: ['manual-escritorio'],
    queryFn: async () => {
      const items = await flowdesk.entities.ManualEscritorio.list();
      return items.sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
    },
  });

  const createMutation = useMutation({
    mutationFn: (data) => flowdesk.entities.ManualEscritorio.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manual-escritorio'] });
      closeDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) =>
      flowdesk.entities.ManualEscritorio.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manual-escritorio'] });
      closeDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => flowdesk.entities.ManualEscritorio.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manual-escritorio'] });
    },
  });

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingItem(null);
    setFormData({
      titulo: '',
      conteudo: '',
      categoria: 'Comportamento',
      ordem: 0,
    });
  };

  const openEditDialog = (item) => {
    setEditingItem(item);
    setFormData(item);
    setIsDialogOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const data = {
      ...formData,
      ordem: formData.ordem ? parseFloat(formData.ordem) : 0,
    };

    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const toggleExpand = (id) => {
    setExpandedItems((prev) =>
      prev.includes(id)
        ? prev.filter((i) => i !== id)
        : [...prev, id]
    );
  };

  const filteredManuais = manuais.filter((manual) => {
    const matchesSearch =
      manual.titulo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      manual.conteudo?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategoria =
      categoriaFilter === 'all' || manual.categoria === categoriaFilter;

    return matchesSearch && matchesCategoria;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F4F6FA] p-6">
        <div className="mx-auto max-w-5xl space-y-6">
          <Skeleton className="h-10 w-64" />

          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F6FA] p-4 md:p-6">
      <div className="mx-auto max-w-5xl space-y-6">

        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#0A0F1A] md:text-3xl flex items-center gap-2">
              <BookOpen className="h-8 w-8 text-[#378ADD]" />
              Manual do Escritório
            </h1>

            <p className="text-muted-foreground">
              Comportamento, processos e diretrizes
            </p>
          </div>

          <Button
            onClick={() => setIsDialogOpen(true)}
            className="bg-[#378ADD] hover:bg-[#185FA5] text-white shadow-sm"
          >
            <Plus className="mr-2 h-4 w-4" />
            Nova Seção
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 md:flex-row bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <Input
              placeholder="Buscar no manual..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 border-slate-200 focus-visible:ring-[#378ADD]/40"
            />
          </div>

          <Select value={categoriaFilter} onValueChange={setCategoriaFilter}>
            <SelectTrigger className="w-full md:w-48 border-slate-200 focus:ring-[#378ADD]/40">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="all">Todas Categorias</SelectItem>
              <SelectItem value="Comportamento">Comportamento</SelectItem>
              <SelectItem value="Processos">Processos</SelectItem>
              <SelectItem value="Normas">Normas</SelectItem>
              <SelectItem value="Diretrizes">Diretrizes</SelectItem>
              <SelectItem value="Outro">Outro</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* List */}
        <div className="space-y-3">
          <AnimatePresence>
            {filteredManuais.map((manual, index) => {
              const isExpanded = expandedItems.includes(manual.id);

              return (
                <motion.div
                  key={manual.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.05 }}
                  className="rounded-2xl border border-slate-200 bg-white hover:shadow-lg hover:border-[#BFDDF7] transition-all"
                >
                  <div className="p-4 md:p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <h3 className="font-semibold text-[#0A0F1A] text-lg">
                            {manual.titulo}
                          </h3>

                          <Badge
                            className={`${
                              categoriaColors[manual.categoria] ||
                              categoriaColors.Outro
                            } border`}
                          >
                            {manual.categoria}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleExpand(manual.id)}
                          className="hover:bg-[#EAF4FF]"
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-[#185FA5]" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-[#185FA5]" />
                          )}
                        </Button>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="hover:bg-[#EAF4FF]"
                            >
                              <MoreVertical className="h-4 w-4 text-slate-500" />
                            </Button>
                          </DropdownMenuTrigger>

                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => openEditDialog(manual)}
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => deleteMutation.mutate(manual.id)}
                              className="text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="prose prose-sm max-w-none"
                      >
                        <p className="text-muted-foreground whitespace-pre-wrap">
                          {manual.conteudo}
                        </p>
                      </motion.div>
                    )}

                    {!isExpanded && (
                      <p className="text-muted-foreground text-sm line-clamp-2">
                        {manual.conteudo}
                      </p>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {filteredManuais.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <BookOpen className="h-12 w-12 mb-4 text-[#378ADD]/40" />
            <p className="text-lg">Nenhuma seção no manual</p>
          </div>
        )}

        {/* Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingItem ? 'Editar Seção' : 'Nova Seção'}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Título *</Label>

                <Input
                  value={formData.titulo}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      titulo: e.target.value,
                    })
                  }
                  placeholder="Ex: Código de Conduta"
                  required
                  className="focus-visible:ring-[#378ADD]/40"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Categoria</Label>

                  <Select
                    value={formData.categoria}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        categoria: value,
                      })
                    }
                  >
                    <SelectTrigger className="focus:ring-[#378ADD]/40">
                      <SelectValue />
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem value="Comportamento">
                        Comportamento
                      </SelectItem>
                      <SelectItem value="Processos">Processos</SelectItem>
                      <SelectItem value="Normas">Normas</SelectItem>
                      <SelectItem value="Diretrizes">Diretrizes</SelectItem>
                      <SelectItem value="Outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Ordem de Exibição</Label>

                  <Input
                    type="number"
                    value={formData.ordem}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        ordem: e.target.value,
                      })
                    }
                    placeholder="0"
                    className="focus-visible:ring-[#378ADD]/40"
                  />
                </div>
              </div>

              <div>
                <Label>Conteúdo *</Label>

                <Textarea
                  value={formData.conteudo}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      conteudo: e.target.value,
                    })
                  }
                  placeholder="Descreva as regras, comportamentos esperados, processos, etc..."
                  rows={10}
                  required
                  className="focus-visible:ring-[#378ADD]/40"
                />
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeDialog}
                >
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