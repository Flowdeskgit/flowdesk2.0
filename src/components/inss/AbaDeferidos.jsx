import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { flowdesk } from '@/api/flowdeskClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, CheckCircle, Edit2, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

const BLANK = {
  protocolo_relacionado: '', tipo_beneficio_deferido: '', numero_beneficio: '',
  data_deferimento: '', data_inicio_beneficio: '', renda_mensal_inicial: '',
  valor_concedido: '', observacoes_deferimento: '', necessita_revisao_posterior: 'Não',
  status_pos_deferimento: 'Ativo',
};

export default function AbaDeferidos({ processoId, centralId, user }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(BLANK);

  const { data: deferidos = [] } = useQuery({
    queryKey: ['deferidos-inss', processoId],
    queryFn: () => flowdesk.entities.DeferidoINSS.filter({ processo_id: processoId }),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => {
      const payload = { ...data, processo_id: processoId, central_id: centralId, atualizado_por: user?.email || '' };
      if (editing) return flowdesk.entities.DeferidoINSS.update(editing.id, payload);
      return flowdesk.entities.DeferidoINSS.create({ ...payload, criado_por: user?.email || '' });
    },
    onSuccess: () => { qc.invalidateQueries(['deferidos-inss', processoId]); setOpen(false); setEditing(null); setForm(BLANK); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => flowdesk.entities.DeferidoINSS.delete(id),
    onSuccess: () => qc.invalidateQueries(['deferidos-inss', processoId]),
  });

  const openEdit = (d) => { setEditing(d); setForm({ ...d }); setOpen(true); };
  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));
  const s = (k) => (v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-slate-700 flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-green-600" /> Deferidos ({deferidos.length})
        </h3>
        <Button size="sm" onClick={() => { setEditing(null); setForm(BLANK); setOpen(true); }} className="bg-rose-600 hover:bg-rose-700">
          <Plus className="h-4 w-4 mr-1" /> Registrar Deferimento
        </Button>
      </div>

      {deferidos.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-slate-400">Nenhum deferimento registrado.</CardContent></Card>
      ) : deferidos.map(d => (
        <Card key={d.id} className="border-green-100 bg-green-50/20 hover:shadow-md transition-shadow">
          <CardHeader className="pb-2 flex flex-row items-start justify-between">
            <div>
              <CardTitle className="text-sm font-semibold text-green-800">{d.tipo_beneficio_deferido || 'Benefício Deferido'}</CardTitle>
              <p className="text-xs text-slate-500">Nº {d.numero_beneficio} {d.data_deferimento && `· ${format(new Date(d.data_deferimento + 'T00:00:00'), 'dd/MM/yyyy')}`}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-green-100 text-green-700">{d.status_pos_deferimento}</Badge>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(d)}><Edit2 className="h-3 w-3" /></Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600" onClick={() => deleteMutation.mutate(d.id)}><Trash2 className="h-3 w-3" /></Button>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs text-slate-600">
            {d.data_inicio_beneficio && <p><span className="text-slate-400">Início:</span> {format(new Date(d.data_inicio_beneficio + 'T00:00:00'), 'dd/MM/yyyy')}</p>}
            {d.renda_mensal_inicial && <p><span className="text-slate-400">RMI:</span> {Number(d.renda_mensal_inicial).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>}
            {d.valor_concedido && <p><span className="text-slate-400">Valor:</span> {Number(d.valor_concedido).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>}
            {d.necessita_revisao_posterior === 'Sim' && <p className="text-orange-600 font-medium">⚠ Necessita revisão posterior</p>}
            {d.observacoes_deferimento && <p className="col-span-full"><span className="text-slate-400">Obs:</span> {d.observacoes_deferimento}</p>}
          </CardContent>
        </Card>
      ))}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Editar Deferimento' : 'Registrar Deferimento'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Tipo de Benefício</Label><Input value={form.tipo_beneficio_deferido} onChange={f('tipo_beneficio_deferido')} className="h-8 text-sm" /></div>
            <div><Label className="text-xs">Número do Benefício</Label><Input value={form.numero_beneficio} onChange={f('numero_beneficio')} className="h-8 text-sm" /></div>
            <div><Label className="text-xs">Protocolo Relacionado</Label><Input value={form.protocolo_relacionado} onChange={f('protocolo_relacionado')} className="h-8 text-sm" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Data Deferimento</Label><Input type="date" value={form.data_deferimento} onChange={f('data_deferimento')} className="h-8 text-sm" /></div>
              <div><Label className="text-xs">Início do Benefício</Label><Input type="date" value={form.data_inicio_beneficio} onChange={f('data_inicio_beneficio')} className="h-8 text-sm" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">RMI (R$)</Label><Input type="number" value={form.renda_mensal_inicial} onChange={f('renda_mensal_inicial')} className="h-8 text-sm" /></div>
              <div><Label className="text-xs">Valor Concedido (R$)</Label><Input type="number" value={form.valor_concedido} onChange={f('valor_concedido')} className="h-8 text-sm" /></div>
            </div>
            <div>
              <Label className="text-xs">Necessita Revisão Posterior?</Label>
              <Select value={form.necessita_revisao_posterior} onValueChange={s('necessita_revisao_posterior')}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{['Sim', 'Não'].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Status Pós-Deferimento</Label>
              <Select value={form.status_pos_deferimento} onValueChange={s('status_pos_deferimento')}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{['Ativo', 'Implantado', 'Pendente de conferência', 'Encerrado'].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Observações</Label><Textarea value={form.observacoes_deferimento} onChange={f('observacoes_deferimento')} className="text-sm min-h-[60px]" /></div>
            <div className="flex gap-2 pt-2">
              <Button className="flex-1 bg-rose-600 hover:bg-rose-700" onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}>Salvar</Button>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}