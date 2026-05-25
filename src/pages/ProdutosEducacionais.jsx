import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { flowdesk } from '@/api/flowdeskClient';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
  Plus,
  Pencil,
  Trash2,
  Upload,
  Paperclip,
  X,
  ExternalLink,
  BookOpen,
  GraduationCap,
  Star,
  Package,
  TrendingUp,
  ShoppingBag,
} from 'lucide-react';

async function uploadMultipleFiles(files) {
  const urls = [];

  for (const file of files) {
    const { file_url } = await flowdesk.integrations.Core.UploadFile({ file });
    urls.push(file_url);
  }

  return urls;
}

/* ───────────────────────────────────────────── */
/* ANEXOS UPLOAD */
/* ───────────────────────────────────────────── */

function AnexosUpload({ anexos = [], onChange }) {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || []);

    if (!files.length) return;

    setUploading(true);

    const urls = await uploadMultipleFiles(files);

    onChange([...anexos, ...urls]);

    setUploading(false);
    e.target.value = '';
  };

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 cursor-pointer border border-dashed border-slate-300 rounded-xl p-3 hover:border-[#BFDDF7] hover:bg-[#EAF4FF] transition-colors">
        <Upload className="h-4 w-4 text-slate-400" />

        <span className="text-sm text-slate-500">
          {uploading ? 'Enviando...' : 'Selecionar arquivos (múltiplos)'}
        </span>

        <input
          type="file"
          multiple
          className="hidden"
          onChange={handleUpload}
          disabled={uploading}
          accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
        />
      </label>

      {anexos.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {anexos.map((url, i) => (
            <div
              key={i}
              className="flex items-center gap-1 border border-slate-200 rounded-lg px-2 py-1 bg-slate-50 text-xs"
            >
              <Paperclip className="h-3 w-3 text-slate-400" />

              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="text-[#185FA5] hover:underline max-w-[120px] truncate"
              >
                Anexo {i + 1}
              </a>

              <button
                type="button"
                onClick={() => onChange(anexos.filter((_, idx) => idx !== i))}
                className="text-red-400 hover:text-red-600"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ───────────────────────────────────────────── */
/* ABA MENTORIA */
/* ───────────────────────────────────────────── */

function AbaMentoria() {
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const [form, setForm] = useState({
    nome: '',
    descricao: '',
    status: 'Ativo',
    data: '',
    link_externo: '',
    observacoes: '',
    anexos: [],
    ordem: 0,
  });

  const { data: modulos = [] } = useQuery({
    queryKey: ['mentoria-modulos'],
    queryFn: () => flowdesk.entities.MentoriaModulo.list('ordem'),
  });

  const createMutation = useMutation({
    mutationFn: (d) => flowdesk.entities.MentoriaModulo.create(d),
    onSuccess: () => {
      queryClient.invalidateQueries(['mentoria-modulos']);
      closeForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => flowdesk.entities.MentoriaModulo.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['mentoria-modulos']);
      closeForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => flowdesk.entities.MentoriaModulo.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['mentoria-modulos']),
  });

  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
    setForm({
      nome: '',
      descricao: '',
      status: 'Ativo',
      data: '',
      link_externo: '',
      observacoes: '',
      anexos: [],
      ordem: 0,
    });
  };

  const openEdit = (item) => {
    setEditing(item);

    setForm({
      nome: item.nome || '',
      descricao: item.descricao || '',
      status: item.status || 'Ativo',
      data: item.data || '',
      link_externo: item.link_externo || '',
      observacoes: item.observacoes || '',
      anexos: item.anexos || [],
      ordem: item.ordem || 0,
    });

    setShowForm(true);
  };

  const save = () => {
    if (!form.nome.trim()) return alert('Nome obrigatório');

    editing
      ? updateMutation.mutate({ id: editing.id, data: form })
      : createMutation.mutate(form);
  };

  const statusColors = {
    Ativo: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'Em preparação': 'bg-amber-50 text-amber-700 border-amber-200',
    Concluído: 'bg-slate-100 text-slate-600 border-slate-200',
    Pausado: 'bg-red-50 text-red-700 border-red-200',
  };

  return (
    <div className="space-y-4">

      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-[#378ADD]" />
            Mentoria Método Result
          </h3>

          <p className="text-xs text-muted-foreground mt-0.5">
            Módulos, materiais e cronograma da mentoria
          </p>
        </div>

        <Button
          size="sm"
          className="bg-[#378ADD] hover:bg-[#185FA5] text-white shadow-sm"
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Novo Módulo
        </Button>
      </div>

      {modulos.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <GraduationCap className="h-12 w-12 mb-3 opacity-20" />
          <p className="text-sm">Nenhum módulo cadastrado ainda</p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {modulos.map((m, i) => (
          <div
            key={m.id}
            className="rounded-2xl border border-border bg-card p-4 hover:shadow-sm transition-shadow"
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#185FA5] bg-[#EAF4FF] border border-[#BFDDF7] rounded-full h-6 w-6 flex items-center justify-center">
                  {m.ordem || i + 1}
                </span>

                <p className="font-semibold text-foreground text-sm">
                  {m.nome}
                </p>
              </div>

              <div className="flex gap-1 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 hover:bg-[#EAF4FF]"
                  onClick={() => openEdit(m)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                  onClick={() => deleteMutation.mutate(m.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {m.status && (
              <Badge className={`text-xs mb-2 border ${statusColors[m.status] || ''}`}>
                {m.status}
              </Badge>
            )}

            {m.descricao && (
              <p className="text-sm text-muted-foreground line-clamp-3 mb-2">
                {m.descricao}
              </p>
            )}

            {m.data && (
              <p className="text-xs text-slate-400 mb-1">📅 {m.data}</p>
            )}

            {m.link_externo && (
              <a
                href={m.link_externo}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-xs text-[#185FA5] hover:underline mb-1"
              >
                <ExternalLink className="h-3 w-3" />
                Link externo
              </a>
            )}

            {m.observacoes && (
              <p className="text-xs text-slate-500 italic border-t border-border pt-2 mt-2">
                {m.observacoes}
              </p>
            )}

            {m.anexos?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-border">
                {m.anexos.map((url, idx) => (
                  <a
                    key={idx}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-xs text-[#185FA5] border border-[#BFDDF7] rounded px-2 py-0.5 bg-[#EAF4FF] hover:bg-[#DDEFFF]"
                  >
                    <Paperclip className="h-2.5 w-2.5" />
                    Anexo {idx + 1}
                  </a>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <Dialog open={showForm} onOpenChange={(o) => !o && closeForm()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? 'Editar Módulo' : 'Novo Módulo da Mentoria'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Nome do Módulo *</Label>
                <Input
                  value={form.nome}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, nome: e.target.value }))
                  }
                  placeholder="Ex: Módulo 1 - Fundamentos"
                />
              </div>

              <div>
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) =>
                    setForm((p) => ({ ...p, status: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    {['Ativo', 'Em preparação', 'Concluído', 'Pausado'].map(
                      (s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Data</Label>
                <Input
                  type="date"
                  value={form.data}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, data: e.target.value }))
                  }
                />
              </div>

              <div>
                <Label>Ordem</Label>
                <Input
                  type="number"
                  value={form.ordem}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      ordem: Number(e.target.value),
                    }))
                  }
                />
              </div>

              <div>
                <Label>Link Externo</Label>
                <Input
                  value={form.link_externo}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, link_externo: e.target.value }))
                  }
                  placeholder="https://"
                />
              </div>
            </div>

            <div>
              <Label>Descrição / Resumo</Label>
              <Textarea
                value={form.descricao}
                onChange={(e) =>
                  setForm((p) => ({ ...p, descricao: e.target.value }))
                }
                rows={3}
              />
            </div>

            <div>
              <Label>Observações internas</Label>
              <Textarea
                value={form.observacoes}
                onChange={(e) =>
                  setForm((p) => ({ ...p, observacoes: e.target.value }))
                }
                rows={2}
              />
            </div>

            <div>
              <Label>Documentos e Anexos</Label>
              <AnexosUpload
                anexos={form.anexos}
                onChange={(urls) =>
                  setForm((p) => ({ ...p, anexos: urls }))
                }
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={closeForm}>
                Cancelar
              </Button>

              <Button
                className="bg-[#378ADD] hover:bg-[#185FA5] text-white"
                onClick={save}
              >
                {editing ? 'Atualizar' : 'Criar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ───────────────────────────────────────────── */
/* ABA LIVRO */
/* ───────────────────────────────────────────── */

function AbaLivro() {
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const [form, setForm] = useState({
    nome: '',
    formato: 'Físico',
    quantidade_estoque: 0,
    quantidade_vendida: 0,
    valor_unitario: 0,
    plataforma: '',
    link_plataforma: '',
    lp_pagina_vendas: '',
    status: 'Ativo',
    observacoes: '',
    anexos: [],
    data_atualizacao: '',
  });

  const { data: livros = [] } = useQuery({
    queryKey: ['livros-venda'],
    queryFn: () => flowdesk.entities.LivroVenda.list('-created_date'),
  });

  const createMutation = useMutation({
    mutationFn: (d) => flowdesk.entities.LivroVenda.create(d),
    onSuccess: () => {
      queryClient.invalidateQueries(['livros-venda']);
      closeForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => flowdesk.entities.LivroVenda.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['livros-venda']);
      closeForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => flowdesk.entities.LivroVenda.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['livros-venda']),
  });

  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
  };

  const openEdit = (item) => {
    setEditing(item);

    setForm({
      nome: item.nome || '',
      formato: item.formato || 'Físico',
      quantidade_estoque: item.quantidade_estoque || 0,
      quantidade_vendida: item.quantidade_vendida || 0,
      valor_unitario: item.valor_unitario || 0,
      plataforma: item.plataforma || '',
      link_plataforma: item.link_plataforma || '',
      lp_pagina_vendas: item.lp_pagina_vendas || '',
      status: item.status || 'Ativo',
      observacoes: item.observacoes || '',
      anexos: item.anexos || [],
      data_atualizacao: item.data_atualizacao || '',
    });

    setShowForm(true);
  };

  const save = () => {
    if (!form.nome.trim()) return alert('Nome obrigatório');

    editing
      ? updateMutation.mutate({ id: editing.id, data: form })
      : createMutation.mutate(form);
  };

  const totalVendido = livros.reduce(
    (s, l) => s + (l.quantidade_vendida || 0),
    0
  );

  const totalEstoque = livros.reduce(
    (s, l) => s + (l.quantidade_estoque || 0),
    0
  );

  const plataformasAtivas = [
    ...new Set(
      livros
        .filter((l) => l.status === 'Ativo' && l.plataforma)
        .map((l) => l.plataforma)
    ),
  ].length;

  const statusColors = {
    Ativo: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'Em preparação': 'bg-amber-50 text-amber-700 border-amber-200',
    Indisponível: 'bg-slate-100 text-slate-600 border-slate-200',
    Esgotado: 'bg-red-50 text-red-700 border-red-200',
  };

  const cards = [
    {
      label: 'Total Vendido',
      value: totalVendido,
      icon: TrendingUp,
      box: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
    {
      label: 'Estoque Atual',
      value: totalEstoque,
      icon: Package,
      box: 'bg-[#EAF4FF] text-[#185FA5] border-[#BFDDF7]',
    },
    {
      label: 'Plataformas Ativas',
      value: plataformasAtivas,
      icon: ShoppingBag,
      box: 'bg-sky-50 text-sky-700 border-sky-200',
    },
    {
      label: 'Produtos Cadastrados',
      value: livros.length,
      icon: BookOpen,
      box: 'bg-slate-100 text-slate-700 border-slate-200',
    },
  ];

  return (
    <div className="space-y-5">

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm"
          >
            <div className={`inline-flex rounded-xl border p-2 mb-2 ${card.box}`}>
              <card.icon className="h-4 w-4" />
            </div>

            <p className="text-2xl font-bold text-slate-800">{card.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-[#378ADD]" />
          Controle do Livro
        </h3>

        <Button
          size="sm"
          className="bg-[#378ADD] hover:bg-[#185FA5] text-white"
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Novo Produto
        </Button>
      </div>

      {livros.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <BookOpen className="h-12 w-12 mb-3 opacity-20" />
          <p className="text-sm">Nenhum produto cadastrado ainda</p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {livros.map((livro) => (
          <div
            key={livro.id}
            className="rounded-2xl border border-border bg-card p-4 hover:shadow-sm transition-shadow"
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <p className="font-semibold text-foreground">{livro.nome}</p>

                {livro.formato && (
                  <span className="text-xs text-slate-500">
                    {livro.formato}
                  </span>
                )}
              </div>

              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 hover:bg-[#EAF4FF]"
                  onClick={() => openEdit(livro)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                  onClick={() => deleteMutation.mutate(livro.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {livro.status && (
              <Badge
                className={`text-xs mb-3 border ${statusColors[livro.status] || ''}`}
              >
                {livro.status}
              </Badge>
            )}

            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="text-center bg-slate-50 rounded-xl p-2">
                <p className="text-xs text-slate-500">Estoque</p>
                <p className="font-bold text-slate-800">
                  {livro.quantidade_estoque || 0}
                </p>
              </div>

              <div className="text-center bg-emerald-50 rounded-xl p-2">
                <p className="text-xs text-slate-500">Vendidos</p>
                <p className="font-bold text-emerald-700">
                  {livro.quantidade_vendida || 0}
                </p>
              </div>

              <div className="text-center bg-[#EAF4FF] rounded-xl p-2">
                <p className="text-xs text-slate-500">Valor</p>
                <p className="font-bold text-[#185FA5]">
                  R${(livro.valor_unitario || 0).toFixed(0)}
                </p>
              </div>
            </div>

            {livro.plataforma && (
              <p className="text-xs text-slate-500 mb-1">
                🛒 {livro.plataforma}
              </p>
            )}

            {livro.link_plataforma && (
              <a
                href={livro.link_plataforma}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-xs text-[#185FA5] hover:underline mb-1"
              >
                <ExternalLink className="h-3 w-3" />
                Link da plataforma
              </a>
            )}

            {livro.lp_pagina_vendas && (
              <a
                href={livro.lp_pagina_vendas}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-xs text-[#185FA5] hover:underline mb-1"
              >
                <ExternalLink className="h-3 w-3" />
                Página de vendas
              </a>
            )}

            {livro.observacoes && (
              <p className="text-xs text-slate-500 italic border-t border-border pt-2 mt-2 line-clamp-2">
                {livro.observacoes}
              </p>
            )}

            {livro.anexos?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-border">
                {livro.anexos.map((url, i) => (
                  <a
                    key={i}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-xs text-[#185FA5] border border-[#BFDDF7] rounded px-2 py-0.5 bg-[#EAF4FF]"
                  >
                    <Paperclip className="h-2.5 w-2.5" />
                    Anexo {i + 1}
                  </a>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <Dialog open={showForm} onOpenChange={(o) => !o && closeForm()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? 'Editar Produto' : 'Novo Produto'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">

              <div className="col-span-2">
                <Label>Nome do Produto *</Label>
                <Input
                  value={form.nome}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, nome: e.target.value }))
                  }
                />
              </div>

              <div>
                <Label>Formato</Label>
                <Select
                  value={form.formato}
                  onValueChange={(v) =>
                    setForm((p) => ({ ...p, formato: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    {['Físico', 'Digital', 'Outro'].map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) =>
                    setForm((p) => ({ ...p, status: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    {['Ativo', 'Em preparação', 'Indisponível', 'Esgotado'].map(
                      (s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Estoque</Label>
                <Input
                  type="number"
                  value={form.quantidade_estoque}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      quantidade_estoque: Number(e.target.value),
                    }))
                  }
                />
              </div>

              <div>
                <Label>Qtd. Vendida</Label>
                <Input
                  type="number"
                  value={form.quantidade_vendida}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      quantidade_vendida: Number(e.target.value),
                    }))
                  }
                />
              </div>

              <div>
                <Label>Valor Unitário (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.valor_unitario}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      valor_unitario: Number(e.target.value),
                    }))
                  }
                />
              </div>

              <div>
                <Label>Data de Atualização</Label>
                <Input
                  type="date"
                  value={form.data_atualizacao}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      data_atualizacao: e.target.value,
                    }))
                  }
                />
              </div>

              <div>
                <Label>Plataforma de Venda</Label>
                <Input
                  value={form.plataforma}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      plataforma: e.target.value,
                    }))
                  }
                  placeholder="Ex: Hotmart, Amazon..."
                />
              </div>

              <div>
                <Label>Link da Plataforma</Label>
                <Input
                  value={form.link_plataforma}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      link_plataforma: e.target.value,
                    }))
                  }
                  placeholder="https://"
                />
              </div>

              <div className="col-span-2">
                <Label>LP / Página de Vendas</Label>
                <Input
                  value={form.lp_pagina_vendas}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      lp_pagina_vendas: e.target.value,
                    }))
                  }
                  placeholder="https://"
                />
              </div>
            </div>

            <div>
              <Label>Observações</Label>
              <Textarea
                value={form.observacoes}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    observacoes: e.target.value,
                  }))
                }
                rows={3}
              />
            </div>

            <div>
              <Label>Anexos</Label>
              <AnexosUpload
                anexos={form.anexos}
                onChange={(urls) =>
                  setForm((p) => ({ ...p, anexos: urls }))
                }
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={closeForm}>
                Cancelar
              </Button>

              <Button
                className="bg-[#378ADD] hover:bg-[#185FA5] text-white"
                onClick={save}
              >
                {editing ? 'Atualizar' : 'Criar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ───────────────────────────────────────────── */
/* ABA CLUBE DO LIVRO */
/* ───────────────────────────────────────────── */

function AbaClubeDoLivro() {
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [catFilter, setCatFilter] = useState('all');

  const [form, setForm] = useState({
    titulo: '',
    categoria: 'Livro do Mês',
    descricao: '',
    data: '',
    link: '',
    status: 'Ativo',
    observacoes: '',
    anexos: [],
  });

  const { data: itens = [] } = useQuery({
    queryKey: ['clube-livro'],
    queryFn: () => flowdesk.entities.ClubeDoLivro.list('-created_date'),
  });

  const createMutation = useMutation({
    mutationFn: (d) => flowdesk.entities.ClubeDoLivro.create(d),
    onSuccess: () => {
      queryClient.invalidateQueries(['clube-livro']);
      closeForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => flowdesk.entities.ClubeDoLivro.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['clube-livro']);
      closeForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => flowdesk.entities.ClubeDoLivro.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['clube-livro']),
  });

  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
    setForm({
      titulo: '',
      categoria: 'Livro do Mês',
      descricao: '',
      data: '',
      link: '',
      status: 'Ativo',
      observacoes: '',
      anexos: [],
    });
  };

  const openEdit = (item) => {
    setEditing(item);

    setForm({
      titulo: item.titulo || '',
      categoria: item.categoria || 'Livro do Mês',
      descricao: item.descricao || '',
      data: item.data || '',
      link: item.link || '',
      status: item.status || 'Ativo',
      observacoes: item.observacoes || '',
      anexos: item.anexos || [],
    });

    setShowForm(true);
  };

  const save = () => {
    if (!form.titulo.trim()) return alert('Título obrigatório');

    editing
      ? updateMutation.mutate({ id: editing.id, data: form })
      : createMutation.mutate(form);
  };

  const CATEGORIAS = [
    'Manual',
    'Livro do Mês',
    'Material Complementar',
    'Regra',
    'Planejamento',
    'Outro',
  ];

  const catColors = {
    Manual: 'bg-[#EAF4FF] text-[#185FA5] border-[#BFDDF7]',
    'Livro do Mês': 'bg-sky-50 text-sky-700 border-sky-200',
    'Material Complementar': 'bg-amber-50 text-amber-700 border-amber-200',
    Regra: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    Planejamento: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Outro: 'bg-slate-100 text-slate-600 border-slate-200',
  };

  const filtered =
    catFilter === 'all'
      ? itens
      : itens.filter((i) => i.categoria === catFilter);

  return (
    <div className="space-y-4">

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Star className="h-5 w-5 text-[#378ADD]" />
            Clube do Livro
          </h3>

          <p className="text-xs text-muted-foreground mt-0.5">
            Manuais, livros do mês, materiais e planejamento
          </p>
        </div>

        <Button
          size="sm"
          className="bg-[#378ADD] hover:bg-[#185FA5] text-white"
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Novo Item
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {['all', ...CATEGORIAS].map((cat) => (
          <button
            key={cat}
            onClick={() => setCatFilter(cat)}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${
              catFilter === cat
                ? 'bg-[#378ADD] text-white border-[#378ADD]'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-[#EAF4FF] hover:border-[#BFDDF7] hover:text-[#185FA5]'
            }`}
          >
            {cat === 'all' ? 'Todos' : cat}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <Star className="h-12 w-12 mb-3 opacity-20" />
          <p className="text-sm">Nenhum item cadastrado</p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((item) => (
          <div
            key={item.id}
            className="rounded-2xl border border-border bg-card p-4 hover:shadow-sm transition-shadow"
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground text-sm leading-snug">
                  {item.titulo}
                </p>
              </div>

              <div className="flex gap-1 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 hover:bg-[#EAF4FF]"
                  onClick={() => openEdit(item)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                  onClick={() => deleteMutation.mutate(item.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-1 mb-2 flex-wrap">
              {item.categoria && (
                <Badge
                  className={`text-xs border ${
                    catColors[item.categoria] ||
                    'bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  {item.categoria}
                </Badge>
              )}

              {item.status && item.status !== 'Ativo' && (
                <Badge variant="outline" className="text-xs">
                  {item.status}
                </Badge>
              )}
            </div>

            {item.descricao && (
              <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                {item.descricao}
              </p>
            )}

            {item.data && (
              <p className="text-xs text-slate-400 mb-1">📅 {item.data}</p>
            )}

            {item.link && (
              <a
                href={item.link}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-xs text-[#185FA5] hover:underline mb-1"
              >
                <ExternalLink className="h-3 w-3" />
                Link
              </a>
            )}

            {item.observacoes && (
              <p className="text-xs text-slate-500 italic border-t border-border pt-2 mt-2 line-clamp-2">
                {item.observacoes}
              </p>
            )}

            {item.anexos?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-border">
                {item.anexos.map((url, i) => (
                  <a
                    key={i}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-xs text-[#185FA5] border border-[#BFDDF7] rounded px-2 py-0.5 bg-[#EAF4FF]"
                  >
                    <Paperclip className="h-2.5 w-2.5" />
                    Anexo {i + 1}
                  </a>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <Dialog open={showForm} onOpenChange={(o) => !o && closeForm()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? 'Editar Item' : 'Novo Item do Clube'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">

            <div>
              <Label>Título *</Label>
              <Input
                value={form.titulo}
                onChange={(e) =>
                  setForm((p) => ({ ...p, titulo: e.target.value }))
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Categoria</Label>
                <Select
                  value={form.categoria}
                  onValueChange={(v) =>
                    setForm((p) => ({ ...p, categoria: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    {CATEGORIAS.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) =>
                    setForm((p) => ({ ...p, status: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    {['Ativo', 'Planejado', 'Concluído', 'Arquivado'].map(
                      (s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Data</Label>
              <Input
                type="date"
                value={form.data}
                onChange={(e) =>
                  setForm((p) => ({ ...p, data: e.target.value }))
                }
              />
            </div>

            <div>
              <Label>Link</Label>
              <Input
                value={form.link}
                onChange={(e) =>
                  setForm((p) => ({ ...p, link: e.target.value }))
                }
                placeholder="https://"
              />
            </div>

            <div>
              <Label>Descrição</Label>
              <Textarea
                value={form.descricao}
                onChange={(e) =>
                  setForm((p) => ({ ...p, descricao: e.target.value }))
                }
                rows={3}
              />
            </div>

            <div>
              <Label>Observações</Label>
              <Textarea
                value={form.observacoes}
                onChange={(e) =>
                  setForm((p) => ({ ...p, observacoes: e.target.value }))
                }
                rows={2}
              />
            </div>

            <div>
              <Label>Anexos</Label>
              <AnexosUpload
                anexos={form.anexos}
                onChange={(urls) =>
                  setForm((p) => ({ ...p, anexos: urls }))
                }
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={closeForm}>
                Cancelar
              </Button>

              <Button
                className="bg-[#378ADD] hover:bg-[#185FA5] text-white"
                onClick={save}
              >
                {editing ? 'Atualizar' : 'Criar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ───────────────────────────────────────────── */
/* MAIN PAGE */
/* ───────────────────────────────────────────── */

export default function ProdutosEducacionais() {
  return (
    <div className="min-h-screen bg-[#F4F6FA] p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">

        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-[#378ADD] p-3 shadow-sm">
            <GraduationCap className="h-7 w-7 text-white" />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-[#0A0F1A]">
              Livro, Mentoria & Clube do Livro
            </h1>

            <p className="text-sm text-muted-foreground">
              Produtos e projetos educacionais MCR Advocacia
            </p>
          </div>
        </div>

        <Tabs defaultValue="mentoria" className="space-y-4">

          <TabsList className="flex flex-wrap h-auto gap-1 bg-white border border-slate-200 p-1 rounded-2xl shadow-sm">

            <TabsTrigger
              value="mentoria"
              className="text-sm data-[state=active]:bg-[#378ADD] data-[state=active]:text-white rounded-xl px-4"
            >
              🎓 Mentoria
            </TabsTrigger>

            <TabsTrigger
              value="livro"
              className="text-sm data-[state=active]:bg-[#378ADD] data-[state=active]:text-white rounded-xl px-4"
            >
              📚 Livro
            </TabsTrigger>

            <TabsTrigger
              value="clube"
              className="text-sm data-[state=active]:bg-[#378ADD] data-[state=active]:text-white rounded-xl px-4"
            >
              ⭐ Clube do Livro
            </TabsTrigger>
          </TabsList>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 md:p-6 shadow-sm">
            <TabsContent value="mentoria">
              <AbaMentoria />
            </TabsContent>

            <TabsContent value="livro">
              <AbaLivro />
            </TabsContent>

            <TabsContent value="clube">
              <AbaClubeDoLivro />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}