import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { flowdesk } from '@/api/flowdeskClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Archive, Edit2, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

const TIPO_COLORS = {
  'Deferido finalizado': 'bg-green-100 text-green-700',
  'Indeferido encerrado': 'bg-red-100 text-red-700',
  'Desistência': 'bg-slate-100 text-slate-600',
  'Perda de objeto': 'bg-slate-100 text-slate-600',
  'Migrado para judicial': 'bg-blue-100 text-blue-700',
  'Outro': 'bg-slate-100 text-slate-600',
};

const BLANK = {
  tipo_encerramento: '', data_conclusao: '', motivo_conclusao: '',
  resultado_final: '', houve_desdobramento_judicial: 'Não', observacoes_finais: '',
};

export default function AbaConcluidos({ processoId, centralId, user }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(BLANK);

  const { data: concluidos = [] } = useQuery({
    queryKey: ['concluidos-inss', processoId],
    queryFn: () => flowdesk.entities.ConclusaoINSS.filter({ processo_id: processoId }),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => {
      const payload = { ...data, processo_id: processoId, central_id: centralId, atualizado_por: user?.email || '' };
      if (editing) return flowdesk.entities.ConclusaoINSS.update(editing.id, payload);
      return flowdesk.entities.ConclusaoINSS.create({ ...payload, criado_por: user?.email || '' });
    },
    onSuccess: () => { qc.invalidateQueries(['concluidos-inss', processoId]); setOpen(false); setEditing(null); setForm(BLANK); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => flowdesk.entities.ConclusaoINSS.delete(id),
    onSuccess: () => qc.invalidateQueries(['concluidos-inss', processoId]),
  });

  const openEdit = (c) => { setEditing(c); setForm({ ...c }); setOpen(true); };
  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));
  const s = (k) => (v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-slate-700 flex items-center gap-2">
          <Archive className="h-4 w-4 text-teal-600" /> Concluídos ({concluidos.length})
        </h3>
        <Button size="sm" onClick={() => { setEditing(null); setForm(BLANK); setOpen(true); }} className="bg-rose-600 hover:bg-rose-700">
          <Plus className="h-4 w-4 mr-1" /> Registrar Conclusão
        </Button>
      </div>

      {concluidos.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-slate-400">Nenhum encerramento registrado.</CardContent></Card>
      ) : concluidos.map(c => (
        <Card key={c.id} className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2 flex flex-row items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Badge className={TIPO_COLORS[c.tipo_encerramento] || 'bg-slate-100 text-slate-600'}>{c.tipo_encerramento}</Badge>
                {c.data_conclusao && <span className="text-xs text-slate-500">{format(new Date(c.data_conclusao + 'T00:00:00'), 'dd/MM/yyyy')}</span>}
              </div>
              {c.houve_desdobramento_judicial === 'Sim' && <p className="text-xs text-blue-600 mt-1">↗ Desdobramento judicial</p>}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(c)}><Edit2 className="h-3 w-3" /></Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600" onClick={() => deleteMutation.mutate(c.id)}><Trash2 className="h-3 w-3" /></Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-1 text-xs text-slate-600">
            {c.motivo_conclusao && <p><span className="text-slate-400">Motivo:</span> {c.motivo_conclusao}</p>}
            {c.resultado_final && <p><span className="text-slate-400">Resultado:</span> {c.resultado_final}</p>}
            {c.observacoes_finais && <p><span className="text-slate-400">Obs:</span> {c.observacoes_finais}</p>}
          </CardContent>
        </Card>
      ))}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Editar Conclusão' : 'Registrar Conclusão'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Tipo de Encerramento *</Label>
              <Select value={form.tipo_encerramento} onValueChange={s('tipo_encerramento')}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>{['Deferido finalizado', 'Indeferido encerrado', 'Desistência', 'Perda de objeto', 'Migrado para judicial', 'Outro'].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Data de Conclusão</Label><Input type="date" value={form.data_conclusao} onChange={f('data_conclusao')} className="h-8 text-sm" /></div>
            <div><Label className="text-xs">Motivo da Conclusão</Label><Textarea value={form.motivo_conclusao} onChange={f('motivo_conclusao')} className="text-sm min-h-[70px]" /></div>
            <div><Label className="text-xs">Resultado Final</Label><Textarea value={form.resultado_final} onChange={f('resultado_final')} className="text-sm min-h-[70px]" /></div>
            <div>
              <Label className="text-xs">Houve Desdobramento Judicial?</Label>
              <Select value={form.houve_desdobramento_judicial} onValueChange={s('houve_desdobramento_judicial')}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{['Sim', 'Não'].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Observações Finais</Label><Textarea value={form.observacoes_finais} onChange={f('observacoes_finais')} className="text-sm min-h-[60px]" /></div>
            <div className="flex gap-2 pt-2">
              <Button className="flex-1 bg-rose-600 hover:bg-rose-700" onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending || !form.tipo_encerramento}>Salvar</Button>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}