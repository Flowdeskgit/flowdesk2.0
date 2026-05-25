import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const STATUS_TAREFA_OPTIONS = [
  { value: 'Pendente', label: 'Pendente', color: 'text-yellow-700' },
  { value: 'Em andamento', label: 'Em andamento', color: 'text-blue-700' },
  { value: 'Atrasada', label: 'Atrasada', color: 'text-red-700' },
  { value: 'Concluída', label: 'Concluída', color: 'text-green-700' },
];

export function ConvertTarefaDialog({
  isOpen, onClose, publicacao, responsavelId, setResponsavelId,
  dataVencimento, setDataVencimento, descricao, setDescricao,
  statusTarefa, setStatusTarefa,
  pessoas, isPending, onSubmit,
}) {
  return (
    <Dialog open={isOpen} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Converter Publicação em Tarefa</DialogTitle></DialogHeader>
        <div className="space-y-4">
          {publicacao && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-sm text-slate-700"><span className="font-semibold">Processo:</span> {publicacao.processo || '-'}</p>
              <p className="text-xs text-slate-500"><span className="font-semibold">Parte:</span> {publicacao.parte || '-'}</p>
              <p className="text-xs text-slate-500"><span className="font-semibold">Row:</span> {publicacao.rowNumber ?? '-'}</p>
            </div>
          )}
          <div className="space-y-2">
            <Label>Responsável pela Execução *</Label>
            <Select value={responsavelId} onValueChange={setResponsavelId}>
              <SelectTrigger><SelectValue placeholder="Selecione o responsável..." /></SelectTrigger>
              <SelectContent>
                {pessoas.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Status da Tarefa *</Label>
            <Select value={statusTarefa || 'Pendente'} onValueChange={setStatusTarefa}>
              <SelectTrigger><SelectValue placeholder="Selecione o status..." /></SelectTrigger>
              <SelectContent>
                {STATUS_TAREFA_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <span className={opt.color}>{opt.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500">Por padrão "Pendente". Será atualizado automaticamente para "Atrasada" se a data vencer sem conclusão.</p>
          </div>
          <div className="space-y-2">
            <Label>Data de Vencimento *</Label>
            <Input type="date" value={dataVencimento} onChange={(e) => setDataVencimento(e.target.value)} />
            <p className="text-xs text-slate-500">Essa data também será usada para criar automaticamente o evento na Agenda.</p>
          </div>
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Descreva a tarefa..." rows={5} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="button" className="bg-slate-900 hover:bg-slate-800" disabled={isPending} onClick={onSubmit}>
              {isPending ? 'Criando...' : 'Criar Tarefa'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ConvertControleDialog({
  isOpen, onClose, publicacao, form, setForm, pessoas, isPending, onSubmit,
}) {
  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });
  return (
    <Dialog open={isOpen} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Converter para Controle de Execução</DialogTitle></DialogHeader>
        <div className="space-y-4">
          {publicacao && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-sm text-slate-700"><span className="font-semibold">Processo:</span> {publicacao.processo || '-'}</p>
              <p className="text-xs text-slate-500"><span className="font-semibold">Parte:</span> {publicacao.parte || '-'}</p>
            </div>
          )}
          <div className="space-y-2"><Label>Título *</Label><Input value={form.titulo} onChange={set('titulo')} /></div>
          <div className="space-y-2"><Label>Cliente</Label><Input value={form.cliente} onChange={set('cliente')} /></div>
          <div className="space-y-2"><Label>Descrição</Label><Textarea value={form.descricao} onChange={set('descricao')} rows={4} /></div>
          <div className="space-y-2"><Label>Observações</Label><Textarea value={form.observacoes} onChange={set('observacoes')} rows={3} /></div>
          <div className="space-y-2"><Label>Tipo de Movimentação</Label><Input value={form.tipo_movimentacao} onChange={set('tipo_movimentacao')} placeholder="Ex: Citação, Penhora, Sentença..." /></div>
          <div className="space-y-2">
            <Label>Responsável</Label>
            <Select value={form.responsavel_id} onValueChange={(v) => setForm({ ...form, responsavel_id: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione o responsável..." /></SelectTrigger>
              <SelectContent>{pessoas.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Em aberto">Em aberto</SelectItem>
                <SelectItem value="Gerar tarefa">Gerar tarefa</SelectItem>
                <SelectItem value="Concluído">Concluído</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="button" className="bg-emerald-700 hover:bg-emerald-800" disabled={isPending} onClick={onSubmit}>
              {isPending ? 'Criando...' : 'Criar Controle'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ConvertMonitorDialog({
  isOpen, onClose, publicacao, form, setForm, pessoas, isPending, onSubmit,
}) {
  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });
  return (
    <Dialog open={isOpen} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Monitorar Processo</DialogTitle></DialogHeader>
        <div className="space-y-4">
          {publicacao && (
            <div className="rounded-xl border border-violet-200 bg-violet-50 p-3">
              <p className="text-sm text-violet-900"><span className="font-semibold">Processo:</span> {publicacao.processo || '-'}</p>
              <p className="text-xs text-violet-700"><span className="font-semibold">Parte:</span> {publicacao.parte || '-'}</p>
            </div>
          )}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2"><Label>Número do processo *</Label><Input value={form.numero_processo} onChange={set('numero_processo')} placeholder="Ex: 1000664-12.2022.8.26.0691" /></div>
            <div className="space-y-2"><Label>Cliente / Parte *</Label><Input value={form.cliente_parte} onChange={set('cliente_parte')} placeholder="Nome do cliente ou parte" /></div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Responsável *</Label>
              <Select value={form.responsavel_id} onValueChange={(v) => setForm({ ...form, responsavel_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione o responsável..." /></SelectTrigger>
                <SelectContent>{pessoas.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tribunal / Órgão atual *</Label>
              <Select value={form.tribunal_orgao_atual} onValueChange={(v) => setForm({ ...form, tribunal_orgao_atual: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1º Grau">1º Grau</SelectItem>
                  <SelectItem value="2º Grau (TJ/TRF)">2º Grau (TJ/TRF)</SelectItem>
                  <SelectItem value="STJ">STJ</SelectItem>
                  <SelectItem value="STF">STF</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Tipo de controle *</Label>
            <Select value={form.tipo_controle} onValueChange={(v) => setForm({ ...form, tipo_controle: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione o tipo..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Apenas acompanhamento">Apenas acompanhamento</SelectItem>
                <SelectItem value="Aguardando decisão">Aguardando decisão</SelectItem>
                <SelectItem value="Em fase de recurso">Em fase de recurso</SelectItem>
                <SelectItem value="Recurso interposto">Recurso interposto</SelectItem>
                <SelectItem value="Aguardando julgamento">Aguardando julgamento</SelectItem>
                <SelectItem value="Decisão publicada (analisar)">Decisão publicada (analisar)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>O que precisa ser feito *</Label><Input value={form.o_que_precisa_ser_feito} onChange={set('o_que_precisa_ser_feito')} placeholder="Ex: Checar andamento no e-SAJ" /></div>
          <div className="space-y-2"><Label>Próxima checagem *</Label><Input type="date" value={form.proxima_checagem} onChange={set('proxima_checagem')} /></div>
          <div className="space-y-2"><Label>Observações</Label><Textarea value={form.observacoes} onChange={set('observacoes')} rows={5} placeholder="Observações adicionais..." /></div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="button" className="bg-violet-700 hover:bg-violet-800" disabled={isPending} onClick={onSubmit}>
              {isPending ? 'Criando...' : 'Criar Monitoramento'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function FazerAgendamentoDialog({
  isOpen, onClose, publicacao, form, setForm, pessoas, isPending, onSubmit, buildTituloFromPublicacao,
}) {
  return (
    <Dialog open={isOpen} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Fazer Agendamento</DialogTitle></DialogHeader>
        <div className="space-y-4">
          {publicacao && (
            <div className="rounded-xl border border-pink-200 bg-pink-50 p-3">
              <p className="text-sm text-pink-900"><span className="font-semibold">Processo:</span> {publicacao.processo || '-'}</p>
              <p className="text-xs text-pink-700"><span className="font-semibold">Parte:</span> {publicacao.parte || '-'}</p>
            </div>
          )}
          <div className="space-y-2">
            <Label>Tipo de Agendamento *</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant={form.tipo_agendamento === 'audiencia' ? 'default' : 'outline'}
                className={form.tipo_agendamento === 'audiencia' ? 'bg-pink-600 hover:bg-pink-700' : ''}
                onClick={() => setForm((prev) => {
                  const base = prev.titulo.includes(' — ') ? prev.titulo.split(' — ').slice(1).join(' — ') : buildTituloFromPublicacao(publicacao || {});
                  return { ...prev, tipo_agendamento: 'audiencia', titulo: `Audiência — ${base}`.slice(0, 180), observacoes: String(prev.observacoes || '').replace('[AGENDAMENTO_PUBLICACAO:PERICIA]', '').replace('[AGENDAMENTO_PUBLICACAO:AUDIENCIA]', '').trim() + ' [AGENDAMENTO_PUBLICACAO:AUDIENCIA]' };
                })}>Audiência</Button>
              <Button type="button" variant={form.tipo_agendamento === 'pericia' ? 'default' : 'outline'}
                className={form.tipo_agendamento === 'pericia' ? 'bg-orange-500 hover:bg-orange-600' : ''}
                onClick={() => setForm((prev) => {
                  const base = prev.titulo.includes(' — ') ? prev.titulo.split(' — ').slice(1).join(' — ') : buildTituloFromPublicacao(publicacao || {});
                  return { ...prev, tipo_agendamento: 'pericia', titulo: `Perícia — ${base}`.slice(0, 180), observacoes: String(prev.observacoes || '').replace('[AGENDAMENTO_PUBLICACAO:PERICIA]', '').replace('[AGENDAMENTO_PUBLICACAO:AUDIENCIA]', '').trim() + ' [AGENDAMENTO_PUBLICACAO:PERICIA]' };
                })}>Perícia</Button>
            </div>
          </div>
          <div className="space-y-2"><Label>Título *</Label><Input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} /></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Data *</Label><Input type="date" value={form.data_evento} onChange={(e) => setForm({ ...form, data_evento: e.target.value })} /></div>
            <div className="space-y-2">
              <Label>Responsável *</Label>
              <Select value={form.responsavel_id} onValueChange={(v) => setForm({ ...form, responsavel_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione o responsável..." /></SelectTrigger>
                <SelectContent>{pessoas.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Hora de Início *</Label><Input type="time" value={form.hora_inicio} onChange={(e) => setForm({ ...form, hora_inicio: e.target.value })} /></div>
            <div className="space-y-2"><Label>Hora de Término</Label><Input type="time" value={form.hora_termino} onChange={(e) => setForm({ ...form, hora_termino: e.target.value })} /></div>
          </div>
          <div className="space-y-2"><Label>Descrição</Label><Textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} rows={5} /></div>
          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} rows={3} />
            <p className="text-xs text-slate-500">Audiências ficam em rosa no calendário. Perícias ficam em laranja.</p>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="button" className="bg-slate-900 hover:bg-slate-800" disabled={isPending} onClick={onSubmit}>
              {isPending ? 'Criando...' : 'Criar Agendamento'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}