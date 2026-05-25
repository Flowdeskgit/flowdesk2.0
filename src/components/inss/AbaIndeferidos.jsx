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
import { Plus, XCircle, Edit2, Trash2 } from 'lucide-react';
import { format, isBefore, addDays } from 'date-fns';

const BLANK = {
  protocolo_relacionado: '', data_indeferimento: '', motivo_indeferimento: '',
  fundamento_resumido: '', possibilidade_de_recurso: 'Analisar', prazo_para_recurso: '',
  recurso_interposto: 'Não', data_recurso: '', observacoes: '',
};

export default function AbaIndeferidos({ processoId, centralId, user, onTarefaCriada }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(BLANK);

  const { data: indeferidos = [] } = useQuery({
    queryKey: ['indeferidos-inss', processoId],
    queryFn: () => flowdesk.entities.IndeferidoINSS.filter({ processo_id: processoId }),
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const payload = { ...data, processo_id: processoId, central_id: centralId, atualizado_por: user?.email || '' };
      if (editing) return flowdesk.entities.IndeferidoINSS.update(editing.id, payload);
      return flowdesk.entities.IndeferidoINSS.create({ ...payload, criado_por: user?.email || '' });
    },
    onSuccess: async (saved) => {
      qc.invalidateQueries(['indeferidos-inss', processoId]);
      if (!editing && form.possibilidade_de_recurso === 'Sim') {
        await flowdesk.entities.TarefaINSS.create({
          processo_id: processoId,
          central_id: centralId,
          titulo_tarefa: 'Analisar recurso administrativo',
          categoria_tarefa: 'Recurso',
          status_tarefa: 'A fazer',
          prioridade: 'Alta',
          prazo: form.prazo_para_recurso || '',
          vinculada_a_aba: 'Indeferidos',
          item_relacionado_id: saved?.id || '',
          criado_por: user?.email || '',
          atualizado_por: user?.email || '',
        });
        qc.invalidateQueries(['tarefas-inss', processoId]);
      }
      setOpen(false); setEditing(null); setForm(BLANK);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => flowdesk.entities.IndeferidoINSS.delete(id),
    onSuccess: () => qc.invalidateQueries(['indeferidos-inss', processoId]),
  });

  const openEdit = (i) => { setEditing(i); setForm({ ...i }); setOpen(true); };
  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));
  const s = (k) => (v) => setForm(p => ({ ...p, [k]: v }));

  const prazoAlerta = (prazo) => {
    if (!prazo) return null;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const d = new Date(prazo + 'T00:00:00');
    if (isBefore(d, today)) return 'text-red-600';
    if (isBefore(d, addDays(today, 7))) return 'text-orange-500';
    return null;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-slate-700 flex items-center gap-2">
          <XCircle className="h-4 w-4 text-red-500" /> Indeferidos ({indeferidos.length})
        </h3>
        <Button size="sm" onClick={() => { setEditing(null); setForm(BLANK); setOpen(true); }} className="bg-rose-600 hover:bg-rose-700">
          <Plus className="h-4 w-4 mr-1" /> Registrar Indeferimento
        </Button>
      </div>

      {indeferidos.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-slate-400">Nenhum indeferimento registrado.</CardContent></Card>
      ) : indeferidos.map(i => {
        const alertaColor = prazoAlerta(i.prazo_para_recurso);
        return (
          <Card key={i.id} className="border-red-100 bg-red-50/20 hover:shadow-md transition-shadow">
            <CardHeader className="pb-2 flex flex-row items-start justify-between">
              <div>
                <CardTitle className="text-sm font-semibold text-red-800">
                  Indeferimento {i.data_indeferimento && format(new Date(i.data_indeferimento + 'T00:00:00'), 'dd/MM/yyyy')}
                </CardTitle>
                <div className="flex items-center gap-3 mt-1">
                  <Badge className={i.possibilidade_de_recurso === 'Sim' ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-600'}>
                    Recurso: {i.possibilidade_de_recurso}
                  </Badge>
                  {i.prazo_para_recurso && (
                    <span className={`text-xs ${alertaColor || 'text-slate-500'}`}>
                      Prazo recurso: {format(new Date(i.prazo_para_recurso + 'T00:00:00'), 'dd/MM/yyyy')}
                      {alertaColor && ' ⚠'}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(i)}><Edit2 className="h-3 w-3" /></Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600" onClick={() => deleteMutation.mutate(i.id)}><Trash2 className="h-3 w-3" /></Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-1 text-xs text-slate-600">
              {i.motivo_indeferimento && <p><span className="text-slate-400">Motivo:</span> {i.motivo_indeferimento}</p>}
              {i.fundamento_resumido && <p><span className="text-slate-400">Fundamento:</span> {i.fundamento_resumido}</p>}
              {i.recurso_interposto === 'Sim' && <p className="text-green-600">✓ Recurso interposto em {i.data_recurso && format(new Date(i.data_recurso + 'T00:00:00'), 'dd/MM/yyyy')}</p>}
              {i.observacoes && <p><span className="text-slate-400">Obs:</span> {i.observacoes}</p>}
            </CardContent>
          </Card>
        );
      })}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Editar Indeferimento' : 'Registrar Indeferimento'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Protocolo Relacionado</Label><Input value={form.protocolo_relacionado} onChange={f('protocolo_relacionado')} className="h-8 text-sm" /></div>
            <div><Label className="text-xs">Data do Indeferimento</Label><Input type="date" value={form.data_indeferimento} onChange={f('data_indeferimento')} className="h-8 text-sm" /></div>
            <div><Label className="text-xs">Motivo do Indeferimento</Label><Textarea value={form.motivo_indeferimento} onChange={f('motivo_indeferimento')} className="text-sm min-h-[80px]" /></div>
            <div><Label className="text-xs">Fundamento Resumido</Label><Textarea value={form.fundamento_resumido} onChange={f('fundamento_resumido')} className="text-sm min-h-[60px]" /></div>
            <div>
              <Label className="text-xs">Possibilidade de Recurso</Label>
              <Select value={form.possibilidade_de_recurso} onValueChange={s('possibilidade_de_recurso')}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{['Sim', 'Não', 'Analisar'].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Prazo para Recurso</Label><Input type="date" value={form.prazo_para_recurso} onChange={f('prazo_para_recurso')} className="h-8 text-sm" /></div>
            <div>
              <Label className="text-xs">Recurso Interposto?</Label>
              <Select value={form.recurso_interposto} onValueChange={s('recurso_interposto')}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{['Sim', 'Não'].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Data do Recurso</Label><Input type="date" value={form.data_recurso} onChange={f('data_recurso')} className="h-8 text-sm" /></div>
            <div><Label className="text-xs">Observações</Label><Textarea value={form.observacoes} onChange={f('observacoes')} className="text-sm min-h-[60px]" /></div>
            {form.possibilidade_de_recurso === 'Sim' && !editing && (
              <p className="text-xs text-orange-600 bg-orange-50 p-2 rounded">Uma tarefa "Analisar recurso administrativo" será criada automaticamente.</p>
            )}
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