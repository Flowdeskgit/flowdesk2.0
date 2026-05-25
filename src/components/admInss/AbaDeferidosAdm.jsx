import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { flowdesk } from '@/api/flowdeskClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, X, Save, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';

const EMPTY = {
  data_deferimento: '',
  tipo_beneficio_deferido: '',
  numero_beneficio: '',
  valor_concedido: '',
  renda_mensal_inicial: '',
  data_inicio_beneficio: '',
  status_pos_deferimento: 'Ativo',
  observacoes: '',
};

export default function AbaDeferidosAdm({ admId }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);

  const { data: deferidos = [] } = useQuery({
    queryKey: ['def-adm-inss', admId],
    queryFn: () => flowdesk.entities.DeferidoAdmINSS.filter({ administrativo_inss_id: admId }),
    enabled: !!admId,
  });

  const createMutation = useMutation({
    mutationFn: (data) => flowdesk.entities.DeferidoAdmINSS.create({ ...data, administrativo_inss_id: admId }),
    onSuccess: () => { queryClient.invalidateQueries(['def-adm-inss', admId]); setShowForm(false); setForm(EMPTY); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => flowdesk.entities.DeferidoAdmINSS.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries(['def-adm-inss', admId]); setEditing(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => flowdesk.entities.DeferidoAdmINSS.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['def-adm-inss', admId]),
  });

  const activeForm = editing ? editing.form : form;
  const setActiveForm = editing
    ? (k, v) => setEditing(e => ({ ...e, form: { ...e.form, [k]: v } }))
    : (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-700">Deferidos ({deferidos.length})</h3>
        <Button size="sm" onClick={() => { setShowForm(true); setForm(EMPTY); }}><Plus className="h-3 w-3 mr-1" />Novo</Button>
      </div>

      {(showForm || editing) && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div><Label>Data do Deferimento</Label><Input type="date" value={activeForm.data_deferimento} onChange={e => setActiveForm('data_deferimento', e.target.value)} /></div>
            <div><Label>Tipo do Benefício</Label><Input value={activeForm.tipo_beneficio_deferido} onChange={e => setActiveForm('tipo_beneficio_deferido', e.target.value)} /></div>
            <div><Label>Número do Benefício</Label><Input value={activeForm.numero_beneficio} onChange={e => setActiveForm('numero_beneficio', e.target.value)} /></div>
            <div><Label>Valor Concedido (R$)</Label><Input type="number" value={activeForm.valor_concedido} onChange={e => setActiveForm('valor_concedido', e.target.value)} /></div>
            <div><Label>Renda Mensal Inicial (R$)</Label><Input type="number" value={activeForm.renda_mensal_inicial} onChange={e => setActiveForm('renda_mensal_inicial', e.target.value)} /></div>
            <div><Label>Data de Início do Benefício</Label><Input type="date" value={activeForm.data_inicio_beneficio} onChange={e => setActiveForm('data_inicio_beneficio', e.target.value)} /></div>
            <div>
              <Label>Status Pós-Deferimento</Label>
              <Select value={activeForm.status_pos_deferimento} onValueChange={v => setActiveForm('status_pos_deferimento', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['Implantado','Ativo','Pendente de conferência','Encerrado'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2"><Label>Observações</Label><Textarea value={activeForm.observacoes} onChange={e => setActiveForm('observacoes', e.target.value)} rows={2} /></div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="outline" onClick={() => { setShowForm(false); setEditing(null); }}><X className="h-3 w-3 mr-1" />Cancelar</Button>
            <Button size="sm" onClick={() => editing ? updateMutation.mutate({ id: editing.id, data: editing.form }) : createMutation.mutate(form)} disabled={createMutation.isPending || updateMutation.isPending}><Save className="h-3 w-3 mr-1" />Salvar</Button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {deferidos.map(d => (
          <div key={d.id} className="bg-white border border-green-200 rounded-xl p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-slate-800">{d.tipo_beneficio_deferido || 'Benefício Deferido'}</p>
                  {d.numero_beneficio && <p className="text-xs text-slate-500">Benefício: {d.numero_beneficio}</p>}
                  {d.data_deferimento && <p className="text-xs text-slate-500">Deferido em: {format(new Date(d.data_deferimento), 'dd/MM/yyyy')}</p>}
                  {d.valor_concedido && <p className="text-xs text-green-600 font-medium">R$ {Number(d.valor_concedido).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-green-100 text-green-700">{d.status_pos_deferimento}</Badge>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing({ id: d.id, form: { ...d } })}><Pencil className="h-3 w-3" /></Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500" onClick={() => deleteMutation.mutate(d.id)}><Trash2 className="h-3 w-3" /></Button>
              </div>
            </div>
          </div>
        ))}
        {deferidos.length === 0 && <p className="text-center text-slate-400 py-8 text-sm">Nenhum deferimento registrado.</p>}
      </div>
    </div>
  );
}