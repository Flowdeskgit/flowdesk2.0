import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { flowdesk } from '@/api/flowdeskClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Trash2, X, Save, FlagTriangleRight } from 'lucide-react';
import { format } from 'date-fns';

const EMPTY = { data_conclusao: '', tipo_conclusao: '', resultado_final: '', observacoes_finais: '' };

export default function AbaConcluidosAdm({ admId }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);

  const { data: conclusoes = [] } = useQuery({
    queryKey: ['conc-adm-inss', admId],
    queryFn: () => flowdesk.entities.ConclusaoAdmINSS.filter({ administrativo_inss_id: admId }),
    enabled: !!admId,
  });

  const createMutation = useMutation({
    mutationFn: (data) => flowdesk.entities.ConclusaoAdmINSS.create({ ...data, administrativo_inss_id: admId }),
    onSuccess: () => { queryClient.invalidateQueries(['conc-adm-inss', admId]); setShowForm(false); setForm(EMPTY); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => flowdesk.entities.ConclusaoAdmINSS.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries(['conc-adm-inss', admId]); setEditing(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => flowdesk.entities.ConclusaoAdmINSS.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['conc-adm-inss', admId]),
  });

  const af = editing ? editing.form : form;
  const sf = editing
    ? (k, v) => setEditing(e => ({ ...e, form: { ...e.form, [k]: v } }))
    : (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-700">Concluídos ({conclusoes.length})</h3>
        <Button size="sm" onClick={() => { setShowForm(true); setForm(EMPTY); }}><Plus className="h-3 w-3 mr-1" />Novo</Button>
      </div>

      {(showForm || editing) && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div><Label>Data de Conclusão</Label><Input type="date" value={af.data_conclusao} onChange={e => sf('data_conclusao', e.target.value)} /></div>
            <div>
              <Label>Tipo de Conclusão *</Label>
              <Select value={af.tipo_conclusao} onValueChange={v => sf('tipo_conclusao', v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {['Deferido finalizado','Indeferido encerrado','Desistência','Perda de objeto','Encerrado sem judicialização','Migrado para judicial','Outro'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2"><Label>Resultado Final</Label><Textarea value={af.resultado_final} onChange={e => sf('resultado_final', e.target.value)} rows={2} /></div>
            <div className="md:col-span-2"><Label>Observações Finais</Label><Textarea value={af.observacoes_finais} onChange={e => sf('observacoes_finais', e.target.value)} rows={2} /></div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="outline" onClick={() => { setShowForm(false); setEditing(null); }}><X className="h-3 w-3 mr-1" />Cancelar</Button>
            <Button size="sm" onClick={() => editing ? updateMutation.mutate({ id: editing.id, data: editing.form }) : createMutation.mutate(form)} disabled={createMutation.isPending || updateMutation.isPending}><Save className="h-3 w-3 mr-1" />Salvar</Button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {conclusoes.map(c => (
          <div key={c.id} className="bg-white border border-emerald-200 rounded-xl p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <FlagTriangleRight className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-slate-800">{c.tipo_conclusao}</p>
                  {c.data_conclusao && <p className="text-xs text-slate-500">{format(new Date(c.data_conclusao), 'dd/MM/yyyy')}</p>}
                  {c.resultado_final && <p className="text-xs text-slate-600 mt-1">{c.resultado_final}</p>}
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing({ id: c.id, form: { ...c } })}><Pencil className="h-3 w-3" /></Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500" onClick={() => deleteMutation.mutate(c.id)}><Trash2 className="h-3 w-3" /></Button>
              </div>
            </div>
          </div>
        ))}
        {conclusoes.length === 0 && <p className="text-center text-slate-400 py-8 text-sm">Nenhuma conclusão registrada.</p>}
      </div>
    </div>
  );
}