import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { flowdesk } from '@/api/flowdeskClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, X, Save, AlertTriangle, Clock } from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';

const STATUS_COLORS = {
  'Pendente': 'bg-yellow-100 text-yellow-700',
  'Aguardando cliente': 'bg-orange-100 text-orange-700',
  'Em andamento': 'bg-blue-100 text-blue-700',
  'Cumprida': 'bg-green-100 text-green-700',
  'Enviada': 'bg-emerald-100 text-emerald-700',
  'Vencida': 'bg-red-100 text-red-700',
  'Cancelada': 'bg-slate-100 text-slate-500',
};

const EMPTY = {
  data_emissao_exigencia: '',
  prazo_final: '',
  descricao_exigencia: '',
  documentos_solicitados: '',
  status_exigencia: 'Pendente',
  data_cumprimento: '',
  forma_cumprimento: '',
  responsavel_interno: '',
  observacoes: '',
};

export default function AbaExigenciasAdm({ admId, user }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);

  const { data: exigencias = [] } = useQuery({
    queryKey: ['exig-adm-inss', admId],
    queryFn: () => flowdesk.entities.ExigenciaAdmINSS.filter({ administrativo_inss_id: admId }),
    enabled: !!admId,
  });

  const createMutation = useMutation({
    mutationFn: (data) => flowdesk.entities.ExigenciaAdmINSS.create({ ...data, administrativo_inss_id: admId }),
    onSuccess: () => { queryClient.invalidateQueries(['exig-adm-inss', admId]); setShowForm(false); setForm(EMPTY); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => flowdesk.entities.ExigenciaAdmINSS.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries(['exig-adm-inss', admId]); setEditing(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => flowdesk.entities.ExigenciaAdmINSS.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['exig-adm-inss', admId]),
  });

  const getPrazoAlert = (prazo, status) => {
    if (!prazo || ['Cumprida', 'Enviada', 'Cancelada'].includes(status)) return null;
    const days = differenceInDays(parseISO(prazo), new Date());
    if (days < 0) return { label: `Vencida há ${Math.abs(days)} dias`, color: 'text-red-600 bg-red-50' };
    if (days <= 5) return { label: `Vence em ${days} dias`, color: 'text-orange-600 bg-orange-50' };
    return null;
  };

  const f = (key) => (v) => setForm(p => ({ ...p, [key]: typeof v === 'string' ? v : v.target.value }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-700">Exigências ({exigencias.length})</h3>
        <Button size="sm" onClick={() => { setShowForm(true); setForm(EMPTY); }}><Plus className="h-3 w-3 mr-1" />Nova</Button>
      </div>

      {(showForm || editing) && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
          {[
            ['data_emissao_exigencia', 'Data de Emissão', 'date'],
            ['prazo_final', 'Prazo Final', 'date'],
            ['data_cumprimento', 'Data de Cumprimento', 'date'],
          ].map(([key, label, type]) => (
            <div key={key}>
              <Label>{label}</Label>
              <Input type={type} value={editing ? editing.form[key] : form[key]} onChange={editing ? (e) => setEditing(ed => ({ ...ed, form: { ...ed.form, [key]: e.target.value } })) : f(key)} />
            </div>
          ))}
          <div>
            <Label>Status</Label>
            <Select value={editing ? editing.form.status_exigencia : form.status_exigencia} onValueChange={editing ? (v) => setEditing(e => ({ ...e, form: { ...e.form, status_exigencia: v } })) : f('status_exigencia')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {['Pendente','Aguardando cliente','Em andamento','Cumprida','Enviada','Vencida','Cancelada'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Responsável Interno</Label>
            <Input value={editing ? editing.form.responsavel_interno : form.responsavel_interno} onChange={editing ? (e) => setEditing(ed => ({ ...ed, form: { ...ed.form, responsavel_interno: e.target.value } })) : f('responsavel_interno')} />
          </div>
          <div>
            <Label>Descrição da Exigência *</Label>
            <Textarea value={editing ? editing.form.descricao_exigencia : form.descricao_exigencia} onChange={editing ? (e) => setEditing(ed => ({ ...ed, form: { ...ed.form, descricao_exigencia: e.target.value } })) : f('descricao_exigencia')} rows={3} />
          </div>
          <div>
            <Label>Documentos Solicitados</Label>
            <Textarea value={editing ? editing.form.documentos_solicitados : form.documentos_solicitados} onChange={editing ? (e) => setEditing(ed => ({ ...ed, form: { ...ed.form, documentos_solicitados: e.target.value } })) : f('documentos_solicitados')} rows={2} />
          </div>
          <div>
            <Label>Forma de Cumprimento</Label>
            <Input value={editing ? editing.form.forma_cumprimento : form.forma_cumprimento} onChange={editing ? (e) => setEditing(ed => ({ ...ed, form: { ...ed.form, forma_cumprimento: e.target.value } })) : f('forma_cumprimento')} />
          </div>
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="outline" onClick={() => { setShowForm(false); setEditing(null); }}><X className="h-3 w-3 mr-1" />Cancelar</Button>
            <Button size="sm" onClick={() => editing ? updateMutation.mutate({ id: editing.id, data: editing.form }) : createMutation.mutate(form)} disabled={createMutation.isPending || updateMutation.isPending}><Save className="h-3 w-3 mr-1" />Salvar</Button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {[...exigencias].sort((a, b) => new Date(a.prazo_final) - new Date(b.prazo_final)).map(ex => {
          const alert = getPrazoAlert(ex.prazo_final, ex.status_exigencia);
          return (
            <div key={ex.id} className={`bg-white border rounded-xl p-4 ${alert?.color?.includes('red') ? 'border-red-200' : alert?.color?.includes('orange') ? 'border-orange-200' : 'border-slate-200'}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-2">
                  <AlertTriangle className={`h-4 w-4 flex-shrink-0 mt-0.5 ${alert ? 'text-red-500' : 'text-slate-400'}`} />
                  <div>
                    <p className="text-sm font-medium text-slate-800">{ex.descricao_exigencia}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {ex.prazo_final && (
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <Clock className="h-3 w-3" />Prazo: {format(new Date(ex.prazo_final), 'dd/MM/yyyy')}
                        </span>
                      )}
                      {alert && <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${alert.color}`}>{alert.label}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={STATUS_COLORS[ex.status_exigencia] || 'bg-slate-100'}>{ex.status_exigencia}</Badge>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing({ id: ex.id, form: { ...ex } })}><Pencil className="h-3 w-3" /></Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500" onClick={() => deleteMutation.mutate(ex.id)}><Trash2 className="h-3 w-3" /></Button>
                </div>
              </div>
            </div>
          );
        })}
        {exigencias.length === 0 && <p className="text-center text-slate-400 py-8 text-sm">Nenhuma exigência registrada.</p>}
      </div>
    </div>
  );
}