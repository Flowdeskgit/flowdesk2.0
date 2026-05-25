import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Phone, MessageCircle, Plus } from 'lucide-react';

const STATUS_OPTS = ['Novo', 'Em Contato', 'Qualificado', 'Convertido', 'Perdido', 'Desqualificado'];
const ORIGEM_OPTS = ['Instagram', 'Facebook', 'Google', 'Indicação', 'Site', 'WhatsApp', 'Campanha', 'Outro'];
const INTERESSE_OPTS = ['BPC', 'Aposentadoria', 'Revisão', 'INSS', 'Família', 'Trabalhista', 'Outro'];

export default function LeadDialog({ open, onOpenChange, lead, pessoas, onSave }) {
  const [form, setForm] = useState({
    nome: '', contato: '', email: '', origem: '', interesse: '',
    responsavel_id: '', observacoes: '', status: 'Novo', proxima_acao: '', data_proxima_acao: ''
  });
  const [newInteracao, setNewInteracao] = useState('');
  const [tipoInteracao, setTipoInteracao] = useState('Ligação');

  useEffect(() => {
    if (lead) {
      setForm({
        nome: lead.nome || '',
        contato: lead.contato || '',
        email: lead.email || '',
        origem: lead.origem || '',
        interesse: lead.interesse || '',
        responsavel_id: lead.responsavel_id || '',
        observacoes: lead.observacoes || '',
        status: lead.status || 'Novo',
        proxima_acao: lead.proxima_acao || '',
        data_proxima_acao: lead.data_proxima_acao || '',
      });
    } else {
      setForm({ nome: '', contato: '', email: '', origem: '', interesse: '', responsavel_id: '', observacoes: '', status: 'Novo', proxima_acao: '', data_proxima_acao: '' });
    }
    setNewInteracao('');
  }, [lead, open]);

  const historico = Array.isArray(lead?.historico) ? lead.historico : [];

  const handleSave = () => {
    if (!form.nome.trim()) return;
    onSave({ ...form }, newInteracao.trim() ? { tipo: tipoInteracao, descricao: newInteracao.trim() } : null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{lead ? `Lead: ${lead.nome}` : 'Novo Lead'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Ações rápidas no topo se editando */}
          {lead?.contato && (
            <div className="flex gap-2">
              <a href={`tel:${lead.contato}`} className="flex-1">
                <Button variant="outline" className="w-full text-slate-700">
                  <Phone className="mr-2 h-4 w-4" /> Ligar
                </Button>
              </a>
              <a href={`https://wa.me/55${lead.contato.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="flex-1">
                <Button variant="outline" className="w-full text-green-700 border-green-200 bg-green-50 hover:bg-green-100">
                  <MessageCircle className="mr-2 h-4 w-4" /> WhatsApp
                </Button>
              </a>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <Label>Nome *</Label>
              <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Nome completo" />
            </div>
            <div className="space-y-1">
              <Label>Telefone / WhatsApp</Label>
              <Input value={form.contato} onChange={(e) => setForm({ ...form, contato: e.target.value })} placeholder="(11) 99999-9999" />
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@exemplo.com" />
            </div>
            <div className="space-y-1">
              <Label>Origem do Lead</Label>
              <Select value={form.origem} onValueChange={(v) => setForm({ ...form, origem: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {ORIGEM_OPTS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Área de Interesse</Label>
              <Select value={form.interesse} onValueChange={(v) => setForm({ ...form, interesse: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {INTERESSE_OPTS.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Responsável</Label>
              <Select value={form.responsavel_id} onValueChange={(v) => setForm({ ...form, responsavel_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {pessoas.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Próxima Ação</Label>
              <Input value={form.proxima_acao} onChange={(e) => setForm({ ...form, proxima_acao: e.target.value })} placeholder="Ex: Ligar para confirmar" />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Observações</Label>
              <Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} rows={2} placeholder="Informações adicionais..." />
            </div>
          </div>

          {/* Registrar nova interação */}
          <div className="rounded-xl border border-slate-200 p-4 space-y-3">
            <h4 className="font-semibold text-slate-700 text-sm flex items-center gap-2">
              <Plus className="h-4 w-4" /> Registrar Interação
            </h4>
            <div className="flex gap-2">
              <Select value={tipoInteracao} onValueChange={setTipoInteracao}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['Ligação', 'Mensagem', 'Reunião', 'Anotação', 'Proposta'].map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input value={newInteracao} onChange={(e) => setNewInteracao(e.target.value)} placeholder="Descreva a interação..." className="flex-1" />
            </div>
          </div>

          {/* Histórico */}
          {historico.length > 0 && (
            <div className="rounded-xl border border-slate-200 p-4 space-y-2">
              <h4 className="font-semibold text-slate-700 text-sm">Histórico</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {historico.slice().reverse().map((h, i) => (
                  <div key={i} className="text-xs text-slate-600 border-l-2 border-slate-200 pl-2">
                    <span className="font-semibold text-slate-500">{h}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSave} className="bg-slate-900 hover:bg-slate-800">
              {lead ? 'Salvar' : 'Criar Lead'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}