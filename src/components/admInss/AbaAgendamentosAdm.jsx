import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { flowdesk } from '@/api/flowdeskClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, X, Save, Calendar } from 'lucide-react';
import { format } from 'date-fns';

const STATUS_COLORS = {
  'Pendente': 'bg-yellow-100 text-yellow-700',
  'Agendado': 'bg-blue-100 text-blue-700',
  'Reagendado': 'bg-orange-100 text-orange-700',
  'Realizado': 'bg-green-100 text-green-700',
  'Cancelado': 'bg-slate-100 text-slate-600',
  'Não compareceu': 'bg-red-100 text-red-700',
};

const EMPTY = {
  tipo_agendamento: '',
  data_agendada: '',
  hora_agendada: '',
  local_agendamento: '',
  unidade_inss: '',
  status_agendamento: 'Pendente',
  resultado_agendamento: '',
  documentos_necessarios: '',
  observacoes: '',
};

export default function AbaAgendamentosAdm({ admId, user }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);

  const { data: agendamentos = [] } = useQuery({
    queryKey: ['agend-adm-inss', admId],
    queryFn: () => flowdesk.entities.AgendamentoAdmINSS.filter({ administrativo_inss_id: admId }),
    enabled: !!admId,
  });

  const createMutation = useMutation({
    mutationFn: (data) => flowdesk.entities.AgendamentoAdmINSS.create({ ...data, administrativo_inss_id: admId }),
    onSuccess: () => { queryClient.invalidateQueries(['agend-adm-inss', admId]); setShowForm(false); setForm(EMPTY); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => flowdesk.entities.AgendamentoAdmINSS.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries(['agend-adm-inss', admId]); setEditing(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => flowdesk.entities.AgendamentoAdmINSS.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['agend-adm-inss', admId]),
  });

  const sorted = [...agendamentos].sort((a, b) => new Date(b.data_agendada) - new Date(a.data_agendada));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-700">Agendamentos ({agendamentos.length})</h3>
        <Button size="sm" onClick={() => { setShowForm(true); setForm(EMPTY); }}><Plus className="h-3 w-3 mr-1" />Novo</Button>
      </div>

      {(showForm || editing) && (
        <FormAgendamento
          form={editing ? editing.form : form}
          setForm={editing ? (f) => setEditing(e => ({ ...e, form: typeof f === 'function' ? f(e.form) : f })) : setForm}
          onSave={() => editing ? updateMutation.mutate({ id: editing.id, data: editing.form }) : createMutation.mutate(form)}
          onCancel={() => { setShowForm(false); setEditing(null); setForm(EMPTY); }}
          loading={createMutation.isPending || updateMutation.isPending}
        />
      )}

      <div className="space-y-3">
        {sorted.map(ag => (
          <div key={ag.id} className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-rose-500 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-slate-800">{ag.tipo_agendamento}</p>
                  <p className="text-xs text-slate-500">{ag.data_agendada ? format(new Date(ag.data_agendada), 'dd/MM/yyyy') : '—'} {ag.hora_agendada && `às ${ag.hora_agendada}`}</p>
                  {ag.local_agendamento && <p className="text-xs text-slate-500">{ag.local_agendamento}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={STATUS_COLORS[ag.status_agendamento] || 'bg-slate-100'}>{ag.status_agendamento}</Badge>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing({ id: ag.id, form: { ...ag } })}><Pencil className="h-3 w-3" /></Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500" onClick={() => deleteMutation.mutate(ag.id)}><Trash2 className="h-3 w-3" /></Button>
              </div>
            </div>
            {ag.resultado_agendamento && <p className="text-xs text-slate-600 mt-2 border-t pt-2">{ag.resultado_agendamento}</p>}
          </div>
        ))}
        {sorted.length === 0 && <p className="text-center text-slate-400 py-8 text-sm">Nenhum agendamento registrado.</p>}
      </div>
    </div>
  );
}

function FormAgendamento({ form, setForm, onSave, onCancel, loading }) {
  const f = (k) => (v) => setForm(p => ({ ...p, [k]: typeof v === 'string' ? v : v.target.value }));
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Label>Tipo de Agendamento *</Label>
          <Select value={form.tipo_agendamento} onValueChange={f('tipo_agendamento')}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              {['Perícia médica','Avaliação social','Atendimento presencial','Cumprimento de exigência','Entrega de documentos','Justificação administrativa','Outro'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Status</Label>
          <Select value={form.status_agendamento} onValueChange={f('status_agendamento')}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {['Pendente','Agendado','Reagendado','Realizado','Cancelado','Não compareceu'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Data Agendada *</Label>
          <Input type="date" value={form.data_agendada} onChange={f('data_agendada')} />
        </div>
        <div>
          <Label>Hora</Label>
          <Input type="time" value={form.hora_agendada} onChange={f('hora_agendada')} />
        </div>
        <div>
          <Label>Local</Label>
          <Input value={form.local_agendamento} onChange={f('local_agendamento')} />
        </div>
        <div>
          <Label>Unidade INSS</Label>
          <Input value={form.unidade_inss} onChange={f('unidade_inss')} />
        </div>
        <div className="md:col-span-2">
          <Label>Documentos Necessários</Label>
          <Textarea value={form.documentos_necessarios} onChange={f('documentos_necessarios')} rows={2} />
        </div>
        <div className="md:col-span-2">
          <Label>Resultado / Observações</Label>
          <Textarea value={form.resultado_agendamento} onChange={f('resultado_agendamento')} rows={2} />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <Button size="sm" variant="outline" onClick={onCancel}><X className="h-3 w-3 mr-1" />Cancelar</Button>
        <Button size="sm" onClick={onSave} disabled={loading}><Save className="h-3 w-3 mr-1" />Salvar</Button>
      </div>
    </div>
  );
}