import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { flowdesk } from '@/api/flowdeskClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Edit2, Save, X, FileText } from 'lucide-react';

const STATUS_COLORS = {
  'Não iniciado': 'bg-slate-100 text-slate-700',
  'Em preparação': 'bg-blue-100 text-blue-700',
  'Protocolado': 'bg-purple-100 text-purple-700',
  'Aguardando agendamento': 'bg-yellow-100 text-yellow-700',
  'Aguardando análise': 'bg-orange-100 text-orange-700',
  'Exigência pendente': 'bg-red-100 text-red-700',
  'Deferido': 'bg-green-100 text-green-700',
  'Indeferido': 'bg-rose-100 text-rose-700',
  'Concluído': 'bg-teal-100 text-teal-700',
};

export default function AbaVisaoGeral({ central, processoId, clienteId, user }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});

  useEffect(() => {
    if (central) setForm({ ...central });
  }, [central]);

  const updateMutation = useMutation({
    mutationFn: (data) => flowdesk.entities.CentralAdminINSS.update(central.id, {
      ...data,
      atualizado_por: user?.email || '',
    }),
    onSuccess: () => {
      qc.invalidateQueries(['central-inss', processoId]);
      setEditing(false);
    },
  });

  if (!central) return <div className="p-8 text-center text-slate-400">Carregando visão geral...</div>;

  const field = (label, key, type = 'text') => (
    <div>
      <Label className="text-xs text-slate-500 mb-1 block">{label}</Label>
      {editing ? (
        <Input value={form[key] || ''} type={type} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} className="h-8 text-sm" />
      ) : (
        <p className="text-sm text-slate-800 font-medium">{central[key] || <span className="text-slate-400">—</span>}</p>
      )}
    </div>
  );

  const selectField = (label, key, options) => (
    <div>
      <Label className="text-xs text-slate-500 mb-1 block">{label}</Label>
      {editing ? (
        <Select value={form[key] || ''} onValueChange={v => setForm(p => ({ ...p, [key]: v }))}>
          <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>{options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
        </Select>
      ) : (
        <Badge className={STATUS_COLORS[central[key]] || 'bg-slate-100 text-slate-700'}>{central[key] || '—'}</Badge>
      )}
    </div>
  );

  const textareaField = (label, key) => (
    <div>
      <Label className="text-xs text-slate-500 mb-1 block">{label}</Label>
      {editing ? (
        <Textarea value={form[key] || ''} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} className="text-sm min-h-[80px]" />
      ) : (
        <p className="text-sm text-slate-700 whitespace-pre-wrap">{central[key] || <span className="text-slate-400">—</span>}</p>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4 text-rose-600" /> Visão Geral do Administrativo INSS
          </CardTitle>
          <div className="flex gap-2">
            {editing ? (
              <>
                <Button size="sm" onClick={() => updateMutation.mutate(form)} disabled={updateMutation.isPending}>
                  <Save className="h-3 w-3 mr-1" /> Salvar
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setForm({ ...central }); setEditing(false); }}>
                  <X className="h-3 w-3" />
                </Button>
              </>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                <Edit2 className="h-3 w-3 mr-1" /> Editar
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {selectField('Status Administrativo Geral', 'status_administrativo_geral', ['Não iniciado', 'Em preparação', 'Protocolado', 'Aguardando agendamento', 'Aguardando análise', 'Exigência pendente', 'Deferido', 'Indeferido', 'Concluído'])}
          {selectField('Prioridade', 'prioridade', ['Baixa', 'Média', 'Alta', 'Urgente'])}
          {field('Número do Benefício', 'numero_beneficio')}
          {field('Espécie do Benefício', 'especie_beneficio')}
          {field('Tipo de Requerimento', 'tipo_requerimento')}
          {field('Nº Protocolo Principal', 'numero_protocolo_principal')}
          {field('Data Protocolo Principal', 'data_protocolo_principal', 'date')}
          {field('Unidade Responsável', 'unidade_responsavel')}
          {field('Servidor Responsável', 'servidor_responsavel')}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-slate-600">Resumo e Observações</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {textareaField('Resumo do Caso', 'resumo_do_caso')}
          {textareaField('Observações Gerais', 'observacoes_gerais')}
        </CardContent>
      </Card>

      {central.atualizado_por && (
        <p className="text-xs text-slate-400">Última atualização por: {central.atualizado_por}</p>
      )}
    </div>
  );
}