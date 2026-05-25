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
  Instagram,
  Users,
} from 'lucide-react';

const TIPOS = [
  'Conta Principal',
  'Mentoria',
  'Clube do Livro',
  'Canal WhatsApp',
  'Outro',
];

const STATUS_LIST = [
  'Ativo',
  'Pausado',
  'Planejado',
];

const statusColors = {
  Ativo:
    'bg-emerald-50 text-emerald-700 border border-emerald-200',

  Pausado:
    'bg-amber-50 text-amber-700 border border-amber-200',

  Planejado:
    'bg-[#EAF4FF] text-[#185FA5] border border-[#BFDDF7]',
};

const EMPTY = {
  nome: '',
  tipo: 'Conta Principal',
  arroba: '',
  frequencia_postagem: '',
  responsavel: '',
  conteudos_enviados: 0,
  status: 'Ativo',
  observacoes: '',
};

export default function AbaInstagramCanais() {
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const [form, setForm] = useState(EMPTY);

  const { data: canais = [] } = useQuery({
    queryKey: ['instagram-canais'],
    queryFn: () =>
      flowdesk.entities.InstagramCanal.list(
        '-created_date'
      ),
  });

  const createM = useMutation({
    mutationFn: (d) =>
      flowdesk.entities.InstagramCanal.create(d),

    onSuccess: () => {
      queryClient.invalidateQueries([
        'instagram-canais',
      ]);

      closeForm();
    },
  });

  const updateM = useMutation({
    mutationFn: ({ id, data }) =>
      flowdesk.entities.InstagramCanal.update(
        id,
        data
      ),

    onSuccess: () => {
      queryClient.invalidateQueries([
        'instagram-canais',
      ]);

      closeForm();
    },
  });

  const deleteM = useMutation({
    mutationFn: (id) =>
      flowdesk.entities.InstagramCanal.delete(id),

    onSuccess: () =>
      queryClient.invalidateQueries([
        'instagram-canais',
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
      tipo: item.tipo || 'Conta Principal',
      arroba: item.arroba || '',
      frequencia_postagem:
        item.frequencia_postagem || '',
      responsavel: item.responsavel || '',
      conteudos_enviados:
        item.conteudos_enviados || 0,
      status: item.status || 'Ativo',
      observacoes: item.observacoes || '',
    });

    setShowForm(true);
  };

  const save = () => {
    if (!form.nome.trim()) return;

    if (editing) {
      updateM.mutate({
        id: editing.id,
        data: form,
      });
    } else {
      createM.mutate(form);
    }
  };

  return (
    <div className="space-y-4">

      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <Instagram className="h-5 w-5 text-[#378ADD]" />
          Contas & Canais
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
          Nova Conta
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {canais.map((canal) => (
          <div
            key={canal.id}
            className="rounded-2xl border border-slate-200 bg-white p-4 hover:shadow-md hover:border-[#BFDDF7] transition-all"
          >
            <div className="flex items-start justify-between gap-2 mb-3">

              <div>
                <p className="font-semibold text-[#0A0F1A] text-sm">
                  {canal.nome}
                </p>

                {canal.arroba && (
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                    <Instagram className="h-3 w-3" />
                    {canal.arroba}
                  </p>
                )}
              </div>

              <div className="flex gap-1">

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 hover:bg-[#EAF4FF]"
                  onClick={() => openEdit(canal)}
                >
                  <Pencil className="h-3.5 w-3.5 text-slate-600" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-red-400 hover:bg-red-50"
                  onClick={() =>
                    deleteM.mutate(canal.id)
                  }
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-1 mb-3">

              <Badge
                className={`text-xs ${statusColors[canal.status] || ''}`}
              >
                {canal.status}
              </Badge>

              <Badge
                variant="outline"
                className="text-xs"
              >
                {canal.tipo}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-2">

              <div className="bg-[#EAF4FF] border border-[#BFDDF7] rounded-xl p-3 text-center">
                <p className="text-xs text-slate-500">
                  Conteúdos
                </p>

                <p className="font-bold text-[#185FA5] text-lg">
                  {canal.conteudos_enviados || 0}
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                <p className="text-xs text-slate-500">
                  Frequência
                </p>

                <p className="text-xs font-semibold text-slate-700 mt-1">
                  {canal.frequencia_postagem ||
                    'Não definida'}
                </p>
              </div>
            </div>

            {canal.responsavel && (
              <p className="text-xs text-slate-500 mt-3 flex items-center gap-1">
                <Users className="h-3 w-3" />
                {canal.responsavel}
              </p>
            )}

            {canal.observacoes && (
              <p className="text-xs text-slate-500 italic mt-2 line-clamp-2">
                {canal.observacoes}
              </p>
            )}
          </div>
        ))}

        {canais.length === 0 && (
          <div className="col-span-3 text-center text-slate-400 py-8 text-sm">
            Nenhuma conta cadastrada
          </div>
        )}
      </div>

      <Dialog
        open={showForm}
        onOpenChange={(o) =>
          !o && closeForm()
        }
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {editing
                ? 'Editar Conta'
                : 'Nova Conta'}
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
                <Label>Tipo</Label>

                <Select
                  value={form.tipo}
                  onValueChange={(v) =>
                    setForm((p) => ({
                      ...p,
                      tipo: v,
                    }))
                  }
                >
                  <SelectTrigger className="focus:ring-[#378ADD]/40">
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    {TIPOS.map((t) => (
                      <SelectItem
                        key={t}
                        value={t}
                      >
                        {t}
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
                <Label>@ / Handle</Label>

                <Input
                  value={form.arroba}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      arroba: e.target.value,
                    }))
                  }
                  placeholder="@perfil"
                  className="focus-visible:ring-[#378ADD]/40"
                />
              </div>

              <div>
                <Label>Frequência</Label>

                <Input
                  value={form.frequencia_postagem}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      frequencia_postagem:
                        e.target.value,
                    }))
                  }
                  placeholder="Ex: Diário"
                  className="focus-visible:ring-[#378ADD]/40"
                />
              </div>

              <div>
                <Label>Responsável</Label>

                <Input
                  value={form.responsavel}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      responsavel:
                        e.target.value,
                    }))
                  }
                  className="focus-visible:ring-[#378ADD]/40"
                />
              </div>

              <div>
                <Label>Conteúdos</Label>

                <Input
                  type="number"
                  value={form.conteudos_enviados}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      conteudos_enviados:
                        Number(e.target.value),
                    }))
                  }
                  className="focus-visible:ring-[#378ADD]/40"
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
                    observacoes:
                      e.target.value,
                  }))
                }
                rows={2}
                className="focus-visible:ring-[#378ADD]/40"
              />
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