import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { flowdesk } from '@/api/flowdeskClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Link } from 'react-router-dom';
import { Plus, Search, Pencil, Trash2, Building2, Scale, FolderOpen, User, Phone, Mail, ExternalLink } from 'lucide-react';
import DocumentosSection from '@/components/DocumentosSection';

const TIPOS = ['Previdenciário', 'Trabalhista', 'Bancário', 'Cível', 'Criminal', 'Tributário', 'Administrativo', 'Outro'];
const STATUS = ['Em andamento', 'Concluído', 'Suspenso', 'Arquivado', 'Aguardando'];
const FASES = ['Inicial', 'Instrução', 'Sentença', 'Recurso', 'Execução', 'Trânsito em julgado', 'Encerrado'];

const STATUS_COLORS = {
  'Em andamento': 'bg-blue-100 text-blue-700 border-blue-200',
  'Concluído': 'bg-green-100 text-green-700 border-green-200',
  'Suspenso': 'bg-yellow-100 text-yellow-700 border-yellow-200',
  'Arquivado': 'bg-slate-100 text-slate-600 border-slate-200',
  'Aguardando': 'bg-orange-100 text-orange-700 border-orange-200',
};

const EMPTY_FORM = {
  numero_processo: '',
  cliente_id: '',
  tipo_processo: '',
  status: 'Em andamento',
  data_inicio: '',
  data_fim: '',
  orgao: '',
  descricao: '',
  valor_causa: '',
  fase_processo: '',
  id_externo: '',
};

