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
import { Plus, FileText, Edit2, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

const STATUS_COLORS = {
  'Em elaboração': 'bg-slate-100 text-slate-600',
  'Protocolado': 'bg-blue-100 text-blue-700',
  'Em análise': 'bg-yellow-100 text-yellow-700',
  'Exigência emitida': 'bg-orange-100 text-orange-700',
  'Deferido': 'bg-green-100 text-green-700',
  'Indeferido': 'bg-red-100 text-red-700',
  'Concluído': 'bg-teal-100 text-teal-700',
};

const BLANK = {
  tipo_requerimento: '', numero_protocolo: '', data_protocolo: '', canal_protocolo: '',
  descricao_pedido: '', documentos_apresentados: '', status_requerimento: 'Em elaboração',
  data_decisao: '', observacoes: '',
};

export default function AbaProtocolos({ processoId, centralId, user }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(BLANK);

  const { data: protocolos = [] } = useQuery({
    queryKey: ['protocolos-inss', processoId],
    queryFn: () => flowdesk.entities.ProtocoloINSS.filter({ processo_id: processoId }),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => {
      const payload = { ...data, processo_id: processoId, central_id: centralId, atualizado_por: user?.email || '' };
      if (editing) return flowdesk.entities.ProtocoloINSS.update(editing.id, payload);
      return flowdesk.entities.ProtocoloINSS.create({ ...payload, criado_por: user?.email || '' });
    },
    onSuccess: () => { qc.invalidateQueries(['protocolos-inss', processoId]); setOpen(false); setEditing(null); setForm(BLANK); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => flowdesk.entities.ProtocoloINSS.delete(id),
    onSuccess: () => qc.invalidateQueries(['protocolos-inss', processoId]),
  });

  const openEdit = (p) => { setEditing(p); setForm({ ...p }); setOpen(true); };
  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));
  const s = (k) => (v) => setForm(p => ({ ...p, [k]: v }));

  const sorted = [...protocolos].sort((a, b) => new Date(b.data_protocolo || 0) - new Date(a.data_protocolo || 0));

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-slate-700 flex items-center gap-2">
          <FileText className="h-4 w-4 text-rose-600" /> Protocolos e Requerimentos ({protocolos.length})
        </h3>
        <Button size="sm" onClick={() => { setEditing(null); setForm(BLANK); setOpen(true); }} className="bg-rose-600 hover:bg-rose-700">
          <Plus className="h-4 w-4 mr-1" /> Novo Protocolo
        </Button>
      </div>

      {sorted.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-slate-400">Nenhum protocolo registrado.</CardContent></Card>
      ) : sorted.map(p => (
        <Card key={p.id} className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2 flex flex-row items-start justify-between">
            <div>
              <CardTitle className="text-sm font-semibold">{p.tipo_requerimento}</CardTitle>
              <p className="text-xs text-slate-500">{p.numero_protocolo} {p.data_protocolo && `· ${format(new Date(p.data_protocolo + 'T00:00:00'), "dd/MM/yyyy")}`}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={STATUS_COLORS[p.status_requerimento] || 'bg-slate-100 text-slate-600'}>{p.status_requerimento}</Badge>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(p)}><Edit2 className="h-3 w-3" /></Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600" onClick={() => deleteMutation.mutate(p.id)}><Trash2 className="h-3 w-3" /></Button>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2 text-xs text-slate-600">
            {p.canal_protocolo && <p><span className="text-slate-400">Canal:</span> {p.canal_protocolo}</p>}
            {p.data_decisao && <p><span className="text-slate-400">Decisão:</span> {format(new Date(p.data_decisao + 'T00:00:00'), "dd/MM/yyyy")}</p>}
            {p.descricao_pedido && <p className="col-span-full"><span className="text-slate-400">Pedido:</span> {p.descricao_pedido}</p>}
            {p.documentos_apresentados && <p className="col-span-full"><span className="text-slate-400">Docs:</span> {p.documentos_apresentados}</p>}
            {p.observacoes && <p className="col-span-full"><span className="text-slate-400">Obs:</span> {p.observacoes}</p>}
          </CardContent>
        </Card>
      ))}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Editar Protocolo' : 'Novo Protocolo'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Tipo de Requerimento *</Label>
              <Select value={form.tipo_requerimento} onValueChange={s('tipo_requerimento')}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>{['Aposentadoria', 'Benefício por incapacidade', 'BPC/LOAS', 'Pensão por morte', 'Salário-maternidade', 'Auxílio-reclusão', 'Revisão', 'Recurso administrativo', 'Certidão de tempo de contribuição', 'Emissão de guias', 'Cumprimento de exigência', 'Outro'].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Nº Protocolo</Label><Input value={form.numero_protocolo} onChange={f('numero_protocolo')} className="h-8 text-sm" /></div>
              <div><Label className="text-xs">Data Protocolo</Label><Input type="date" value={form.data_protocolo} onChange={f('data_protocolo')} className="h-8 text-sm" /></div>
            </div>
            <div>
              <Label className="text-xs">Canal</Label>
              <Select value={form.canal_protocolo} onValueChange={s('canal_protocolo')}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>{['Meu INSS', 'Presencial', 'Telefone 135', 'Outro'].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={form.status_requerimento} onValueChange={s('status_requerimento')}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{['Em elaboração', 'Protocolado', 'Em análise', 'Exigência emitida', 'Deferido', 'Indeferido', 'Concluído'].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Descrição do Pedido</Label><Textarea value={form.descricao_pedido} onChange={f('descricao_pedido')} className="text-sm min-h-[60px]" /></div>
            <div><Label className="text-xs">Documentos Apresentados</Label><Textarea value={form.documentos_apresentados} onChange={f('documentos_apresentados')} className="text-sm min-h-[60px]" /></div>
            <div><Label className="text-xs">Data da Decisão</Label><Input type="date" value={form.data_decisao} onChange={f('data_decisao')} className="h-8 text-sm" /></div>
            <div><Label className="text-xs">Observações</Label><Textarea value={form.observacoes} onChange={f('observacoes')} className="text-sm min-h-[60px]" /></div>
            <div className="flex gap-2 pt-2">
              <Button className="flex-1 bg-rose-600 hover:bg-rose-700" onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending || !form.tipo_requerimento}>Salvar</Button>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}