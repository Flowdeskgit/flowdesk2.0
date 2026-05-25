import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { flowdesk } from '@/api/flowdeskClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, X, Save, FileText } from 'lucide-react';
import { format } from 'date-fns';

const STATUS_COLORS = {
  'Em elaboração': 'bg-slate-100 text-slate-600',
  'Protocolado': 'bg-blue-100 text-blue-700',
  'Em análise': 'bg-indigo-100 text-indigo-700',
  'Exigência emitida': 'bg-orange-100 text-orange-700',
  'Deferido': 'bg-green-100 text-green-700',
  'Indeferido': 'bg-red-100 text-red-700',
  'Concluído': 'bg-emerald-100 text-emerald-700',
};

const EMPTY = {
  tipo_requerimento: '',
  numero_protocolo: '',
  data_protocolo: '',
  canal_protocolo: '',
  descricao_pedido: '',
  documentos_apresentados: '',
  status_requerimento: 'Em elaboração',
  data_decisao: '',
  observacoes: '',
};

export default function AbaProtocolosAdm({ admId }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);

  const { data: protocolos = [] } = useQuery({
    queryKey: ['prot-adm-inss', admId],
    queryFn: () => flowdesk.entities.ProtocoloAdmINSS.filter({ administrativo_inss_id: admId }),
    enabled: !!admId,
  });

  const createMutation = useMutation({
    mutationFn: (data) => flowdesk.entities.ProtocoloAdmINSS.create({ ...data, administrativo_inss_id: admId }),
    onSuccess: () => { queryClient.invalidateQueries(['prot-adm-inss', admId]); setShowForm(false); setForm(EMPTY); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => flowdesk.entities.ProtocoloAdmINSS.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries(['prot-adm-inss', admId]); setEditing(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => flowdesk.entities.ProtocoloAdmINSS.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['prot-adm-inss', admId]),
  });

  const f = (key) => (v) => setForm(p => ({ ...p, [key]: typeof v === 'string' ? v : v.target.value }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-700">Protocolos e Requerimentos ({protocolos.length})</h3>
        <Button size="sm" onClick={() => { setShowForm(true); setForm(EMPTY); }}><Plus className="h-3 w-3 mr-1" />Novo</Button>
      </div>

      {(showForm || editing) && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>Tipo de Requerimento *</Label>
              <Select value={editing ? editing.form.tipo_requerimento : form.tipo_requerimento} onValueChange={editing ? (v) => setEditing(e => ({ ...e, form: { ...e.form, tipo_requerimento: v } })) : f('tipo_requerimento')}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {['Aposentadoria','Benefício por incapacidade','BPC/LOAS','Pensão por morte','Salário-maternidade','Revisão','Recurso administrativo','Certidão de tempo de contribuição','Emissão de guias','Cumprimento de exigência','Outro'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={editing ? editing.form.status_requerimento : form.status_requerimento} onValueChange={editing ? (v) => setEditing(e => ({ ...e, form: { ...e.form, status_requerimento: v } })) : f('status_requerimento')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['Em elaboração','Protocolado','Em análise','Exigência emitida','Deferido','Indeferido','Concluído'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Número do Protocolo</Label>
              <Input value={editing ? editing.form.numero_protocolo : form.numero_protocolo} onChange={editing ? (e) => setEditing(ed => ({ ...ed, form: { ...ed.form, numero_protocolo: e.target.value } })) : f('numero_protocolo')} />
            </div>
            <div>
              <Label>Data do Protocolo</Label>
              <Input type="date" value={editing ? editing.form.data_protocolo : form.data_protocolo} onChange={editing ? (e) => setEditing(ed => ({ ...ed, form: { ...ed.form, data_protocolo: e.target.value } })) : f('data_protocolo')} />
            </div>
            <div>
              <Label>Canal do Protocolo</Label>
              <Select value={editing ? editing.form.canal_protocolo : form.canal_protocolo} onValueChange={editing ? (v) => setEditing(e => ({ ...e, form: { ...e.form, canal_protocolo: v } })) : f('canal_protocolo')}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {['Meu INSS','Presencial','Telefone 135','Outro'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Data da Decisão</Label>
              <Input type="date" value={editing ? editing.form.data_decisao : form.data_decisao} onChange={editing ? (e) => setEditing(ed => ({ ...ed, form: { ...ed.form, data_decisao: e.target.value } })) : f('data_decisao')} />
            </div>
            <div className="md:col-span-2">
              <Label>Descrição do Pedido</Label>
              <Textarea value={editing ? editing.form.descricao_pedido : form.descricao_pedido} onChange={editing ? (e) => setEditing(ed => ({ ...ed, form: { ...ed.form, descricao_pedido: e.target.value } })) : f('descricao_pedido')} rows={2} />
            </div>
            <div className="md:col-span-2">
              <Label>Observações</Label>
              <Textarea value={editing ? editing.form.observacoes : form.observacoes} onChange={editing ? (e) => setEditing(ed => ({ ...ed, form: { ...ed.form, observacoes: e.target.value } })) : f('observacoes')} rows={2} />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="outline" onClick={() => { setShowForm(false); setEditing(null); }}><X className="h-3 w-3 mr-1" />Cancelar</Button>
            <Button size="sm" onClick={() => editing ? updateMutation.mutate({ id: editing.id, data: editing.form }) : createMutation.mutate(form)} disabled={createMutation.isPending || updateMutation.isPending}><Save className="h-3 w-3 mr-1" />Salvar</Button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {[...protocolos].sort((a, b) => new Date(b.data_protocolo) - new Date(a.data_protocolo)).map(p => (
          <div key={p.id} className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-rose-500 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-slate-800">{p.tipo_requerimento}</p>
                  {p.numero_protocolo && <p className="text-xs text-slate-500">Protocolo: {p.numero_protocolo}</p>}
                  {p.data_protocolo && <p className="text-xs text-slate-500">{format(new Date(p.data_protocolo), 'dd/MM/yyyy')}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={STATUS_COLORS[p.status_requerimento] || 'bg-slate-100'}>{p.status_requerimento}</Badge>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing({ id: p.id, form: { ...p } })}><Pencil className="h-3 w-3" /></Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500" onClick={() => deleteMutation.mutate(p.id)}><Trash2 className="h-3 w-3" /></Button>
              </div>
            </div>
            {p.descricao_pedido && <p className="text-xs text-slate-600 mt-2 border-t pt-2">{p.descricao_pedido}</p>}
          </div>
        ))}
        {protocolos.length === 0 && <p className="text-center text-slate-400 py-8 text-sm">Nenhum protocolo registrado.</p>}
      </div>
    </div>
  );
}