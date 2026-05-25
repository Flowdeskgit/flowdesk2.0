import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { flowdesk } from '@/api/flowdeskClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, X, Save, XCircle, Clock } from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';

export default function AbaIndeferidosAdm({ admId }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const EMPTY = { data_indeferimento: '', motivo_indeferimento: '', fundamento_resumido: '', possibilidade_recurso: '', prazo_recurso: '', recurso_interposto: '', data_recurso: '', observacoes: '' };
  const [form, setForm] = useState(EMPTY);

  const { data: indeferidos = [] } = useQuery({
    queryKey: ['ind-adm-inss', admId],
    queryFn: () => flowdesk.entities.IndeferidoAdmINSS.filter({ administrativo_inss_id: admId }),
    enabled: !!admId,
  });

  const createMutation = useMutation({
    mutationFn: (data) => flowdesk.entities.IndeferidoAdmINSS.create({ ...data, administrativo_inss_id: admId }),
    onSuccess: () => { queryClient.invalidateQueries(['ind-adm-inss', admId]); setShowForm(false); setForm(EMPTY); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => flowdesk.entities.IndeferidoAdmINSS.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries(['ind-adm-inss', admId]); setEditing(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => flowdesk.entities.IndeferidoAdmINSS.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['ind-adm-inss', admId]),
  });

  const af = editing ? editing.form : form;
  const sf = editing
    ? (k, v) => setEditing(e => ({ ...e, form: { ...e.form, [k]: v } }))
    : (k, v) => setForm(p => ({ ...p, [k]: v }));

  const getPrazoAlert = (prazo) => {
    if (!prazo) return null;
    const days = differenceInDays(parseISO(prazo), new Date());
    if (days < 0) return { label: `Prazo vencido há ${Math.abs(days)} dias`, color: 'text-red-600' };
    if (days <= 10) return { label: `Prazo em ${days} dias`, color: 'text-orange-600' };
    return null;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-700">Indeferidos ({indeferidos.length})</h3>
        <Button size="sm" onClick={() => { setShowForm(true); setForm(EMPTY); }}><Plus className="h-3 w-3 mr-1" />Novo</Button>
      </div>

      {(showForm || editing) && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div><Label>Data do Indeferimento</Label><Input type="date" value={af.data_indeferimento} onChange={e => sf('data_indeferimento', e.target.value)} /></div>
            <div>
              <Label>Possibilidade de Recurso</Label>
              <Select value={af.possibilidade_recurso} onValueChange={v => sf('possibilidade_recurso', v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{['Sim','Não','Analisar'].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Prazo para Recurso</Label><Input type="date" value={af.prazo_recurso} onChange={e => sf('prazo_recurso', e.target.value)} /></div>
            <div>
              <Label>Recurso Interposto</Label>
              <Select value={af.recurso_interposto} onValueChange={v => sf('recurso_interposto', v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{['Sim','Não'].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Data do Recurso</Label><Input type="date" value={af.data_recurso} onChange={e => sf('data_recurso', e.target.value)} /></div>
            <div className="md:col-span-2"><Label>Motivo do Indeferimento</Label><Textarea value={af.motivo_indeferimento} onChange={e => sf('motivo_indeferimento', e.target.value)} rows={2} /></div>
            <div className="md:col-span-2"><Label>Fundamento Resumido</Label><Textarea value={af.fundamento_resumido} onChange={e => sf('fundamento_resumido', e.target.value)} rows={2} /></div>
            <div className="md:col-span-2"><Label>Observações</Label><Textarea value={af.observacoes} onChange={e => sf('observacoes', e.target.value)} rows={2} /></div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="outline" onClick={() => { setShowForm(false); setEditing(null); }}><X className="h-3 w-3 mr-1" />Cancelar</Button>
            <Button size="sm" onClick={() => editing ? updateMutation.mutate({ id: editing.id, data: editing.form }) : createMutation.mutate(form)} disabled={createMutation.isPending || updateMutation.isPending}><Save className="h-3 w-3 mr-1" />Salvar</Button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {indeferidos.map(ind => {
          const alert = getPrazoAlert(ind.prazo_recurso);
          return (
            <div key={ind.id} className="bg-white border border-red-100 rounded-xl p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-slate-800">Indeferimento {ind.data_indeferimento ? format(new Date(ind.data_indeferimento), 'dd/MM/yyyy') : ''}</p>
                    {ind.possibilidade_recurso && (
                      <Badge className={`text-xs ${ind.possibilidade_recurso === 'Sim' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                        Recurso: {ind.possibilidade_recurso}
                      </Badge>
                    )}
                    {ind.prazo_recurso && (
                      <div className="flex items-center gap-1 mt-1">
                        <Clock className="h-3 w-3 text-slate-400" />
                        <span className={`text-xs ${alert?.color || 'text-slate-500'}`}>Prazo recurso: {format(new Date(ind.prazo_recurso), 'dd/MM/yyyy')}</span>
                        {alert && <span className="text-xs font-semibold ml-1">({alert.label})</span>}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing({ id: ind.id, form: { ...ind } })}><Pencil className="h-3 w-3" /></Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500" onClick={() => deleteMutation.mutate(ind.id)}><Trash2 className="h-3 w-3" /></Button>
                </div>
              </div>
              {ind.motivo_indeferimento && <p className="text-xs text-slate-600 mt-2 border-t pt-2">{ind.motivo_indeferimento}</p>}
            </div>
          );
        })}
        {indeferidos.length === 0 && <p className="text-center text-slate-400 py-8 text-sm">Nenhum indeferimento registrado.</p>}
      </div>
    </div>
  );
}