import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { flowdesk } from '@/api/flowdeskClient';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import {
  Plus,
  Search,
  Library,
  FileCheck,
  Filter,
  BookOpen,
} from 'lucide-react';

import ModeloCard from '@/components/documentos/ModeloCard';
import ModeloFormDialog from '@/components/documentos/ModeloFormDialog';
import UsarModeloDialog from '@/components/documentos/UsarModeloDialog';
import DocumentosGeradosTab from '@/components/documentos/DocumentosGeradosTab';

const CATEGORIAS_PADRAO = [
  'Previdenciário',
  'Trabalhista',
  'Bancário',
  'Cível',
  'Administrativo',
  'Kit Judicial',
  'Ficha Questionário',
  'Rol de Testemunhas',
  'Simulação',
  'Solicitação de Prontuário',
  'Solicitação de Documentos',
  'Autodeclaração',
  'Outro',
];

function getAllCategorias(modelos) {
  const fromModelos = modelos.map((m) => m.categoria).filter(Boolean);
  return [...new Set([...CATEGORIAS_PADRAO, ...fromModelos])];
}

export default function GeradorDocumentos() {
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['current-user-gerador'],
    queryFn: () => flowdesk.auth.me(),
    staleTime: 5 * 60 * 1000,
  });

  const isAdmin = user?.role === 'admin';

  const [search, setSearch] = useState('');
  const [categoriaFilter, setCategoriaFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('ativo');

  const [formOpen, setFormOpen] = useState(false);
  const [editingModelo, setEditingModelo] = useState(null);
  const [usarModelo, setUsarModelo] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data: modelos = [], isLoading } = useQuery({
    queryKey: ['modelos-documento'],
    queryFn: () => flowdesk.entities.ModeloDocumento.list('-created_date', 200),
  });

  const createMutation = useMutation({
    mutationFn: (data) => flowdesk.entities.ModeloDocumento.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modelos-documento'] });
      setFormOpen(false);
      setEditingModelo(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => flowdesk.entities.ModeloDocumento.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modelos-documento'] });
      setFormOpen(false);
      setEditingModelo(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => flowdesk.entities.ModeloDocumento.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modelos-documento'] });
      setDeleteTarget(null);
    },
  });

  const handleSave = (data) => {
    if (editingModelo) {
      updateMutation.mutate({ id: editingModelo.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const filtered = useMemo(() => {
    return modelos.filter((m) => {
      const q = search.toLowerCase();

      const matchSearch =
        !q ||
        [m.nome, m.descricao, ...(m.tags || [])].some((v) =>
          (v || '').toLowerCase().includes(q)
        );

      const matchCat = !categoriaFilter || m.categoria === categoriaFilter;
      const matchStatus = !statusFilter || m.status === statusFilter;

      return matchSearch && matchCat && matchStatus;
    });
  }, [modelos, search, categoriaFilter, statusFilter]);

  const categoriaStats = useMemo(() => {
    return getAllCategorias(modelos)
      .map((cat) => ({
        nome: cat,
        count: modelos.filter(
          (m) => m.categoria === cat && m.status === 'ativo'
        ).length,
      }))
      .filter((c) => c.count > 0);
  }, [modelos]);

  const totalAtivos = modelos.filter((m) => m.status === 'ativo').length;

  return (
    <div className="min-h-screen bg-[#F4F6FA] p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#0A0F1A] md:text-3xl flex items-center gap-2">
              <Library className="h-7 w-7 text-[#378ADD]" />
              Gerador Inteligente de Documentos
            </h1>

            <p className="text-slate-500 mt-1">
              Biblioteca de modelos e geração de documentos do escritório
            </p>
          </div>

          {user && (
            <Button
              onClick={() => {
                setEditingModelo(null);
                setFormOpen(true);
              }}
              className="bg-[#378ADD] hover:bg-[#185FA5] text-white shadow-sm"
            >
              <Plus className="mr-2 h-4 w-4" />
              Anexar Modelo
            </Button>
          )}
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <p className="text-xs text-slate-500">Total de Modelos</p>
            <p className="text-2xl font-bold text-[#0A0F1A]">
              {modelos.length}
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <p className="text-xs text-slate-500">Modelos Ativos</p>
            <p className="text-2xl font-bold text-emerald-600">
              {totalAtivos}
            </p>
          </div>

          {categoriaStats.slice(0, 2).map((cat) => (
            <div
              key={cat.nome}
              className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm"
            >
              <p className="text-xs text-slate-500">{cat.nome}</p>
              <p className="text-2xl font-bold text-[#185FA5]">
                {cat.count}
              </p>
            </div>
          ))}
        </div>

        <Tabs defaultValue="biblioteca" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 bg-white border border-slate-200 rounded-2xl p-1 shadow-sm">
            <TabsTrigger
              value="biblioteca"
              className="gap-2 rounded-xl data-[state=active]:bg-[#378ADD] data-[state=active]:text-white data-[state=active]:shadow-sm"
            >
              <BookOpen className="h-4 w-4" />
              Biblioteca de Modelos
            </TabsTrigger>

            <TabsTrigger
              value="gerados"
              className="gap-2 rounded-xl data-[state=active]:bg-[#378ADD] data-[state=active]:text-white data-[state=active]:shadow-sm"
            >
              <FileCheck className="h-4 w-4" />
              Documentos Gerados
            </TabsTrigger>
          </TabsList>

          {/* Biblioteca */}
          <TabsContent value="biblioteca" className="space-y-4">

            {/* Filtros */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />

                <Input
                  placeholder="Buscar por nome, tags, descrição..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 border-slate-200 focus-visible:ring-[#378ADD]/40"
                />
              </div>

              <Select
                value={categoriaFilter || 'todas'}
                onValueChange={(value) =>
                  setCategoriaFilter(value === 'todas' ? '' : value)
                }
              >
                <SelectTrigger className="w-full md:w-48 border-slate-200 focus:ring-[#378ADD]/40">
                  <Filter className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="todas">Todas as categorias</SelectItem>
                  {getAllCategorias(modelos).map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={statusFilter || 'todos'}
                onValueChange={(value) =>
                  setStatusFilter(value === 'todos' ? '' : value)
                }
              >
                <SelectTrigger className="w-full md:w-36 border-slate-200 focus:ring-[#378ADD]/40">
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="ativo">Ativos</SelectItem>
                  <SelectItem value="inativo">Inativos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Categorias rápidas */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setCategoriaFilter('')}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  !categoriaFilter
                    ? 'bg-[#378ADD] text-white border-[#378ADD] shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-[#EAF4FF] hover:text-[#185FA5] hover:border-[#BFDDF7]'
                }`}
              >
                Todos ({modelos.filter((m) => m.status === 'ativo').length})
              </button>

              {categoriaStats.map((cat) => (
                <button
                  key={cat.nome}
                  onClick={() =>
                    setCategoriaFilter(
                      cat.nome === categoriaFilter ? '' : cat.nome
                    )
                  }
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    categoriaFilter === cat.nome
                      ? 'bg-[#378ADD] text-white border-[#378ADD] shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-[#EAF4FF] hover:text-[#185FA5] hover:border-[#BFDDF7]'
                  }`}
                >
                  {cat.nome} ({cat.count})
                </button>
              ))}
            </div>

            {/* Grid de modelos */}
            {isLoading ? (
              <div className="flex justify-center py-16">
                <div className="w-8 h-8 border-4 border-slate-200 border-t-[#378ADD] rounded-full animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <Library className="h-12 w-12 opacity-20 mb-3" />

                <p className="text-sm font-medium">
                  Nenhum modelo encontrado.
                </p>

                {user && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 border-[#BFDDF7] text-[#185FA5] hover:bg-[#EAF4FF]"
                    onClick={() => {
                      setEditingModelo(null);
                      setFormOpen(true);
                    }}
                  >
                    <Plus className="mr-2 h-3.5 w-3.5" />
                    Anexar primeiro modelo
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((modelo) => (
                  <ModeloCard
                    key={modelo.id}
                    modelo={modelo}
                    isAdmin={isAdmin}
                    onUsar={(m) => setUsarModelo(m)}
                    onEditar={(m) => {
                      setEditingModelo(m);
                      setFormOpen(true);
                    }}
                    onExcluir={(m) => setDeleteTarget(m)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Documentos Gerados */}
          <TabsContent value="gerados">
            <DocumentosGeradosTab />
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialogs */}
      <ModeloFormDialog
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingModelo(null);
        }}
        onSave={handleSave}
        modelo={editingModelo}
        user={user}
      />

      <UsarModeloDialog
        open={!!usarModelo}
        onClose={() => setUsarModelo(null)}
        modelo={usarModelo}
        user={user}
        onDocumentoGerado={() =>
          queryClient.invalidateQueries({ queryKey: ['documentos-gerados'] })
        }
      />

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir modelo?</AlertDialogTitle>

            <AlertDialogDescription>
              Tem certeza que deseja excluir{' '}
              <strong>"{deleteTarget?.nome}"</strong>? Esta ação não pode ser
              desfeita e o arquivo modelo será removido da biblioteca.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>

            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => deleteMutation.mutate(deleteTarget.id)}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}