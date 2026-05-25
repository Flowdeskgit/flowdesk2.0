import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { flowdesk } from '@/api/flowdeskClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Pencil, Save, X } from 'lucide-react';

const STATUS_COLORS = {
  'Não iniciado': 'bg-slate-100 text-slate-600',
  'Em preparação': 'bg-blue-100 text-blue-700',
  'Protocolado': 'bg-indigo-100 text-indigo-700',
  'Aguardando agendamento': 'bg-yellow-100 text-yellow-700',
  'Aguardando perícia': 'bg-orange-100 text-orange-700',
  'Aguardando avaliação social': 'bg-orange-100 text-orange-700',
  'Exigência pendente': 'bg-red-100 text-red-700',
  'Deferido': 'bg-green-100 text-green-700',
  'Indeferido': 'bg-rose-100 text-rose-700',
  'Concluído': 'bg-emerald-100 text-emerald-700',
  'Encerrado': 'bg-slate-100 text-slate-500',
};

const PRIORIDADE_COLORS = {
  'Baixa': 'bg-green-100 text-green-700',
  'Média': 'bg-yellow-100 text-yellow-700',
  'Alta': 'bg-orange-100 text-orange-700',
  'Urgente': 'bg-red-100 text-red-700',
};

export default function AbaVisaoGeralAdm({ adm, user }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});

  const updateMutation = useMutation({
    mutationFn: (data) => flowdesk.entities.AdministrativoINSS.update(adm.id, { ...data, atualizado_por: user?.email || '' }),
    onSuccess: () => {
      queryClient.invalidateQueries(['adm-inss', adm.id]);
      setEditing(false);
    },
  });

  const startEdit = () => {
    setForm({
      numero_beneficio: adm.numero_beneficio || '',
      numero_protocolo_principal: adm.numero_protocolo_principal || '',
      tipo_administrativo: adm.tipo_administrativo || '',
      status_geral: adm.status_geral || 'Não iniciado',
      data_inicio: adm.data_inicio || '',
      unidade_responsavel: adm.unidade_responsavel || '',
      orgao_responsavel: adm.orgao_responsavel || 'INSS',
      prioridade: adm.prioridade || 'Média',
      resumo_do_caso: adm.resumo_do_caso || '',
      observacoes_gerais: adm.observacoes_gerais || '',
    });
    setEditing(true);
  };

  if (!adm) return <div className="p-4 text-slate-400">Carregando...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-700">Visão Geral</h3>
        {!editing ? (
          <Button size="sm" variant="outline" onClick={startEdit}><Pencil className="h-3 w-3 mr-1" />Editar</Button>
        ) : (
          <div className="flex gap-2">
            <Button size="sm" onClick={() => updateMutation.mutate(form)} disabled={updateMutation.isPending}><Save className="h-3 w-3 mr-1" />Salvar</Button>
            <Button size="sm" variant="outline" onClick={() => setEditing(false)}><X className="h-3 w-3" /></Button>
          </div>
        )}
      </div>

      {!editing ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InfoField label="Status Geral">
            <Badge className={STATUS_COLORS[adm.status_geral] || 'bg-slate-100'}>{adm.status_geral || '—'}</Badge>
          </InfoField>
          <InfoField label="Prioridade">
            <Badge className={PRIORIDADE_COLORS[adm.prioridade] || 'bg-slate-100'}>{adm.prioridade || '—'}</Badge>
          </InfoField>
          <InfoField label="Tipo Administrativo" value={adm.tipo_administrativo} />
          <InfoField label="Número do Benefício" value={adm.numero_beneficio} />
          <InfoField label="Protocolo Principal" value={adm.numero_protocolo_principal} />
          <InfoField label="Órgão Responsável" value={adm.orgao_responsavel} />
          <InfoField label="Unidade Responsável" value={adm.unidade_responsavel} />
          <InfoField label="Data de Início" value={adm.data_inicio} />
          <div className="md:col-span-2">
            <InfoField label="Resumo do Caso" value={adm.resumo_do_caso} multiline />
          </div>
          <div className="md:col-span-2">
            <InfoField label="Observações Gerais" value={adm.observacoes_gerais} multiline />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Status Geral</Label>
            <Select value={form.status_geral} onValueChange={v => setForm(f => ({ ...f, status_geral: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {['Não iniciado','Em preparação','Protocolado','Aguardando agendamento','Aguardando perícia','Aguardando avaliação social','Exigência pendente','Deferido','Indeferido','Concluído','Encerrado'].map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Prioridade</Label>
            <Select value={form.prioridade} onValueChange={v => setForm(f => ({ ...f, prioridade: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {['Baixa','Média','Alta','Urgente'].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Número do Benefício</Label>
            <Input value={form.numero_beneficio} onChange={e => setForm(f => ({ ...f, numero_beneficio: e.target.value }))} />
          </div>
          <div>
            <Label>Protocolo Principal</Label>
            <Input value={form.numero_protocolo_principal} onChange={e => setForm(f => ({ ...f, numero_protocolo_principal: e.target.value }))} />
          </div>
          <div>
            <Label>Órgão Responsável</Label>
            <Input value={form.orgao_responsavel} onChange={e => setForm(f => ({ ...f, orgao_responsavel: e.target.value }))} />
          </div>
          <div>
            <Label>Unidade Responsável</Label>
            <Input value={form.unidade_responsavel} onChange={e => setForm(f => ({ ...f, unidade_responsavel: e.target.value }))} />
          </div>
          <div>
            <Label>Data de Início</Label>
            <Input type="date" value={form.data_inicio} onChange={e => setForm(f => ({ ...f, data_inicio: e.target.value }))} />
          </div>
          <div className="md:col-span-2">
            <Label>Resumo do Caso</Label>
            <Textarea value={form.resumo_do_caso} onChange={e => setForm(f => ({ ...f, resumo_do_caso: e.target.value }))} rows={3} />
          </div>
          <div className="md:col-span-2">
            <Label>Observações Gerais</Label>
            <Textarea value={form.observacoes_gerais} onChange={e => setForm(f => ({ ...f, observacoes_gerais: e.target.value }))} rows={3} />
          </div>
        </div>
      )}
    </div>
  );
}

function InfoField({ label, value, children, multiline }) {
  return (
    <div>
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      {children || (
        multiline
          ? <p className="text-sm text-slate-800 bg-slate-50 rounded p-2 min-h-[40px]">{value || '—'}</p>
          : <p className="text-sm font-medium text-slate-800">{value || '—'}</p>
      )}
    </div>
  );
}