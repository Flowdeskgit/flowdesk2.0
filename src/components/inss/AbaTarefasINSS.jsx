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
import { Plus, ListTodo, Kanban, Edit2, Trash2, AlertTriangle } from 'lucide-react';
import { format, isBefore } from 'date-fns';

const STATUS_LIST = ['A fazer', 'Em andamento', 'Aguardando cliente', 'Aguardando INSS', 'Concluída', 'Cancelada'];
const PRIORIDADE_COLORS = { 'Baixa': 'bg-slate-100 text-slate-600', 'Média': 'bg-yellow-100 text-yellow-700', 'Alta': 'bg-orange-100 text-orange-700', 'Urgente': 'bg-red-100 text-red-700' };
const STATUS_COLORS = { 'A fazer': 'bg-blue-100 text-blue-700', 'Em andamento': 'bg-purple-100 text-purple-700', 'Aguardando cliente': 'bg-orange-100 text-orange-700', 'Aguardando INSS': 'bg-yellow-100 text-yellow-700', 'Concluída': 'bg-green-100 text-green-700', 'Cancelada': 'bg-slate-100 text-slate-500' };

const BLANK = {
  titulo_tarefa: '', descricao_tarefa: '', categoria_tarefa: '', status_tarefa: 'A fazer',
  prioridade: 'Média', prazo: '', responsavel: '', vinculada_a_aba: '', item_relacionado_id: '', observacoes: '',
};

