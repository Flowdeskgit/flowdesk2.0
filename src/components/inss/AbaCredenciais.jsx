import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { flowdesk } from '@/api/flowdeskClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, EyeOff, Lock, Edit2, Save, X } from 'lucide-react';

const BLANK = {
  login_meu_inss: '', senha_meu_inss: '', login_gov: '', senha_gov: '',
  observacoes_acesso: '', autenticacao_dois_fatores: 'Não',
  telefone_cadastrado_gov: '', email_cadastrado_gov: '',
  ultimo_teste_acesso: '', acesso_funcionando: 'Sim',
};

export default function AbaCredenciais({ processoId, centralId, user }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [showSenhas, setShowSenhas] = useState({ meu_inss: false, gov: false });

  const { data: credencial } = useQuery({
    queryKey: ['credencial-inss', processoId],
    queryFn: () => flowdesk.entities.CredencialINSS.filter({ processo_id: processoId }),
    select: (data) => data?.[0],
  });

  useEffect(() => {
    if (credencial) setForm({ ...credencial });
    else setForm(BLANK);
  }, [credencial]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const payload = { ...data, processo_id: processoId, central_id: centralId, atualizado_por: user?.email || '' };
      if (credencial) return flowdesk.entities.CredencialINSS.update(credencial.id, payload);
      return flowdesk.entities.CredencialINSS.create({ ...payload, criado_por: user?.email || '' });
    },
    onSuccess: () => { qc.invalidateQueries(['credencial-inss', processoId]); setEditing(false); },
  });

  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));
  const s = (k) => (v) => setForm(p => ({ ...p, [k]: v }));

  const ACESSO_COLORS = { 'Sim': 'bg-green-100 text-green-700', 'Não': 'bg-red-100 text-red-700', 'Parcial': 'bg-yellow-100 text-yellow-700' };

  const PasswordField = ({ label, valueKey, showKey }) => (
    <div>
      <Label className="text-xs">{label}</Label>
      {editing ? (
        <div className="relative">
          <Input
            type={showSenhas[showKey] ? 'text' : 'password'}
            value={form[valueKey] || ''}
            onChange={f(valueKey)}
            className="h-8 text-sm pr-8"
          />
          <button
            type="button"
            className="absolute right-2 top-1.5 text-slate-400 hover:text-slate-600"
            onClick={() => setShowSenhas(p => ({ ...p, [showKey]: !p[showKey] }))}
          >
            {showSenhas[showKey] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <span className="text-sm font-mono">
            {credencial?.[valueKey] ? (showSenhas[showKey] ? credencial[valueKey] : '••••••••') : '—'}
          </span>
          {credencial?.[valueKey] && (
            <button
              type="button"
              className="text-slate-400 hover:text-slate-600"
              onClick={() => setShowSenhas(p => ({ ...p, [showKey]: !p[showKey] }))}
            >
              {showSenhas[showKey] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            </button>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Lock className="h-4 w-4 text-rose-600" /> Credenciais e Acessos
            <Badge className="bg-red-50 text-red-600 border border-red-200 text-xs ml-2">Dados Sensíveis</Badge>
          </CardTitle>
          <div className="flex gap-2">
            {editing ? (
              <>
                <Button size="sm" onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}>
                  <Save className="h-3 w-3 mr-1" /> Salvar
                </Button>
                <Button size="sm" variant="outline" onClick={() => { if (credencial) setForm({ ...credencial }); else setForm(BLANK); setEditing(false); }}>
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
        <CardContent className="space-y-6">
          {/* Meu INSS */}
          <div>
            <h4 className="text-sm font-semibold text-slate-600 mb-3 border-b pb-1">Meu INSS</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Login Meu INSS</Label>
                {editing ? <Input value={form.login_meu_inss} onChange={f('login_meu_inss')} className="h-8 text-sm" /> : <p className="text-sm">{credencial?.login_meu_inss || '—'}</p>}
              </div>
              <PasswordField label="Senha Meu INSS" valueKey="senha_meu_inss" showKey="meu_inss" />
            </div>
          </div>

          {/* Gov.br */}
          <div>
            <h4 className="text-sm font-semibold text-slate-600 mb-3 border-b pb-1">Gov.br</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Login Gov.br</Label>
                {editing ? <Input value={form.login_gov} onChange={f('login_gov')} className="h-8 text-sm" /> : <p className="text-sm">{credencial?.login_gov || '—'}</p>}
              </div>
              <PasswordField label="Senha Gov.br" valueKey="senha_gov" showKey="gov" />
              <div>
                <Label className="text-xs">Telefone Cadastrado</Label>
                {editing ? <Input value={form.telefone_cadastrado_gov} onChange={f('telefone_cadastrado_gov')} className="h-8 text-sm" /> : <p className="text-sm">{credencial?.telefone_cadastrado_gov || '—'}</p>}
              </div>
              <div>
                <Label className="text-xs">E-mail Cadastrado</Label>
                {editing ? <Input value={form.email_cadastrado_gov} onChange={f('email_cadastrado_gov')} className="h-8 text-sm" /> : <p className="text-sm">{credencial?.email_cadastrado_gov || '—'}</p>}
              </div>
            </div>
          </div>

          {/* Configurações de Acesso */}
          <div>
            <h4 className="text-sm font-semibold text-slate-600 mb-3 border-b pb-1">Configurações de Acesso</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Autenticação 2 Fatores</Label>
                {editing ? (
                  <Select value={form.autenticacao_dois_fatores} onValueChange={s('autenticacao_dois_fatores')}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>{['Sim', 'Não'].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                  </Select>
                ) : <Badge className="mt-1">{credencial?.autenticacao_dois_fatores || '—'}</Badge>}
              </div>
              <div>
                <Label className="text-xs">Acesso Funcionando</Label>
                {editing ? (
                  <Select value={form.acesso_funcionando} onValueChange={s('acesso_funcionando')}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>{['Sim', 'Não', 'Parcial'].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                  </Select>
                ) : <Badge className={`mt-1 ${ACESSO_COLORS[credencial?.acesso_funcionando] || ''}`}>{credencial?.acesso_funcionando || '—'}</Badge>}
              </div>
              <div>
                <Label className="text-xs">Último Teste</Label>
                {editing ? <Input type="datetime-local" value={form.ultimo_teste_acesso} onChange={f('ultimo_teste_acesso')} className="h-8 text-sm" /> : <p className="text-sm">{credencial?.ultimo_teste_acesso ? new Date(credencial.ultimo_teste_acesso).toLocaleString('pt-BR') : '—'}</p>}
              </div>
            </div>
          </div>

          <div>
            <Label className="text-xs">Observações de Acesso</Label>
            {editing ? <Textarea value={form.observacoes_acesso} onChange={f('observacoes_acesso')} className="text-sm min-h-[70px]" /> : <p className="text-sm text-slate-700 whitespace-pre-wrap">{credencial?.observacoes_acesso || '—'}</p>}
          </div>

          {credencial?.atualizado_por && (
            <p className="text-xs text-slate-400">Última atualização por: {credencial.atualizado_por}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}