export default function Processos() {
  const queryClient = useQueryClient();
  const [user, setUser] = React.useState(null);
  React.useEffect(() => { flowdesk.auth.me().then(setUser).catch(() => {}); }, []);

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [numError, setNumError] = useState('');
  const [docsProcesso, setDocsProcesso] = useState(null);

  const { data: processos = [], isLoading } = useQuery({
    queryKey: ['processos'],
    queryFn: () => flowdesk.entities.Processo.list('-created_date', 500),
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => flowdesk.entities.Cliente.list('-created_date', 500),
  });

  const createMutation = useMutation({
    mutationFn: (data) => flowdesk.entities.Processo.create(data),
    onSuccess: async (novoProcesso) => {
      queryClient.invalidateQueries({ queryKey: ['processos'] });
      const tarefasPorTipo = {
        'Previdenciário': [
          'Coletar documentos previdenciários do cliente',
          'Verificar histórico contributivo no CNIS',
          'Protocolar requerimento no INSS',
          'Acompanhar andamento do processo administrativo',
          'Verificar necessidade de recurso ou impugnação',
        ],
        'Trabalhista': [
          'Coletar documentos trabalhistas e rescisórios',
          'Calcular verbas rescisórias devidas',
          'Protocolar reclamação trabalhista',
          'Preparar para audiência inicial',
          'Avaliar proposta de acordo ou prosseguir com instrução',
        ],
        'Bancário': [
          'Solicitar extratos e contratos bancários',
          'Analisar cláusulas abusivas',
          'Protocolar ação revisional',
          'Acompanhar resposta do banco',
        ],
        'Cível': [
          'Coletar provas e documentos do caso',
          'Protocolar petição inicial',
          'Acompanhar citação da parte adversa',
          'Preparar réplica se necessário',
        ],
        'Administrativo': [
          'Protocolar requerimento administrativo',
          'Acompanhar prazo de resposta',
          'Preparar recurso administrativo se necessário',
        ],
      };
      const tarefas = tarefasPorTipo[novoProcesso.tipo_processo];
      if (tarefas) {
        const vencimento = new Date();
        vencimento.setDate(vencimento.getDate() + 7);
        const dataVenc = vencimento.toISOString().split('T')[0];
        await Promise.all(tarefas.map(titulo =>
          flowdesk.entities.Tarefa.create({
            titulo,
            descricao: `Tarefa automática para processo ${novoProcesso.numero_processo || ''} (${novoProcesso.tipo_processo})`,
            origem: 'Sistema',
            atendimento_id: '',
            responsavel_id: novoProcesso.criado_por || '',
            data_vencimento: dataVenc,
            status: 'Em aberto',
            status_detalhado: 'Pendente',
            prioridade: 'Média',
          })
        ));
        queryClient.invalidateQueries({ queryKey: ['tarefas'] });
      }
      closeDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => flowdesk.entities.Processo.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['processos'] }); closeDialog(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => flowdesk.entities.Processo.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['processos'] }); setDeleteTarget(null); },
  });

  const openCreate = () => { setEditingItem(null); setForm(EMPTY_FORM); setNumError(''); setDialogOpen(true); };

  const openEdit = (p) => {
    setEditingItem(p);
    setForm({
      numero_processo: p.numero_processo || '',
      cliente_id: p.cliente_id || '',
      tipo_processo: p.tipo_processo || '',
      status: p.status || 'Em andamento',
      data_inicio: p.data_inicio || '',
      data_fim: p.data_fim || '',
      orgao: p.orgao || '',
      descricao: p.descricao || '',
      valor_causa: p.valor_causa || '',
      fase_processo: p.fase_processo || '',
      id_externo: p.id_externo || '',
    });
    setNumError('');
    setDialogOpen(true);
  };

  const closeDialog = () => { setDialogOpen(false); setEditingItem(null); setForm(EMPTY_FORM); setNumError(''); };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.cliente_id) { alert('Selecione um cliente antes de continuar.'); return; }
    const duplicado = processos.find((p) => p.numero_processo === form.numero_processo && p.id !== editingItem?.id);
    if (duplicado) { setNumError('Já existe um processo com este número.'); return; }
    setNumError('');
    const userEmail = user?.email || 'sistema';
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: { ...form, valor_causa: form.valor_causa ? Number(form.valor_causa) : undefined, atualizado_por: userEmail } });
    } else {
      createMutation.mutate({ ...form, valor_causa: form.valor_causa ? Number(form.valor_causa) : undefined, criado_por: userEmail, atualizado_por: userEmail });
    }
  };

  const getClienteNome = (id) => clientes.find((c) => c.id === id)?.nome_completo || '—';
  const getClienteCPF = (id) => clientes.find((c) => c.id === id)?.cpf || '';

  const filtered = processos
    .filter((p) => filterStatus === 'todos' || p.status === filterStatus)
    .filter((p) => {
      const q = search.toLowerCase();
      return [p.numero_processo, getClienteNome(p.cliente_id), getClienteCPF(p.cliente_id), p.tipo_processo, p.orgao, p.status].some((v) => (v || '').toLowerCase().includes(q));
    });

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Scale className="h-6 w-6 text-[#378ADD]" />
              Processos
            </h1>
            <p className="text-sm text-muted-foreground mt-1">{processos.length} processo(s) cadastrado(s)</p>
          </div>
          <Button onClick={openCreate} className="bg-[#378ADD] hover:bg-[#185FA5] text-white">
            <Plus className="mr-2 h-4 w-4" />
            Novo Processo
          </Button>
        </div>

        {/* Filtros */}
        <div className="flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar por número, cliente, tipo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Filtrar status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              {STATUS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Tabela */}
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Nº Processo</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Órgão</TableHead>
                <TableHead>Fase</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Criado por</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground">Nenhum processo encontrado.</TableCell></TableRow>
              ) : (
                filtered.map((p) => (
                  <TableRow key={p.id} className="hover:bg-muted/30">
                    <TableCell className="font-mono text-sm text-foreground">{p.numero_processo}</TableCell>
                    <TableCell>
                      <Link to={`/ClienteDetalhe?id=${p.cliente_id}`} className="text-[#378ADD] hover:underline text-sm font-medium">
                        {getClienteNome(p.cliente_id)}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{p.tipo_processo}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{p.orgao || '—'}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{p.fase_processo || '—'}</TableCell>
                    <TableCell>
                      <Badge className={`border text-xs ${STATUS_COLORS[p.status] || ''}`}>{p.status}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{p.criado_por || '—'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Link to={`/CentralAdminINSS?processo_id=${p.id}`}>
                          <Button size="icon" variant="ghost" title="Central Admin. INSS">
                            <Building2 className="h-4 w-4 text-blue-500" />
                          </Button>
                        </Link>
                        <Button size="icon" variant="ghost" onClick={() => setDocsProcesso(p)} title="Documentos">
                          <FolderOpen className="h-4 w-4 text-amber-500" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => openEdit(p)} title="Editar">
                          <Pencil className="h-4 w-4 text-slate-500" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => setDeleteTarget(p)} title="Excluir">
                          <Trash2 className="h-4 w-4 text-red-400" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Dialog criar/editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Editar Processo' : 'Novo Processo'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">

            {editingItem && editingItem.cliente_id && (() => {
              const c = clientes.find(cl => cl.id === editingItem.cliente_id);
              if (!c) return null;
              return (
                <div className="rounded-xl bg-[#EAF4FF] border border-[#BFDDF7] p-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-[#BFDDF7] flex items-center justify-center flex-shrink-0">
                      <User className="h-4 w-4 text-[#185FA5]" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{c.nome_completo}</p>
                      <div className="flex gap-3 text-xs text-slate-500">
                        <span className="font-mono">{c.cpf}</span>
                        {c.telefone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{c.telefone}</span>}
                        {c.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{c.email}</span>}
                      </div>
                    </div>
                  </div>
                  <Link to={`/ClienteDetalhe?id=${c.id}`} target="_blank">
                    <Button size="sm" variant="outline" className="flex-shrink-0 text-xs">
                      <ExternalLink className="h-3 w-3 mr-1" />Ver cliente
                    </Button>
                  </Link>
                </div>
              );
            })()}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Número do Processo *</Label>
                <Input required value={form.numero_processo} onChange={(e) => { setForm({ ...form, numero_processo: e.target.value }); setNumError(''); }} placeholder="0000000-00.0000.0.00.0000" />
                {numError && <p className="text-xs text-red-500">{numError}</p>}
              </div>
              <div className="space-y-1">
                <Label>Cliente *</Label>
                <Select value={form.cliente_id} onValueChange={(v) => setForm({ ...form, cliente_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione o cliente..." /></SelectTrigger>
                  <SelectContent>
                    {clientes.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome_completo} — {c.cpf}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Tipo de Processo *</Label>
                <Select value={form.tipo_processo} onValueChange={(v) => setForm({ ...form, tipo_processo: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{TIPOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Status *</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Fase do Processo</Label>
                <Select value={form.fase_processo} onValueChange={(v) => setForm({ ...form, fase_processo: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{FASES.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Órgão</Label>
                <Input value={form.orgao} onChange={(e) => setForm({ ...form, orgao: e.target.value })} placeholder="INSS, Justiça Federal..." />
              </div>
              <div className="space-y-1">
                <Label>Data de Início *</Label>
                <Input required type="date" value={form.data_inicio} onChange={(e) => setForm({ ...form, data_inicio: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Data de Fim</Label>
                <Input type="date" value={form.data_fim} onChange={(e) => setForm({ ...form, data_fim: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Valor da Causa (R$)</Label>
                <Input type="number" min="0" step="0.01" value={form.valor_causa} onChange={(e) => setForm({ ...form, valor_causa: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>ID Externo (migração)</Label>
                <Input value={form.id_externo} onChange={(e) => setForm({ ...form, id_externo: e.target.value })} placeholder="ID do sistema antigo" />
              </div>
              <div className="md:col-span-2 space-y-1">
                <Label>Descrição</Label>
                <Textarea rows={3} value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={closeDialog}>Cancelar</Button>
              <Button type="submit" className="bg-[#378ADD] hover:bg-[#185FA5] text-white" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingItem ? 'Salvar Alterações' : 'Cadastrar Processo'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Documentos */}
      <Dialog open={!!docsProcesso} onOpenChange={() => setDocsProcesso(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4 text-amber-500" />
              Anexos — Processo {docsProcesso?.numero_processo}
            </DialogTitle>
          </DialogHeader>
          <div className="pt-2">
            {docsProcesso && <DocumentosSection processoId={docsProcesso.id} userEmail={user?.email} />}
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmação exclusão */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir processo?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o processo <strong>{deleteTarget?.numero_processo}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => deleteMutation.mutate(deleteTarget.id)}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}