function TarefaCard({ t, onEdit, onDelete, onStatusChange }) {
  const vencida = t.prazo && t.status_tarefa !== 'Concluída' && t.status_tarefa !== 'Cancelada' && isBefore(new Date(t.prazo + 'T00:00:00'), new Date());
  return (
    <Card className={`text-xs ${vencida ? 'border-red-200 bg-red-50/30' : ''}`}>
      <CardHeader className="p-3 pb-1">
        <div className="flex items-start justify-between gap-2">
          <p className="font-medium text-slate-800 leading-tight">{t.titulo_tarefa}</p>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onEdit(t)}><Edit2 className="h-2.5 w-2.5" /></Button>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-red-400 hover:text-red-600" onClick={() => onDelete(t.id)}><Trash2 className="h-2.5 w-2.5" /></Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-1 mt-1">
          <Badge className={`text-[10px] py-0 ${PRIORIDADE_COLORS[t.prioridade]}`}>{t.prioridade}</Badge>
          {t.categoria_tarefa && <Badge variant="outline" className="text-[10px] py-0">{t.categoria_tarefa}</Badge>}
          {vencida && <Badge className="text-[10px] py-0 bg-red-100 text-red-700">⚠ Vencida</Badge>}
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-1 space-y-1">
        {t.prazo && <p className="text-slate-500">Prazo: {format(new Date(t.prazo + 'T00:00:00'), 'dd/MM/yyyy')}</p>}
        {t.responsavel && <p className="text-slate-500">Resp: {t.responsavel}</p>}
        {t.observacoes && <p className="text-slate-400 truncate">{t.observacoes}</p>}
        <div className="pt-1">
          <Select value={t.status_tarefa} onValueChange={(v) => onStatusChange(t.id, v)}>
            <SelectTrigger className="h-6 text-[10px]"><SelectValue /></SelectTrigger>
            <SelectContent>{STATUS_LIST.map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AbaTarefasINSS({ processoId, centralId, user }) {
  const qc = useQueryClient();
  const [view, setView] = useState('lista');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(BLANK);

  const { data: tarefas = [] } = useQuery({
    queryKey: ['tarefas-inss', processoId],
    queryFn: () => flowdesk.entities.TarefaINSS.filter({ processo_id: processoId }),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => {
      const payload = { ...data, processo_id: processoId, central_id: centralId, atualizado_por: user?.email || '' };
      if (editing) return flowdesk.entities.TarefaINSS.update(editing.id, payload);
      return flowdesk.entities.TarefaINSS.create({ ...payload, criado_por: user?.email || '' });
    },
    onSuccess: () => { qc.invalidateQueries(['tarefas-inss', processoId]); setOpen(false); setEditing(null); setForm(BLANK); },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => flowdesk.entities.TarefaINSS.update(id, { status_tarefa: status, atualizado_por: user?.email || '' }),
    onSuccess: () => qc.invalidateQueries(['tarefas-inss', processoId]),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => flowdesk.entities.TarefaINSS.delete(id),
    onSuccess: () => qc.invalidateQueries(['tarefas-inss', processoId]),
  });

  const openEdit = (t) => { setEditing(t); setForm({ ...t }); setOpen(true); };
  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));
  const s = (k) => (v) => setForm(p => ({ ...p, [k]: v }));

  const ativas = tarefas.filter(t => t.status_tarefa !== 'Concluída' && t.status_tarefa !== 'Cancelada');
  const vencidas = ativas.filter(t => t.prazo && isBefore(new Date(t.prazo + 'T00:00:00'), new Date()));

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold text-slate-700 flex items-center gap-2">
            <ListTodo className="h-4 w-4 text-rose-600" /> Tarefas Internas ({tarefas.length})
          </h3>
          {vencidas.length > 0 && (
            <Badge className="bg-red-100 text-red-700 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> {vencidas.length} vencida{vencidas.length > 1 ? 's' : ''}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 rounded-lg p-0.5">
            <button onClick={() => setView('lista')} className={`px-2 py-1 rounded text-xs ${view === 'lista' ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}>
              <ListTodo className="h-3 w-3" />
            </button>
            <button onClick={() => setView('kanban')} className={`px-2 py-1 rounded text-xs ${view === 'kanban' ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}>
              <Kanban className="h-3 w-3" />
            </button>
          </div>
          <Button size="sm" onClick={() => { setEditing(null); setForm(BLANK); setOpen(true); }} className="bg-rose-600 hover:bg-rose-700">
            <Plus className="h-4 w-4 mr-1" /> Nova Tarefa
          </Button>
        </div>
      </div>

      {view === 'lista' ? (
        <div className="space-y-2">
          {tarefas.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-slate-400">Nenhuma tarefa criada.</CardContent></Card>
          ) : (
            [...tarefas].sort((a, b) => {
              const ordem = ['A fazer', 'Em andamento', 'Aguardando cliente', 'Aguardando INSS', 'Concluída', 'Cancelada'];
              return ordem.indexOf(a.status_tarefa) - ordem.indexOf(b.status_tarefa);
            }).map(t => (
              <TarefaCard key={t.id} t={t} onEdit={openEdit} onDelete={(id) => deleteMutation.mutate(id)} onStatusChange={(id, status) => statusMutation.mutate({ id, status })} />
            ))
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 overflow-x-auto">
          {STATUS_LIST.map(status => {
            const col = tarefas.filter(t => t.status_tarefa === status);
            return (
              <div key={status} className="min-w-[160px]">
                <div className="mb-2 flex items-center justify-between">
                  <Badge className={`${STATUS_COLORS[status]} text-[10px]`}>{status}</Badge>
                  <span className="text-xs text-slate-400">{col.length}</span>
                </div>
                <div className="space-y-2">
                  {col.map(t => (
                    <TarefaCard key={t.id} t={t} onEdit={openEdit} onDelete={(id) => deleteMutation.mutate(id)} onStatusChange={(id, s) => statusMutation.mutate({ id, status: s })} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Editar Tarefa' : 'Nova Tarefa'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Título *</Label><Input value={form.titulo_tarefa} onChange={f('titulo_tarefa')} className="h-8 text-sm" /></div>
            <div><Label className="text-xs">Descrição</Label><Textarea value={form.descricao_tarefa} onChange={f('descricao_tarefa')} className="text-sm min-h-[60px]" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Categoria</Label>
                <Select value={form.categoria_tarefa} onValueChange={s('categoria_tarefa')}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="..." /></SelectTrigger>
                  <SelectContent>{['Agendamento', 'Protocolo', 'Exigência', 'Análise documental', 'Recurso', 'Contato com cliente', 'Acesso Meu INSS', 'Conferência', 'Outro'].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Status</Label>
                <Select value={form.status_tarefa} onValueChange={s('status_tarefa')}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUS_LIST.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Prioridade</Label>
                <Select value={form.prioridade} onValueChange={s('prioridade')}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{['Baixa', 'Média', 'Alta', 'Urgente'].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Prazo</Label><Input type="date" value={form.prazo} onChange={f('prazo')} className="h-8 text-sm" /></div>
            </div>
            <div><Label className="text-xs">Responsável</Label><Input value={form.responsavel} onChange={f('responsavel')} className="h-8 text-sm" /></div>
            <div>
              <Label className="text-xs">Vinculada à Aba</Label>
              <Select value={form.vinculada_a_aba} onValueChange={s('vinculada_a_aba')}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="..." /></SelectTrigger>
                <SelectContent>{['Visão geral', 'Agendamentos', 'Protocolos', 'Exigências', 'Deferidos', 'Indeferidos', 'Concluídos', 'Credenciais'].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Observações</Label><Textarea value={form.observacoes} onChange={f('observacoes')} className="text-sm min-h-[50px]" /></div>
            <div className="flex gap-2 pt-2">
              <Button className="flex-1 bg-rose-600 hover:bg-rose-700" onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending || !form.titulo_tarefa}>Salvar</Button>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}