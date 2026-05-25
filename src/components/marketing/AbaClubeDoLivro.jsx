import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { flowdesk } from '@/api/flowdeskClient';

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
  BookOpen,
} from 'lucide-react';

const CATEGORIAS = [
  'Manual',
  'Livro do Mês',
  'Material Complementar',
  'Regra',
  'Planejamento',
  'Outro',
];

const STATUS_LIST = [
  'Ativo',
  'Planejado',
  'Concluído',
  'Arquivado',
];

const statusColors = {
  Ativo:
    'bg-emerald-50 text-emerald-700 border-emerald-200',

  Planejado:
    'bg-[#EAF4FF] text-[#185FA5] border-[#BFDDF7]',

  Concluído:
    'bg-sky-50 text-sky-700 border-sky-200',

  Arquivado:
    'bg-slate-100 text-slate-600 border-slate-200',
};

const EMPTY = {
  titulo: '',
  categoria: 'Livro do Mês',
  descricao: '',
  data: '',
  link: '',
  status: 'Ativo',
  observacoes: '',
  anexos: [],
};

export default function AbaClubeDoLivro() {
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [filterCat, setFilterCat] = useState('all');
  const [form, setForm] = useState(EMPTY);
  const [uploading, setUploading] = useState(false);

  const { data: itens = [] } = useQuery({
    queryKey: ['clube-livro'],
    queryFn: () =>
      flowdesk.entities.ClubeDoLivro.list('-created_date'),
  });

  const createM = useMutation({
    mutationFn: (d) =>
      flowdesk.entities.ClubeDoLivro.create(d),

    onSuccess: () => {
      queryClient.invalidateQueries(['clube-livro']);
      closeForm();
    },
  });

  const updateM = useMutation({
    mutationFn: ({ id, data }) =>
      flowdesk.entities.ClubeDoLivro.update(id, data),

    onSuccess: () => {
      queryClient.invalidateQueries(['clube-livro']);
      closeForm();
    },
  });

  const deleteM = useMutation({
    mutationFn: (id) =>
      flowdesk.entities.ClubeDoLivro.delete(id),

    onSuccess: () =>
      queryClient.invalidateQueries(['clube-livro']),
  });

  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
    setForm(EMPTY);
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
    if (!form.titulo.trim()) return;

    editing
      ? updateM.mutate({
          id: editing.id,
          data: form,
        })
      : createM.mutate(form);
  };

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || []);

    if (!files.length) return;

    setUploading(true);

    const urls = [];

    for (const file of files) {
      const { file_url } =
        await flowdesk.integrations.Core.UploadFile({
          file,
        });

      urls.push(file_url);
    }

    setForm((p) => ({
      ...p,
      anexos: [...(p.anexos || []), ...urls],
    }));

    setUploading(false);
    e.target.value = '';
  };

  const filtered =
    filterCat === 'all'
      ? itens
      : itens.filter((i) => i.categoria === filterCat);

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-[#378ADD]" />
          Clube do Livro ({itens.length})
        </h3>

        <div className="flex gap-2 flex-wrap">

          <Select
            value={filterCat}
            onValueChange={setFilterCat}
          >
            <SelectTrigger className="w-40 h-8 text-xs border-slate-200 focus:ring-[#378ADD]/40">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="all">
                Todas
              </SelectItem>

              {CATEGORIAS.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            size="sm"
            className="bg-[#378ADD] hover:bg-[#185FA5] text-white"
            onClick={() => {
              setEditing(null);
              setShowForm(true);
            }}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Novo
          </Button>
        </div>
      </div>

      {/* Grid */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((item) => (
          <div
            key={item.id}
            className="rounded-2xl border border-slate-200 bg-white p-4 hover:shadow-md hover:border-[#BFDDF7] transition-all"
          >
            <div className="flex items-start justify-between gap-2 mb-2">

              <p className="font-semibold text-[#0A0F1A] text-sm flex-1">
                {item.titulo}
              </p>

              <div className="flex gap-1">

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 hover:bg-[#EAF4FF]"
                  onClick={() => openEdit(item)}
                >
                  <Pencil className="h-3.5 w-3.5 text-slate-600" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-red-400 hover:bg-red-50"
                  onClick={() => deleteM.mutate(item.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-1 mb-2">

              <Badge
                className={`text-xs border ${
                  statusColors[item.status] || ''
                }`}
              >
                {item.status}
              </Badge>

              <Badge
                variant="outline"
                className="text-xs"
              >
                {item.categoria}
              </Badge>
            </div>

            {item.data && (
              <p className="text-xs text-slate-500">
                📅 {item.data}
              </p>
            )}

            {item.descricao && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {item.descricao}
              </p>
            )}

            {item.link && (
              <a
                href={item.link}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-[#185FA5] hover:underline mt-1 block"
              >
                🔗 Acessar material
              </a>
            )}

            {item.anexos?.length > 0 && (
              <p className="text-xs text-slate-400 mt-1">
                <Paperclip className="inline h-3 w-3 mr-1" />
                {item.anexos.length} anexo(s)
              </p>
            )}
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-3 text-center text-slate-400 py-8 text-sm">
            Nenhum item cadastrado
          </div>
        )}
      </div>

      {/* Dialog */}
      <Dialog
        open={showForm}
        onOpenChange={(o) => !o && closeForm()}
      >
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing
                ? 'Editar Item'
                : 'Novo Item — Clube do Livro'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">

            <div>
              <Label>Título *</Label>

              <Input
                value={form.titulo}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    titulo: e.target.value,
                  }))
                }
                className="focus-visible:ring-[#378ADD]/40"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">

              <div>
                <Label>Categoria</Label>

                <Select
                  value={form.categoria}
                  onValueChange={(v) =>
                    setForm((p) => ({
                      ...p,
                      categoria: v,
                    }))
                  }
                >
                  <SelectTrigger className="focus:ring-[#378ADD]/40">
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    {CATEGORIAS.map((c) => (
                      <SelectItem
                        key={c}
                        value={c}
                      >
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
                    setForm((p) => ({
                      ...p,
                      status: v,
                    }))
                  }
                >
                  <SelectTrigger className="focus:ring-[#378ADD]/40">
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    {STATUS_LIST.map((s) => (
                      <SelectItem
                        key={s}
                        value={s}
                      >
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Data</Label>

                <Input
                  type="date"
                  value={form.data}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      data: e.target.value,
                    }))
                  }
                  className="focus-visible:ring-[#378ADD]/40"
                />
              </div>

              <div>
                <Label>Link</Label>

                <Input
                  value={form.link}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      link: e.target.value,
                    }))
                  }
                  placeholder="https://"
                  className="focus-visible:ring-[#378ADD]/40"
                />
              </div>
            </div>

            <div>
              <Label>Descrição</Label>

              <Textarea
                value={form.descricao}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    descricao: e.target.value,
                  }))
                }
                rows={2}
                className="focus-visible:ring-[#378ADD]/40"
              />
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
                rows={2}
                className="focus-visible:ring-[#378ADD]/40"
              />
            </div>

            {/* Upload */}
            <div>
              <Label>Anexos</Label>

              <label className="mt-1 flex items-center gap-2 cursor-pointer border border-dashed border-slate-300 rounded-xl p-3 hover:border-[#378ADD] hover:bg-[#EAF4FF] transition-all">
                <Upload className="h-4 w-4 text-slate-400" />

                <span className="text-sm text-slate-500">
                  {uploading
                    ? 'Enviando...'
                    : 'Selecionar arquivos'}
                </span>

                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleUpload}
                  disabled={uploading}
                />
              </label>

              {form.anexos?.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {form.anexos.map((url, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-1 border border-slate-200 rounded-lg px-2 py-1 bg-slate-50 text-xs"
                    >
                      <Paperclip className="h-3 w-3 text-slate-400" />

                      <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#185FA5] hover:underline"
                      >
                        Anexo {i + 1}
                      </a>

                      <button
                        onClick={() =>
                          setForm((p) => ({
                            ...p,
                            anexos: p.anexos.filter(
                              (_, idx) => idx !== i
                            ),
                          }))
                        }
                        className="text-red-400"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={closeForm}
              >
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