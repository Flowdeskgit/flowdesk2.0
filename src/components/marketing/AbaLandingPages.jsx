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
  Globe,
  ExternalLink,
} from 'lucide-react';

const STATUS_LP = [
  'Ativa',
  'Pausada',
  'Em Teste',
  'Desativada',
];

const OBJETIVO_LP = [
  'BPC',
  'Aposentadoria',
  'Revisão',
  'INSS',
  'Família',
  'Trabalhista',
  'Outro',
];

const EMPTY = {
  nome: '',
  objetivo: 'BPC',
  url: '',
  leads_gerados: 0,
  taxa_conversao: 0,
  status: 'Ativa',
  data_criacao: '',
  observacoes: '',
};

export default function AbaLandingPages() {
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const [form, setForm] = useState(EMPTY);

  const { data: lps = [] } = useQuery({
    queryKey: ['landing-pages'],
    queryFn: () =>
      flowdesk.entities.LandingPage.list('-created_date'),
  });

  const createM = useMutation({
    mutationFn: (d) => flowdesk.entities.LandingPage.create(d),
    onSuccess: () => {
      queryClient.invalidateQueries(['landing-pages']);
      closeForm();
    },
  });

  const updateM = useMutation({
    mutationFn: ({ id, data }) =>
      flowdesk.entities.LandingPage.update(id, data),

    onSuccess: () => {
      queryClient.invalidateQueries(['landing-pages']);
      closeForm();
    },
  });

  const deleteM = useMutation({
    mutationFn: (id) =>
      flowdesk.entities.LandingPage.delete(id),

    onSuccess: () =>
      queryClient.invalidateQueries(['landing-pages']),
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
      objetivo: item.objetivo || 'BPC',
      url: item.url || '',
      leads_gerados: item.leads_gerados || 0,
      taxa_conversao: item.taxa_conversao || 0,
      status: item.status || 'Ativa',
      data_criacao: item.data_criacao || '',
      observacoes: item.observacoes || '',
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

  const totalLeads = lps.reduce(
    (s, l) => s + (l.leads_gerados || 0),
    0
  );

  const ativas = lps.filter(
    (l) => l.status === 'Ativa'
  ).length;

  const melhorTaxa =
    lps.length > 0
      ? Math.max(...lps.map((l) => l.taxa_conversao || 0))
      : 0;

  const cards = [
    {
      label: 'Total de Leads',
      value: totalLeads,
      style:
        'bg-emerald-50 border-emerald-200 text-emerald-700',
    },
    {
      label: 'LPs Ativas',
      value: ativas,
      style:
        'bg-[#EAF4FF] border-[#BFDDF7] text-[#185FA5]',
    },
    {
      label: 'Melhor Taxa',
      value: `${melhorTaxa}%`,
      style:
        'bg-sky-50 border-sky-200 text-sky-700',
    },
  ];

  return (
    <div className="space-y-4">

      {/* Cards */}
      <div className="grid grid-cols-3 gap-3">
        {cards.map((c) => (
          <div
            key={c.label}
            className={`rounded-2xl border p-4 text-center shadow-sm bg-white ${c.style}`}
          >
            <p className="text-2xl font-bold">
              {c.value}
            </p>

            <p className="text-xs mt-1">
              {c.label}
            </p>
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <Globe className="h-5 w-5 text-[#378ADD]" />
          Landing Pages
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
          Nova LP
        </Button>
      </div>

      {/* Cards LP */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {lps.map((lp) => (
          <div
            key={lp.id}
            className="rounded-2xl border border-slate-200 bg-white p-4 hover:shadow-md hover:border-[#BFDDF7] transition-all"
          >
            <div className="flex items-start justify-between gap-2 mb-2">

              <div>
                <p className="font-semibold text-[#0A0F1A] text-sm">
                  {lp.nome}
                </p>

                <Badge
                  variant="outline"
                  className="text-xs mt-1"
                >
                  {lp.objetivo}
                </Badge>
              </div>

              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 hover:bg-[#EAF4FF]"
                  onClick={() => openEdit(lp)}
                >
                  <Pencil className="h-3.5 w-3.5 text-slate-600" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-red-500 hover:bg-red-50"
                  onClick={() => deleteM.mutate(lp.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            <Badge
              className={`text-xs mb-3 border ${
                lp.status === 'Ativa'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}
            >
              {lp.status}
            </Badge>

            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="text-center bg-emerald-50 rounded-xl p-2 border border-emerald-100">
                <p className="text-xs text-slate-500">
                  Leads
                </p>

                <p className="font-bold text-emerald-700">
                  {lp.leads_gerados || 0}
                </p>
              </div>

              <div className="text-center bg-[#EAF4FF] rounded-xl p-2 border border-[#BFDDF7]">
                <p className="text-xs text-slate-500">
                  Conversão
                </p>

                <p className="font-bold text-[#185FA5]">
                  {lp.taxa_conversao || 0}%
                </p>
              </div>
            </div>

            {lp.url && (
              <a
                href={lp.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-xs text-[#185FA5] hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                Abrir LP
              </a>
            )}

            {lp.observacoes && (
              <p className="text-xs text-slate-500 italic mt-2 line-clamp-2">
                {lp.observacoes}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Empty */}
      {lps.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <Globe className="h-12 w-12 mb-3 opacity-20" />

          <p className="text-sm">
            Nenhuma landing page cadastrada
          </p>
        </div>
      )}

      {/* Dialog */}
      <Dialog
        open={showForm}
        onOpenChange={(o) => !o && closeForm()}
      >
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing
                ? 'Editar LP'
                : 'Nova Landing Page'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">

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

            <div className="grid grid-cols-2 gap-4">

              <div>
                <Label>Objetivo</Label>

                <Select
                  value={form.objetivo}
                  onValueChange={(v) =>
                    setForm((p) => ({
                      ...p,
                      objetivo: v,
                    }))
                  }
                >
                  <SelectTrigger className="focus:ring-[#378ADD]/40">
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    {OBJETIVO_LP.map((o) => (
                      <SelectItem
                        key={o}
                        value={o}
                      >
                        {o}
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
                    {STATUS_LP.map((s) => (
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
                <Label>Leads Gerados</Label>

                <Input
                  type="number"
                  value={form.leads_gerados}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      leads_gerados: Number(e.target.value),
                    }))
                  }
                  className="focus-visible:ring-[#378ADD]/40"
                />
              </div>

              <div>
                <Label>Taxa de Conversão (%)</Label>

                <Input
                  type="number"
                  step="0.1"
                  value={form.taxa_conversao}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      taxa_conversao: Number(e.target.value),
                    }))
                  }
                  className="focus-visible:ring-[#378ADD]/40"
                />
              </div>

              <div className="col-span-2">
                <Label>URL da LP</Label>

                <Input
                  value={form.url}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      url: e.target.value,
                    }))
                  }
                  placeholder="https://"
                  className="focus-visible:ring-[#378ADD]/40"
                />
              </div>

              <div>
                <Label>Data de Criação</Label>

                <Input
                  type="date"
                  value={form.data_criacao}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      data_criacao: e.target.value,
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
                    observacoes: e.target.value,
                  }))
                }
                rows={2}
                className="focus-visible:ring-[#378ADD]/40"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
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