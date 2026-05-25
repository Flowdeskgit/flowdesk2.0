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
  Search,
  AlertTriangle,
  Users,
} from 'lucide-react';

const STATUS_LIST = [
  'Novo',
  'Contato feito',
  'Negociação',
  'Fechado',
  'Perdido',
];

const ORIGENS = [
  'Instagram',
  'Landing Page',
  'Indicação',
  'WhatsApp',
  'Facebook',
  'LinkedIn',
  'Outro',
];

const INTERESSES = [
  'Livro',
  'Mentoria',
  'Jurídico',
  'Clube do Livro',
  'Outro',
];

const statusColors = {
  Novo: 'bg-[#EAF4FF] text-[#185FA5] border-[#BFDDF7]',
  'Contato feito': 'bg-amber-50 text-amber-700 border-amber-200',
  Negociação: 'bg-sky-50 text-sky-700 border-sky-200',
  Fechado: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Perdido: 'bg-red-50 text-red-700 border-red-200',
};

const EMPTY = {
  nome: '',
  origem: 'Instagram',
  interesse: 'Jurídico',
  status: 'Novo',
  ultimo_contato: '',
  proximo_followup: '',
  responsavel: '',
  observacoes: '',
};

export default function AbaLeadsFollowUp() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);

  const { data: leads = [] } = useQuery({
    queryKey: ['leads-marketing'],
    queryFn: () => flowdesk.entities.LeadMarketing.list('-created_date', 500),
  });

  const createM = useMutation({
    mutationFn: (d) => flowdesk.entities.LeadMarketing.create(d),
    onSuccess: () => {
      queryClient.invalidateQueries(['leads-marketing']);
      closeForm();
    },
  });

  const updateM = useMutation({
    mutationFn: ({ id, data }) =>
      flowdesk.entities.LeadMarketing.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['leads-marketing']);
      closeForm();
    },
  });

  const deleteM = useMutation({
    mutationFn: (id) => flowdesk.entities.LeadMarketing.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['leads-marketing']),
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
      origem: item.origem || 'Instagram',
      interesse: item.interesse || 'Jurídico',
      status: item.status || 'Novo',
      ultimo_contato: item.ultimo_contato || '',
      proximo_followup: item.proximo_followup || '',
      responsavel: item.responsavel || '',
      observacoes: item.observacoes || '',
    });

    setShowForm(true);
  };

  const save = () => {
    if (!form.nome.trim()) return;

    editing
      ? updateM.mutate({ id: editing.id, data: form })
      : createM.mutate(form);
  };

  const hoje = new Date().toISOString().split('T')[0];

  const isAtrasado = (lead) =>
    lead.proximo_followup &&
    lead.proximo_followup < hoje &&
    !['Fechado', 'Perdido'].includes(lead.status);

  const filtered = leads.filter((l) => {
    const matchSearch =
      !search ||
      l.nome?.toLowerCase().includes(search.toLowerCase()) ||
      l.origem?.toLowerCase().includes(search.toLowerCase());

    const matchStatus =
      filterStatus === 'all' || l.status === filterStatus;

    return matchSearch && matchStatus;
  });

  const stats = STATUS_LIST.map((s) => ({
    label: s,
    count: leads.filter((l) => l.status === s).length,
  }));

  const atrasados = leads.filter(isAtrasado).length;

  return (
    <div className="space-y-4">

      {/* Status cards */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {stats.map((s) => (
          <div
            key={s.label}
            onClick={() =>
              setFilterStatus(filterStatus === s.label ? 'all' : s.label)
            }
            className={`rounded-xl p-3 text-center border cursor-pointer transition-all shadow-sm ${
              filterStatus === s.label
                ? 'ring-2 ring-[#378ADD]/40 border-[#378ADD]'
                : 'border-slate-200'
            } ${statusColors[s.label] || 'bg-slate-50 text-slate-700'}`}
          >
            <p className="text-xl font-bold">
              {s.count}
            </p>

            <p className="text-[10px] leading-tight">
              {s.label}
            </p>
          </div>
        ))}

        <div
          onClick={() => setFilterStatus('Contato feito')}
          className={`rounded-xl p-3 text-center border cursor-pointer transition-all shadow-sm ${
            atrasados > 0
              ? 'bg-red-50 text-red-700 border-red-200'
              : 'bg-slate-50 text-slate-500 border-slate-200'
          }`}
        >
          <p className="text-xl font-bold">
            {atrasados}
          </p>

          <p className="text-[10px] leading-tight">
            Atrasados
          </p>
        </div>
      </div>

      {/* Alerta */}
      {atrasados > 0 && (
        <div className="rounded-2xl bg-red-50 border border-red-200 p-3 flex items-center gap-2 text-red-700">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />

          <span className="text-sm font-medium">
            {atrasados} follow-up(s) atrasado(s)!
          </span>

          <button
            className="ml-auto text-xs underline"
            onClick={() => setFilterStatus('Contato feito')}
          >
            Ver todos
          </button>
        </div>
      )}

      {/* Search + Button */}
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />

          <Input
            placeholder="Buscar por nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 border-slate-200 focus-visible:ring-[#378ADD]/40"
          />
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
          Novo Lead
        </Button>
      </div>

      {/* Leads */}
      <div className="space-y-2">
        {filtered.map((lead) => (
          <div
            key={lead.id}
            className={`rounded-2xl border p-4 flex items-start gap-3 hover:shadow-sm transition-all ${
              isAtrasado(lead)
                ? 'border-red-300 bg-red-50'
                : 'border-slate-200 bg-white hover:border-[#BFDDF7]'
            }`}
          >
            <div className="flex-1 min-w-0">

              <div className="flex items-center gap-2 flex-wrap mb-1">
                <p className="font-semibold text-[#0A0F1A] text-sm">
                  {lead.nome}
                </p>

                {isAtrasado(lead) && (
                  <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                )}

                <Badge
                  className={`text-xs border ${
                    statusColors[lead.status] || ''
                  }`}
                >
                  {lead.status}
                </Badge>

                {lead.origem && (
                  <Badge variant="outline" className="text-xs">
                    {lead.origem}
                  </Badge>
                )}

                {lead.interesse && (
                  <Badge variant="outline" className="text-xs">
                    {lead.interesse}
                  </Badge>
                )}
              </div>

              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-1">
                {lead.responsavel && (
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {lead.responsavel}
                  </span>
                )}

                {lead.ultimo_contato && (
                  <span>
                    Último contato: {lead.ultimo_contato}
                  </span>
                )}

                {lead.proximo_followup && (
                  <span
                    className={
                      isAtrasado(lead)
                        ? 'text-red-600 font-semibold'
                        : ''
                    }
                  >
                    Próximo follow-up: {lead.proximo_followup}
                  </span>
                )}
              </div>

              {lead.observacoes && (
                <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                  {lead.observacoes}
                </p>
              )}
            </div>

            <div className="flex gap-1 flex-shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 hover:bg-[#EAF4FF]"
                onClick={() => openEdit(lead)}
              >
                <Pencil className="h-3.5 w-3.5 text-slate-600" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-red-400 hover:bg-red-50"
                onClick={() => deleteM.mutate(lead.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <p className="text-center text-slate-400 py-8 text-sm">
            Nenhum lead encontrado
          </p>
        )}
      </div>

      {/* Dialog */}
      <Dialog open={showForm} onOpenChange={(o) => !o && closeForm()}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? 'Editar Lead' : 'Novo Lead'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <Label>Nome *</Label>
              <Input
                value={form.nome}
                onChange={(e) =>
                  setForm((p) => ({ ...p, nome: e.target.value }))
                }
                className="focus-visible:ring-[#378ADD]/40"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Origem</Label>
                <Select
                  value={form.origem}
                  onValueChange={(v) =>
                    setForm((p) => ({ ...p, origem: v }))
                  }
                >
                  <SelectTrigger className="focus:ring-[#378ADD]/40">
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    {ORIGENS.map((o) => (
                      <SelectItem key={o} value={o}>
                        {o}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Interesse</Label>
                <Select
                  value={form.interesse}
                  onValueChange={(v) =>
                    setForm((p) => ({ ...p, interesse: v }))
                  }
                >
                  <SelectTrigger className="focus:ring-[#378ADD]/40">
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    {INTERESSES.map((i) => (
                      <SelectItem key={i} value={i}>
                        {i}
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
                  <SelectTrigger className="focus:ring-[#378ADD]/40">
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    {STATUS_LIST.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Responsável</Label>
                <Input
                  value={form.responsavel}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, responsavel: e.target.value }))
                  }
                  className="focus-visible:ring-[#378ADD]/40"
                />
              </div>

              <div>
                <Label>Último Contato</Label>
                <Input
                  type="date"
                  value={form.ultimo_contato}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, ultimo_contato: e.target.value }))
                  }
                  className="focus-visible:ring-[#378ADD]/40"
                />
              </div>

              <div>
                <Label>Próximo Follow-up</Label>
                <Input
                  type="date"
                  value={form.proximo_followup}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, proximo_followup: e.target.value }))
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
                  setForm((p) => ({ ...p, observacoes: e.target.value }))
                }
                rows={3}
                className="focus-visible:ring-[#378ADD]/40"
              />
            </div>

            <div className="flex justify-end gap-2">
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