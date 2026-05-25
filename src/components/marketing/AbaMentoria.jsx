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
  GraduationCap,
  ExternalLink,
} from 'lucide-react';

const STATUS_LIST = [
  'Ativo',
  'Em preparação',
  'Concluído',
  'Pausado',
];

const statusColors = {
  Ativo:
    'bg-emerald-50 text-emerald-700 border border-emerald-200',

  'Em preparação':
    'bg-[#EAF4FF] text-[#185FA5] border border-[#BFDDF7]',

  Concluído:
    'bg-sky-50 text-sky-700 border border-sky-200',

  Pausado:
    'bg-amber-50 text-amber-700 border border-amber-200',
};

const EMPTY = {
  nome: '',
  descricao: '',
  status: 'Ativo',
  data: '',
  link_externo: '',
  observacoes: '',
  anexos: [],
  ordem: 0,
};

export default function AbaMentoria() {
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');

  const [form, setForm] = useState(EMPTY);

  const [uploading, setUploading] = useState(false);

  const { data: modulos = [] } = useQuery({
    queryKey: ['mentoria-modulos'],
    queryFn: () =>
      flowdesk.entities.MentoriaModulo.list('ordem'),
  });

  const createM = useMutation({
    mutationFn: (d) =>
      flowdesk.entities.MentoriaModulo.create(d),

    onSuccess: () => {
      queryClient.invalidateQueries([
        'mentoria-modulos',
      ]);

      closeForm();
    },
  });

  const updateM = useMutation({
    mutationFn: ({ id, data }) =>
      flowdesk.entities.MentoriaModulo.update(
        id,
        data
      ),

    onSuccess: () => {
      queryClient.invalidateQueries([
        'mentoria-modulos',
      ]);

      closeForm();
    },
  });

  const deleteM = useMutation({
    mutationFn: (id) =>
      flowdesk.entities.MentoriaModulo.delete(id),

    onSuccess: () =>
      queryClient.invalidateQueries([
        'mentoria-modulos',
      ]),
  });

  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
    setForm(EMPTY);
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
    if (!form.nome.trim()) return;

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
    filterStatus === 'all'
      ? modulos
      : modulos.filter(
          (m) => m.status === filterStatus
        );

  const stats = STATUS_LIST.map((s) => ({
    label: s,
    count: modulos.filter(
      (m) => m.status === s
    ).length,
  }));

  return (
    <div className="space-y-4">

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((s) => (
          <div
            key={s.label}
            onClick={() =>
              setFilterStatus(
                filterStatus === s.label
                  ? 'all'
                  : s.label
              )
            }
            className={`rounded-2xl p-3 text-center border cursor-pointer transition-all shadow-sm ${
              filterStatus === s.label
                ? 'ring-2 ring-[#378ADD]/40 border-[#378ADD]'
                : 'border-slate-200'
            } ${statusColors[s.label] || 'bg-slate-50 text-slate-600'}`}
          >
            <p className="text-xl font-bold">
              {s.count}
            </p>

            <p className="text-[10px] leading-tight">
              {s.label}
            </p>
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-[#378ADD]" />
          Módulos da Mentoria
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
          Novo Módulo
        </Button>
      </div>

      {/* Cards */}
      <div className="space-y-3">
        {filtered.map((modulo, i) => (
          <div
            key={modulo.id}
            className="rounded-2xl border border-slate-200 bg-white p-4 hover:shadow-sm hover:border-[#BFDDF7] transition-all"
          >
            <div className="flex items-start gap-4">

              <div className="flex-shrink-0 h-10 w-10 rounded-2xl bg-[#EAF4FF] border border-[#BFDDF7] flex items-center justify-center font-bold text-[#185FA5] text-sm">
                {modulo.ordem || i + 1}
              </div>

              <div className="flex-1 min-w-0">

                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <p className="font-semibold text-[#0A0F1A] text-sm">
                    {modulo.nome}
                  </p>

                  <Badge
                    className={`text-xs ${statusColors[modulo.status] || ''}`}
                  >
                    {modulo.status}
                  </Badge>
                </div>

                {modulo.data && (
                  <p className="text-xs text-slate-500 mb-1">
                    📅 {modulo.data}
                  </p>
                )}

                {modulo.descricao && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {modulo.descricao}
                  </p>
                )}

                {modulo.link_externo && (
                  <a
                    href={modulo.link_externo}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-xs text-[#185FA5] hover:underline mt-1"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Acessar material
                  </a>
                )}

                {modulo.anexos?.length > 0 && (
                  <p className="text-xs text-slate-400 mt-1">
                    <Paperclip className="inline h-3 w-3 mr-1" />
                    {modulo.anexos.length} anexo(s)
                  </p>
                )}
              </div>

              <div className="flex gap-1 flex-shrink-0">

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 hover:bg-[#EAF4FF]"
                  onClick={() => openEdit(modulo)}
                >
                  <Pencil className="h-3.5 w-3.5 text-slate-600" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-red-400 hover:bg-red-50"
                  onClick={() =>
                    deleteM.mutate(modulo.id)
                  }
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <p className="text-center text-slate-400 py-8 text-sm">
            Nenhum módulo cadastrado
          </p>
        )}
      </div>

      {/* Dialog */}
      <Dialog
        open={showForm}
        onOpenChange={(o) =>
          !o && closeForm()
        }
      >
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing
                ? 'Editar Módulo'
                : 'Novo Módulo — Mentoria'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">

            <div>
              <Label>Nome *</Label>

              <Input
                value={form.nome}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    nome: e.target.value,
                  }))
                }
                className="focus-visible:ring-[#378ADD]/40"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">

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
                <Label>Ordem</Label>

                <Input
                  type="number"
                  value={form.ordem}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      ordem: Number(
                        e.target.value
                      ),
                    }))
                  }
                  className="focus-visible:ring-[#378ADD]/40"
                />
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
                <Label>Link Externo</Label>

                <Input
                  value={form.link_externo}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      link_externo:
                        e.target.value,
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
                    descricao:
                      e.target.value,
                  }))
                }
                rows={3}
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
                    observacoes:
                      e.target.value,
                  }))
                }
                rows={2}
                className="focus-visible:ring-[#378ADD]/40"
              />
            </div>

            {/* Upload */}
            <div>
              <Label>Materiais / Anexos</Label>

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
                            anexos:
                              p.anexos.filter(
                                (_, idx) =>
                                  idx !== i
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
                {editing
                  ? 'Atualizar'
                  : 'Criar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}