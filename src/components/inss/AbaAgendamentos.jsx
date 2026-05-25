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
import { Plus, Calendar, Edit2, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const STATUS_COLORS = {
  'Pendente': 'bg-yellow-100 text-yellow-700',
  'Agendado': 'bg-blue-100 text-blue-700',
  'Reagendado': 'bg-orange-100 text-orange-700',
  'Realizado': 'bg-green-100 text-green-700',
  'Não compareceu': 'bg-red-100 text-red-700',
  'Cancelado': 'bg-slate-100 text-slate-500',
};

const BLANK = {
  tipo_agendamento: '', data_agendada: '', hora_agendada: '', local_agendamento: '',
  unidade_inss: '', protocolo_relacionado: '', status_agendamento: 'Pendente',
  resultado_agendamento: '', documentos_necessarios: '', observacoes: '',
};

export default function AbaAgendamentos({ processoId, centralId, user, onTarefaCriada }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(BLANK);

  const { data: agendamentos = [] } = useQuery({
    queryKey: ['agendamentos-inss', processoId],
    queryFn: () => flowdesk.entities.AgendamentoINSSAdmin.filter({ processo_id: processoId }),
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const payload = { ...data, processo_id: processoId, central_id: centralId, atualizado_por: user?.email || '' };
      if (editing) return flowdesk.entities.AgendamentoINSSAdmin.update(editing.id, payload);
      return flowdesk.entities.AgendamentoINSSAdmin.create({ ...payload, criado_por: user?.email || '' });
    },
    onSuccess: async (saved) => {
      qc.invalidateQueries(['agendamentos-inss', processoId]);
      // Auto-criar tarefa para agendamentos futuros
      if (!editing && form.data_agendada && new Date(form.data_agendada) >= new Date()) {
        await flowdesk.entities.TarefaINSS.create({
          processo_id: processoId,
          central_id: centralId,
          titulo_tarefa: `Acompanhar agendamento: ${form.tipo_agendamento}`,
          categoria_tarefa: 'Agendamento',
          status_tarefa: 'A fazer',
          prioridade: 'Média',
          prazo: form.data_agendada,
          vinculada_a_aba: 'Agendamentos',
          item_relacionado_id: saved?.id || '',
          criado_por: user?.email || '',
          atualizado_por: user?.email || '',
        });
        qc.invalidateQueries(['tarefas-inss', processoId]);
      }
      setOpen(false);
      setEditing(null);
      setForm(BLANK);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => flowdesk.entities.AgendamentoINSSAdmin.delete(id),
    onSuccess: () => qc.invalidateQueries(['agendamentos-inss', processoId]),
  });

  const openEdit = (ag) => { setEditing(ag); setForm({ ...ag }); setOpen(true); };
  const openNew = () => { setEditing(null); setForm(BLANK); setOpen(true); };
  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));
  const s = (k) => (v) => setForm(p => ({ ...p, [k]: v }));

  const sorted = [...agendamentos].sort((a, b) => new Date(b.data_agendada) - new Date(a.data_agendada));

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-slate-700 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-rose-600" /> Agendamentos ({agendamentos.length})
        </h3>
        <Button size="sm" onClick={openNew} className="bg-rose-600 hover:bg-rose-700">
          <Plus className="h-4 w-4 mr-1" /> Novo Agendamento
        </Button>
      </div>

      {sorted.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-slate-400">Nenhum agendamento registrado.</CardContent></Card>
      ) : (
        sorted.map(ag => (
          <Card key={ag.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2 flex flex-row items-start justify-between">
              <div>
                <CardTitle className="text-sm font-semibold text-slate-800">{ag.tipo_agendamento}</CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  {ag.data_agendada && format(new Date(ag.data_agendada + 'T00:00:00'), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  {ag.hora_agendada && ` às ${ag.hora_agendada}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={STATUS_COLORS[ag.status_agendamento] || 'bg-slate-100 text-slate-600'}>{ag.status_agendamento}</Badge>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(ag)}><Edit2 className="h-3 w-3" /></Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600" onClick={() => deleteMutation.mutate(ag.id)}><Trash2 className="h-3 w-3" /></Button>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs text-slate-600">
              {ag.local_agendamento && <p><span className="text-slate-400">Local:</span> {ag.local_agendamento}</p>}
              {ag.unidade_inss && <p><span className="text-slate-400">Unidade:</span> {ag.unidade_inss}</p>}
              {ag.protocolo_relacionado && <p><span className="text-slate-400">Protocolo:</span> {ag.protocolo_relacionado}</p>}
              {ag.documentos_necessarios && <p className="col-span-full"><span className="text-slate-400">Docs:</span> {ag.documentos_necessarios}</p>}
              {ag.resultado_agendamento && <p className="col-span-full"><span className="text-slate-400">Resultado:</span> {ag.resultado_agendamento}</p>}
              {ag.observacoes && <p className="col-span-full"><span className="text-slate-400">Obs:</span> {ag.observacoes}</p>}
            </CardContent>
          </Card>
        ))
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Agendamento' : 'Novo Agendamento'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Tipo de Agendamento *</Label>
              <Select value={form.tipo_agendamento} onValueChange={s('tipo_agendamento')}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {['Perícia médica', 'Avaliação social', 'Cumprimento de exigência', 'Atendimento presencial', 'Entrega de documentos', 'Justificação administrativa', 'Reabilitação profissional', 'Outro'].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Data *</Label><Input type="date" value={form.data_agendada} onChange={f('data_agendada')} className="h-8 text-sm" /></div>
              <div><Label className="text-xs">Hora</Label><Input type="time" value={form.hora_agendada} onChange={f('hora_agendada')} className="h-8 text-sm" /></div>
            </div>
            <div><Label className="text-xs">Local</Label><Input value={form.local_agendamento} onChange={f('local_agendamento')} className="h-8 text-sm" /></div>
            <div><Label className="text-xs">Unidade INSS</Label><Input value={form.unidade_inss} onChange={f('unidade_inss')} className="h-8 text-sm" /></div>
            <div><Label className="text-xs">Protocolo Relacionado</Label><Input value={form.protocolo_relacionado} onChange={f('protocolo_relacionado')} className="h-8 text-sm" /></div>
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={form.status_agendamento} onValueChange={s('status_agendamento')}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{['Pendente', 'Agendado', 'Reagendado', 'Realizado', 'Não compareceu', 'Cancelado'].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Documentos Necessários</Label><Textarea value={form.documentos_necessarios} onChange={f('documentos_necessarios')} className="text-sm min-h-[60px]" /></div>
            <div><Label className="text-xs">Resultado</Label><Textarea value={form.resultado_agendamento} onChange={f('resultado_agendamento')} className="text-sm min-h-[60px]" /></div>
            <div><Label className="text-xs">Observações</Label><Textarea value={form.observacoes} onChange={f('observacoes')} className="text-sm min-h-[60px]" /></div>
            <div className="flex gap-2 pt-2">
              <Button className="flex-1 bg-rose-600 hover:bg-rose-700" onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending || !form.tipo_agendamento || !form.data_agendada}>Salvar</Button>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}