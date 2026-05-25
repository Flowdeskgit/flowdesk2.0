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
import { Plus, AlertTriangle, Edit2, Trash2 } from 'lucide-react';
import { format, isBefore, addDays } from 'date-fns';

const STATUS_COLORS = {
  'Pendente': 'bg-yellow-100 text-yellow-700',
  'Em andamento': 'bg-blue-100 text-blue-700',
  'Aguardando cliente': 'bg-orange-100 text-orange-700',
  'Cumprida': 'bg-green-100 text-green-700',
  'Enviada': 'bg-teal-100 text-teal-700',
  'Vencida': 'bg-red-100 text-red-700',
  'Cancelada': 'bg-slate-100 text-slate-500',
};

const BLANK = {
  protocolo_relacionado: '', data_emissao_exigencia: '', prazo_final: '', descricao_exigencia: '',
  documentos_solicitados: '', responsavel_interno: '', status_exigencia: 'Pendente',
  data_cumprimento: '', forma_cumprimento: '', comprovante_envio: '', observacoes: '',
};

function prazoLabel(prazo_final, status) {
  if (!prazo_final || status === 'Cumprida' || status === 'Cancelada') return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(prazo_final + 'T00:00:00');
  if (isBefore(d, today)) return { label: 'Vencida', color: 'text-red-600' };
  if (isBefore(d, addDays(today, 5))) return { label: 'Próxima do vencimento', color: 'text-orange-500' };
  return null;
}

