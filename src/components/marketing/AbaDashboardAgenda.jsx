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
  Calendar,
  Image,
  Globe,
  Target,
  Users,
  Clock,
} from 'lucide-react';

const TIPOS_AGENDA = [
  'Post',
  'Conteúdo',
  'Evento',
  'Mentoria',
  'Clube do Livro',
  'Follow-up',
  'Reunião',
  'Outro',
];

const STATUS_AGENDA = [
  'Pendente',
  'Agendado',
  'Realizado',
  'Cancelado',
];

const statusColors = {
  Pendente: 'bg-amber-50 text-amber-700 border-amber-200',
  Agendado: 'bg-[#EAF4FF] text-[#185FA5] border-[#BFDDF7]',
  Realizado: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Cancelado: 'bg-red-50 text-red-700 border-red-200',
};

const EMPTY = {
  titulo: '',
  tipo: 'Post',
  data_hora: '',
  responsavel: '',
  status: 'Pendente',
  descricao: '',
  observacoes: '',
};

export default function AbaDashboardAgenda({ statsData }) {
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [form, setForm] = useState(EMPTY);

  const { data: eventos = [] } = useQuery({
    queryKey: ['agenda-comercial'],
    queryFn: () => flowdesk.entities.AgendaComercial.list('-data_hora', 200),
  });

  const createM = useMutation({
    mutationFn: (d) => flowdesk.entities.AgendaComercial.create(d),
    onSuccess: () => {
      queryClient.invalidateQueries(['agenda-comercial']);
      closeForm();
    },
  });

  const updateM = useMutation({
    mutationFn: ({ id, data }) =>
      flowdesk.entities.AgendaComercial.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['agenda-comercial']);
      closeForm();
    },
  });

  const deleteM = useMutation({
    mutationFn: (id) => flowdesk.entities.AgendaComercial.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['agenda-comercial']),
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
      tipo: item.tipo || 'Post',
      data_hora: item.data_hora ? item.data_hora.slice(0, 16) : '',
      responsavel: item.responsavel || '',
      status: item.status || 'Pendente',
      descricao: item.descricao || '',
      observacoes: item.observacoes || '',
    });

    setShowForm(true);
  };

  const save = () => {
    if (!form.titulo.trim()) return;

    editing
      ? updateM.mutate({ id: editing.id, data: form })
      : createM.mutate(form);
  };

  const hoje = new Date().toDateString();

  const eventosHoje = eventos.filter(
    (e) => e.data_hora && new Date(e.data_hora).toDateString() === hoje
  );

  const pendentes = eventos.filter(
    (e) => e.status === 'Pendente' || e.status === 'Agendado'
  );

  const filtered =
    filterStatus === 'all'
      ? eventos
      : eventos.filter((e) => e.status === filterStatus);

  const statsCards = [
    {
      label: 'Posts Publicados',
      value: statsData.postsPublicados,
      icon: Image,
      style: 'bg-[#EAF4FF] text-[#185FA5] border-[#BFDDF7]',
    },
    {
      label: 'Total de Leads',
      value: statsData.totalLeads,
      icon: Target,
      style: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
    {
      label: 'LPs Ativas',
      value: statsData.lpsAtivas,
      icon: Globe,
      style: 'bg-sky-50 text-sky-700 border-sky-200',
    },
    {
      label: 'Follow-ups Pendentes',
      value: pendentes.length,
      icon: Clock,
      style: 'bg-amber-50 text-amber-700 border-amber-200',
    },
  ];

  return (
    <div className="space-y-6">

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statsCards.map((card) => (
          <div
            key={card.label}
            className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className={`inline-flex rounded-xl border p-2 mb-2 ${card.style}`}>
              <card.icon className="h-4 w-4" />
            </div>

            <p className="text-2xl font-bold text-[#0A0F1A]">
              {card.value}
            </p>

            <p className="text-xs text-slate-500 mt-0.5">
              {card.label}
            </p>
          </div>
        ))}
      </div>

      {/* Eventos de hoje */}
      {eventosHoje.length > 0 && (
        <div className="rounded-2xl bg-[#EAF4FF] border border-[#BFDDF7] p-4">
          <h3 className="font-semibold text-[#185FA5] mb-3 flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Hoje ({eventosHoje.length})
          </h3>

          <div className="space-y-2">
            {eventosHoje.map((e) => (
              <div
                key={e.id}
                className="flex items-center gap-3 bg-white rounded-xl px-3 py-2 border border-[#BFDDF7]"
              >
                <Badge className={`text-xs border ${statusColors[e.status] || ''}`}>
                  {e.status}
                </Badge>

                <span className="text-sm font-medium text-slate-800 flex-1">
                  {e.titulo}
                </span>

                <Badge variant="outline" className="text-xs">
                  {e.tipo}
                </Badge>

                {e.data_hora && (
                  <span className="text-xs text-slate-400">
                    {new Date(e.data_hora).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Agenda completa */}
      <div>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Calendar className="h-5 w-5 text-[#378ADD]" />
            Agenda de Marketing
          </h3>

          <div className="flex gap-2">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-36 h-8 text-xs border-slate-200 focus:ring-[#378ADD]/40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {STATUS_AGENDA.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              size="sm"
              className="bg-[#378ADD] hover:bg-[#185FA5] text-white h-8 shadow-sm"
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

        <div className="space-y-2">
          {filtered.slice(0, 30).map((evento) => (
            <div
              key={evento.id}
              className="rounded-2xl border border-slate-200 bg-white p-3 flex items-start gap-3 hover:shadow-sm hover:border-[#BFDDF7] transition-all"
            >
              <div className="flex-shrink-0 w-12 text-center bg-[#EAF4FF] rounded-xl p-1.5 border border-[#BFDDF7]">
                <p className="text-[10px] text-[#185FA5] font-semibold leading-tight">
                  {evento.data_hora
                    ? new Date(evento.data_hora).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'short',
                      })
                    : '—'}
                </p>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                  <p className="font-medium text-foreground text-sm">
                    {evento.titulo}
                  </p>

                  <Badge
                    className={`text-[10px] px-1.5 py-0.5 border ${
                      statusColors[evento.status] || ''
                    }`}
                  >
                    {evento.status}
                  </Badge>

                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 py-0.5"
                  >
                    {evento.tipo}
                  </Badge>
                </div>

                {evento.responsavel && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {evento.responsavel}
                  </p>
                )}

                {evento.descricao && (
                  <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                    {evento.descricao}
                  </p>
                )}
              </div>

              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 hover:bg-[#EAF4FF]"
                  onClick={() => openEdit(evento)}
                >
                  <Pencil className="h-3 w-3 text-slate-600" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50"
                  onClick={() => deleteM.mutate(evento.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <p className="text-center text-slate-400 py-8 text-sm">
              Nenhum evento na agenda
            </p>
          )}
        </div>
      </div>

      <Dialog open={showForm} onOpenChange={(o) => !o && closeForm()}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {editing ? 'Editar Evento' : 'Novo Evento na Agenda'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <Label>Título *</Label>
              <Input
                value={form.titulo}
                onChange={(e) =>
                  setForm((p) => ({ ...p, titulo: e.target.value }))
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
                    setForm((p) => ({ ...p, tipo: v }))
                  }
                >
                  <SelectTrigger className="focus:ring-[#378ADD]/40">
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    {TIPOS_AGENDA.map((t) => (
                      <SelectItem key={t} value={t}>
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
                    setForm((p) => ({ ...p, status: v }))
                  }
                >
                  <SelectTrigger className="focus:ring-[#378ADD]/40">
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    {STATUS_AGENDA.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Data e Hora</Label>
                <Input
                  type="datetime-local"
                  value={form.data_hora}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, data_hora: e.target.value }))
                  }
                  className="focus-visible:ring-[#378ADD]/40"
                />
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
            </div>

            <div>
              <Label>Descrição</Label>
              <Textarea
                value={form.descricao}
                onChange={(e) =>
                  setForm((p) => ({ ...p, descricao: e.target.value }))
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
                  setForm((p) => ({ ...p, observacoes: e.target.value }))
                }
                rows={2}
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