export default function AbaExigencias({ processoId, centralId, user, onTarefaCriada }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(BLANK);

  const { data: exigencias = [] } = useQuery({
    queryKey: ['exigencias-inss', processoId],
    queryFn: () => flowdesk.entities.ExigenciaINSS.filter({ processo_id: processoId }),
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const payload = { ...data, processo_id: processoId, central_id: centralId, atualizado_por: user?.email || '' };
      if (editing) return flowdesk.entities.ExigenciaINSS.update(editing.id, payload);
      return flowdesk.entities.ExigenciaINSS.create({ ...payload, criado_por: user?.email || '' });
    },
    onSuccess: async (saved) => {
      qc.invalidateQueries(['exigencias-inss', processoId]);
      if (!editing) {
        await flowdesk.entities.TarefaINSS.create({
          processo_id: processoId,
          central_id: centralId,
          titulo_tarefa: `Cumprir exigência: ${form.descricao_exigencia?.substring(0, 60)}`,
          categoria_tarefa: 'Exigência',
          status_tarefa: 'A fazer',
          prioridade: 'Alta',
          prazo: form.prazo_final || '',
          responsavel: form.responsavel_interno || '',
          vinculada_a_aba: 'Exigências',
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
    mutationFn: (id) => flowdesk.entities.ExigenciaINSS.delete(id),
    onSuccess: () => qc.invalidateQueries(['exigencias-inss', processoId]),
  });

  const openEdit = (e) => { setEditing(e); setForm({ ...e }); setOpen(true); };
  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));
  const s = (k) => (v) => setForm(p => ({ ...p, [k]: v }));

  const sorted = [...exigencias].sort((a, b) => new Date(a.prazo_final || '9999') - new Date(b.prazo_final || '9999'));

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-slate-700 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-orange-500" /> Exigências ({exigencias.length})
        </h3>
        <Button size="sm" onClick={() => { setEditing(null); setForm(BLANK); setOpen(true); }} className="bg-rose-600 hover:bg-rose-700">
          <Plus className="h-4 w-4 mr-1" /> Nova Exigência
        </Button>
      </div>

      {sorted.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-slate-400">Nenhuma exigência registrada.</CardContent></Card>
      ) : sorted.map(e => {
        const alerta = prazoLabel(e.prazo_final, e.status_exigencia);
        return (
          <Card key={e.id} className={`hover:shadow-md transition-shadow ${alerta?.color === 'text-red-600' ? 'border-red-200 bg-red-50/30' : alerta ? 'border-orange-200 bg-orange-50/20' : ''}`}>
            <CardHeader className="pb-2 flex flex-row items-start justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">{e.descricao_exigencia?.substring(0, 80)}</CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  {e.prazo_final && <p className="text-xs text-slate-500">Prazo: {format(new Date(e.prazo_final + 'T00:00:00'), 'dd/MM/yyyy')}</p>}
                  {alerta && <span className={`text-xs font-medium ${alerta.color}`}>⚠ {alerta.label}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={STATUS_COLORS[e.status_exigencia] || 'bg-slate-100 text-slate-600'}>{e.status_exigencia}</Badge>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(e)}><Edit2 className="h-3 w-3" /></Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600" onClick={() => deleteMutation.mutate(e.id)}><Trash2 className="h-3 w-3" /></Button>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2 text-xs text-slate-600">
              {e.protocolo_relacionado && <p><span className="text-slate-400">Protocolo:</span> {e.protocolo_relacionado}</p>}
              {e.responsavel_interno && <p><span className="text-slate-400">Responsável:</span> {e.responsavel_interno}</p>}
              {e.documentos_solicitados && <p className="col-span-full"><span className="text-slate-400">Docs solicitados:</span> {e.documentos_solicitados}</p>}
              {e.forma_cumprimento && <p className="col-span-full"><span className="text-slate-400">Forma de cumprimento:</span> {e.forma_cumprimento}</p>}
              {e.observacoes && <p className="col-span-full"><span className="text-slate-400">Obs:</span> {e.observacoes}</p>}
            </CardContent>
          </Card>
        );
      })}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Editar Exigência' : 'Nova Exigência'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Descrição da Exigência *</Label><Textarea value={form.descricao_exigencia} onChange={f('descricao_exigencia')} className="text-sm min-h-[80px]" /></div>
            <div><Label className="text-xs">Protocolo Relacionado</Label><Input value={form.protocolo_relacionado} onChange={f('protocolo_relacionado')} className="h-8 text-sm" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Data Emissão</Label><Input type="date" value={form.data_emissao_exigencia} onChange={f('data_emissao_exigencia')} className="h-8 text-sm" /></div>
              <div><Label className="text-xs">Prazo Final</Label><Input type="date" value={form.prazo_final} onChange={f('prazo_final')} className="h-8 text-sm" /></div>
            </div>
            <div><Label className="text-xs">Documentos Solicitados</Label><Textarea value={form.documentos_solicitados} onChange={f('documentos_solicitados')} className="text-sm min-h-[60px]" /></div>
            <div><Label className="text-xs">Responsável Interno</Label><Input value={form.responsavel_interno} onChange={f('responsavel_interno')} className="h-8 text-sm" /></div>
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={form.status_exigencia} onValueChange={s('status_exigencia')}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{['Pendente', 'Em andamento', 'Aguardando cliente', 'Cumprida', 'Enviada', 'Vencida', 'Cancelada'].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Data de Cumprimento</Label><Input type="date" value={form.data_cumprimento} onChange={f('data_cumprimento')} className="h-8 text-sm" /></div>
            <div><Label className="text-xs">Forma de Cumprimento</Label><Input value={form.forma_cumprimento} onChange={f('forma_cumprimento')} className="h-8 text-sm" /></div>
            <div><Label className="text-xs">Comprovante/Protocolo de Envio</Label><Input value={form.comprovante_envio} onChange={f('comprovante_envio')} className="h-8 text-sm" /></div>
            <div><Label className="text-xs">Observações</Label><Textarea value={form.observacoes} onChange={f('observacoes')} className="text-sm min-h-[60px]" /></div>
            <p className="text-xs text-blue-600 bg-blue-50 p-2 rounded">Ao salvar uma nova exigência, uma tarefa interna será criada automaticamente.</p>
            <div className="flex gap-2 pt-2">
              <Button className="flex-1 bg-rose-600 hover:bg-rose-700" onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending || !form.descricao_exigencia}>Salvar</Button>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}