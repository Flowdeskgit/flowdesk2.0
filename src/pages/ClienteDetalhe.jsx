import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { flowdesk } from '@/api/flowdeskClient';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft, Plus, Pencil, Trash2, User, Scale, FolderOpen, ExternalLink, Calendar, CheckSquare, Building2,
  Clock, CheckCircle2, AlertCircle, CalendarDays, ClipboardList,
} from 'lucide-react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { parseISO, differenceInDays } from 'date-fns';
import DocumentosSection from '@/components/DocumentosSection';
import FichaCliente from '@/components/FichaCliente';

const TIPOS = ['Previdenciário', 'Trabalhista', 'Bancário', 'Cível', 'Criminal', 'Tributário', 'Administrativo', 'Outro'];
const STATUS_P = ['Em andamento', 'Concluído', 'Suspenso', 'Arquivado', 'Aguardando'];
const FASES = ['Inicial', 'Instrução', 'Sentença', 'Recurso', 'Execução', 'Trânsito em julgado', 'Encerrado'];

const STATUS_COLORS = {
  'Em andamento': 'bg-blue-100 text-blue-700 border-blue-200',
  'Concluído':    'bg-green-100 text-green-700 border-green-200',
  'Suspenso':     'bg-yellow-100 text-yellow-700 border-yellow-200',
  'Arquivado':    'bg-slate-100 text-slate-600 border-slate-200',
  'Aguardando':   'bg-orange-100 text-orange-700 border-orange-200',
};

const PRIORIDADE_COLORS = {
  'Alta':    'bg-red-100 text-red-700 border-red-200',
  'Urgente': 'bg-red-200 text-red-800 border-red-300',
  'Média':   'bg-amber-100 text-amber-700 border-amber-200',
  'Baixa':   'bg-slate-100 text-slate-600 border-slate-200',
};

const EVENTO_COLORS = {
  'Audiência':          'bg-purple-100 text-purple-700 border-purple-200',
  'Perícia':            'bg-blue-100 text-blue-700 border-blue-200',
  'Avaliação Social':   'bg-teal-100 text-teal-700 border-teal-200',
  'Atendimento':        'bg-[#EAF4FF] text-[#185FA5] border-[#BFDDF7]',
  'Reunião':            'bg-indigo-100 text-indigo-700 border-indigo-200',
  'Prazo':              'bg-orange-100 text-orange-700 border-orange-200',
};

const EMPTY_PROC = {
  numero_processo: '', tipo_processo: '', status: 'Em andamento',
  data_inicio: '', data_fim: '', orgao: '', descricao: '',
  valor_causa: '', fase_processo: '', id_externo: '',
};

// ── Helpers para fazer a Ficha do Cliente enxergar os dados salvos em Clientes ──
function parseMaybeJson(value) {
  if (!value) return null;
  if (typeof value === 'object') return value;
  if (typeof value !== 'string') return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function lerHiddenFicha(observacoes) {
  const text = String(observacoes || '');
  const marker = '<!--HIDDEN_FICHA:';
  const endMarker = '-->';
  const startIdx = text.indexOf(marker);
  if (startIdx === -1) return null;

  const endIdx = text.indexOf(endMarker, startIdx + marker.length);
  if (endIdx === -1) return null;

  const jsonPart = text.substring(startIdx + marker.length, endIdx);
  return parseMaybeJson(jsonPart);
}

function salvarHiddenFicha(observacoes, dados) {
  const text = String(observacoes || '');
  const marker = '<!--HIDDEN_FICHA:';
  const endMarker = '-->';
  const jsonStr = JSON.stringify(dados || {});
  const startIdx = text.indexOf(marker);

  if (startIdx !== -1) {
    const endIdx = text.indexOf(endMarker, startIdx + marker.length);
    if (endIdx !== -1) {
      return `${text.substring(0, startIdx)}${marker}${jsonStr}${endMarker}${text.substring(endIdx + endMarker.length)}`;
    }
    return `${text.substring(0, startIdx)}${marker}${jsonStr}${endMarker}`;
  }

  const visible = text.trim();
  return visible ? `${visible}

${marker}${jsonStr}${endMarker}` : `${marker}${jsonStr}${endMarker}`;
}

function onlyVisibleObservacoes(observacoes) {
  const text = String(observacoes || '');
  const marker = '<!--HIDDEN_FICHA:';
  const startIdx = text.indexOf(marker);
  if (startIdx === -1) return text;
  return text.substring(0, startIdx).trim();
}

function normalizeClienteForFicha(cliente) {
  if (!cliente) return cliente;

  const questionario = parseMaybeJson(cliente.atendimento_questionario_json) || {};
  const hiddenFicha = lerHiddenFicha(cliente.observacoes) || {};
  const ficha = {
    ...hiddenFicha,
    ...questionario,
  };

  // Mantém todos os campos originais e adiciona aliases compatíveis com a FichaCliente.
  // Assim não quebra o componente antigo, mas permite que ele leia os campos salvos no questionário.
  return {
    ...cliente,
    ...ficha,
    ficha_questionario: ficha,
    atendimento_questionario: ficha,
    atendimento_questionario_json: cliente.atendimento_questionario_json,
    observacoes: onlyVisibleObservacoes(cliente.observacoes),

    nome_completo: ficha.qualificacao_nome_completo || cliente.nome_completo || '',
    cpf: ficha.qualificacao_cpf || cliente.cpf || '',
    rg: ficha.qualificacao_rg || cliente.rg || '',
    telefone: ficha.qualificacao_telefone || cliente.telefone || '',
    email: ficha.qualificacao_email || cliente.email || '',
    endereco: ficha.qualificacao_endereco || cliente.endereco || '',
    cidade: ficha.qualificacao_cidade || cliente.cidade || '',
    estado: ficha.qualificacao_estado || cliente.estado || '',

    // Aliases comuns caso o componente FichaCliente esteja usando nomes simples.
    nacionalidade: ficha.qualificacao_nacionalidade || cliente.nacionalidade || '',
    estado_civil: ficha.qualificacao_estado_civil || cliente.estado_civil || '',
    numero: ficha.qualificacao_numero || cliente.numero || '',
    bairro: ficha.qualificacao_bairro || cliente.bairro || '',
    senha_meu_inss: ficha.senha_meu_inss || cliente.senha_meu_inss || '',
    aniversario: ficha.aniversario || cliente.aniversario || cliente.data_nascimento || '',
    atendente: ficha.atendente || cliente.atendente || '',
    como_ficou_sabendo: ficha.como_ficou_sabendo || cliente.como_ficou_sabendo || [],
    diagnostico: ficha.diagnostico || cliente.diagnostico || '',
    fatos: ficha.fatos || cliente.fatos || '',
  };
}


export default function ClienteDetalhe() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useCurrentUser();

  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const clienteId = searchParams.get('id');
  const tabFromUrl = searchParams.get('tab') || 'ficha';
  const [activeTab, setActiveTab] = useState(tabFromUrl);

  useEffect(() => {
    const p = new URLSearchParams(location.search);
    setActiveTab(p.get('tab') || 'ficha');
  }, [location.search]);

  const [procDialog, setProcDialog] = useState(false);
  const [editingProc, setEditingProc] = useState(null);
  const [procForm, setProcForm] = useState(EMPTY_PROC);
  const [numError, setNumError] = useState('');

  const [tarefaDialog, setTarefaDialog] = useState(false);
  const [tarefaForm, setTarefaForm] = useState({});

  const [diagnosticoDialog, setDiagnosticoDialog] = useState(false);
  const [diagnosticoDraft, setDiagnosticoDraft] = useState('');
  const [diagnosticoError, setDiagnosticoError] = useState('');

  const { data: pessoas = [] } = useQuery({
    queryKey: ['pessoas-list'],
    queryFn: () => flowdesk.entities.Pessoa.list('-created_date', 100),
  });

  // ── Queries ──────────────────────────────────────────────────────────────────
  const { data: cliente, isLoading: loadingCliente } = useQuery({
    queryKey: ['cliente', clienteId],
    queryFn: () => flowdesk.entities.Cliente.filter({ id: clienteId }),
    enabled: !!clienteId,
    select: (data) => data[0],
  });

  const { data: processos = [], isLoading: loadingProc } = useQuery({
    queryKey: ['processos-cliente', clienteId],
    queryFn: () => flowdesk.entities.Processo.filter({ cliente_id: clienteId }),
    enabled: !!clienteId,
  });

  const { data: admsCliente = [], isLoading: loadingAdm } = useQuery({
    queryKey: ['adm-inss-cliente', clienteId],
    queryFn: () => flowdesk.entities.AdministrativoINSS.filter({ cliente_id: clienteId }),
    enabled: !!clienteId,
  });

  const { data: todosProcessos = [] } = useQuery({
    queryKey: ['processos-all-detalhe'],
    queryFn: () => flowdesk.entities.Processo.list('-created_date', 500),
  });

  // Tarefas vinculadas ao cliente
  const { data: tarefasCliente = [], isLoading: loadingTarefas } = useQuery({
    queryKey: ['tarefas-cliente', clienteId],
    queryFn: async () => {
      const todas = await flowdesk.entities.Tarefa.list('-created_date', 500);
      return todas.filter(t =>
        t.cliente_id === clienteId ||
        (cliente && t.titulo?.includes(cliente.nome_completo)) ||
        (cliente && t.descricao?.includes(cliente.nome_completo))
      );
    },
    enabled: !!clienteId && !!cliente,
  });

  // Eventos/Agenda vinculados ao cliente
  const { data: eventosCliente = [], isLoading: loadingEventos } = useQuery({
    queryKey: ['agenda-cliente', clienteId],
    queryFn: async () => {
      try {
        const todos = await flowdesk.entities.Agenda.list('-created_date', 500);
        return todos.filter(e =>
          e.cliente_id === clienteId ||
          (cliente && e.titulo?.includes(cliente.nome_completo)) ||
          (cliente && e.descricao?.includes(cliente.nome_completo))
        );
      } catch { return []; }
    },
    enabled: !!clienteId && !!cliente,
  });

  const clienteFicha = useMemo(() => normalizeClienteForFicha(cliente), [cliente]);

  // ── Mutations ────────────────────────────────────────────────────────────────
  const createTarefaMutation = useMutation({
    mutationFn: (data) => flowdesk.entities.Tarefa.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tarefas-cliente', clienteId] });
      setTarefaDialog(false);
    },
  });

  const createProcMutation = useMutation({
    mutationFn: (data) => flowdesk.entities.Processo.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['processos-cliente', clienteId] });
      queryClient.invalidateQueries({ queryKey: ['processos-all-detalhe'] });
      closeProcDialog();
    },
  });

  const updateProcMutation = useMutation({
    mutationFn: ({ id, data }) => flowdesk.entities.Processo.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['processos-cliente', clienteId] });
      closeProcDialog();
    },
  });

  const deleteProcMutation = useMutation({
    mutationFn: (id) => flowdesk.entities.Processo.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['processos-cliente', clienteId] }),
  });

  const updateDiagnosticoMutation = useMutation({
    mutationFn: async (novoDiagnostico) => {
      const fichaAtual = {
        ...(lerHiddenFicha(cliente?.observacoes) || {}),
        ...(parseMaybeJson(cliente?.atendimento_questionario_json) || {}),
        diagnostico: novoDiagnostico || '',
      };

      return flowdesk.entities.Cliente.update(clienteId, {
        atendimento_questionario_json: JSON.stringify(fichaAtual),
        observacoes: salvarHiddenFicha(cliente?.observacoes || '', fichaAtual),
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['cliente', clienteId] });
      await queryClient.invalidateQueries({ queryKey: ['clientes'] });
      setDiagnosticoDialog(false);
      setDiagnosticoError('');
    },
    onError: (err) => {
      setDiagnosticoError(`Erro ao salvar diagnóstico: ${err?.message || 'Tente novamente.'}`);
    },
  });

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const openTarefaDialog = () => {
    setTarefaForm({
      titulo: `Tarefa - ${cliente?.nome_completo || ''}`,
      descricao: '',
      responsavel_id: '',
      data_vencimento: '',
      prioridade: 'Média',
      status: 'Em aberto',
      cliente_id: clienteId,
      observacoes: '',
    });
    setTarefaDialog(true);
  };

  const handleTarefaSubmit = (e) => {
    e.preventDefault();
    const userEmail = user?.email || 'sistema';
    createTarefaMutation.mutate({
      ...tarefaForm,
      cliente_id: clienteId,
      criado_por: userEmail,
      atualizado_por: userEmail,
    });
  };

  const openProcCreate = () => { setEditingProc(null); setProcForm(EMPTY_PROC); setNumError(''); setProcDialog(true); };
  const openProcEdit = (p) => {
    setEditingProc(p);
    setProcForm({
      numero_processo: p.numero_processo || '', tipo_processo: p.tipo_processo || '',
      status: p.status || 'Em andamento', data_inicio: p.data_inicio || '',
      data_fim: p.data_fim || '', orgao: p.orgao || '', descricao: p.descricao || '',
      valor_causa: p.valor_causa || '', fase_processo: p.fase_processo || '', id_externo: p.id_externo || '',
    });
    setNumError(''); setProcDialog(true);
  };
  const closeProcDialog = () => { setProcDialog(false); setEditingProc(null); setProcForm(EMPTY_PROC); setNumError(''); };

  const handleProcSubmit = (e) => {
    e.preventDefault();
    const duplicado = todosProcessos.find(p => p.numero_processo === procForm.numero_processo && p.id !== editingProc?.id);
    if (duplicado) { setNumError('Já existe um processo com este número.'); return; }
    setNumError('');
    const userEmail = user?.email || 'sistema';
    if (editingProc) {
      updateProcMutation.mutate({ id: editingProc.id, data: { ...procForm, valor_causa: procForm.valor_causa ? Number(procForm.valor_causa) : undefined, atualizado_por: userEmail } });
    } else {
      createProcMutation.mutate({ ...procForm, cliente_id: clienteId, valor_causa: procForm.valor_causa ? Number(procForm.valor_causa) : undefined, criado_por: userEmail, atualizado_por: userEmail });
    }
  };

  const openDiagnosticoEdit = () => {
    setDiagnosticoDraft(clienteFicha?.diagnostico || clienteFicha?.ficha_questionario?.diagnostico || '');
    setDiagnosticoError('');
    setDiagnosticoDialog(true);
  };

  const handleDiagnosticoSubmit = (e) => {
    e.preventDefault();
    updateDiagnosticoMutation.mutate(diagnosticoDraft);
  };

  const getPessoaNome = (id) => pessoas.find(p => p.id === id)?.nome || id || '—';

  // Separar tarefas em aberto e concluídas
  const tarefasAbertas = tarefasCliente.filter(t => t.status !== 'Concluída' && t.status !== 'Concluído');
  const tarefasConcluidas = tarefasCliente.filter(t => t.status === 'Concluída' || t.status === 'Concluído');

  // Separar eventos futuros e passados
  const hoje = new Date().toISOString().split('T')[0];
  const eventosFuturos = eventosCliente.filter(e => !e.data || e.data >= hoje).sort((a, b) => (a.data || '').localeCompare(b.data || ''));
  const eventosPassados = eventosCliente.filter(e => e.data && e.data < hoje).sort((a, b) => b.data.localeCompare(a.data));

  if (loadingCliente) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#EAF4FF] border-t-[#378ADD] rounded-full animate-spin" />
      </div>
    );
  }

  if (!cliente) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Cliente não encontrado.</p>
          <Link to="/Clientes"><Button variant="outline">Voltar</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Voltar */}
        <Link to="/Clientes">
          <Button variant="ghost" className="text-muted-foreground hover:text-foreground -ml-2">
            <ArrowLeft className="mr-2 h-4 w-4" />Voltar para Clientes
          </Button>
        </Link>

        {/* Cabeçalho */}
        <div className="rounded-2xl border border-border bg-card shadow-sm p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-full bg-[#EAF4FF] flex items-center justify-center">
                <User className="h-7 w-7 text-[#378ADD]" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">{cliente.nome_completo}</h1>
                <p className="text-sm text-muted-foreground font-mono">CPF: {cliente.cpf}</p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button size="sm" onClick={openTarefaDialog} className="bg-[#378ADD] hover:bg-[#185FA5] text-white">
                <CheckSquare className="mr-1 h-3 w-3" />Nova Tarefa
              </Button>
              <Link to="/Clientes">
                <Button variant="outline" size="sm">
                  <Pencil className="mr-1 h-3 w-3" />Editar
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <TabsList className="w-full rounded-none border-b border-border bg-muted/40 h-12 justify-start px-4 gap-1 overflow-x-auto">
            <TabsTrigger value="ficha" className="flex items-center gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg whitespace-nowrap">
              <User className="h-4 w-4" />Ficha do Cliente
            </TabsTrigger>
            <TabsTrigger value="documentos" className="flex items-center gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg whitespace-nowrap">
              <FolderOpen className="h-4 w-4" />Anexos
            </TabsTrigger>
            <TabsTrigger value="administrativo" className="flex items-center gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg whitespace-nowrap">
              <Building2 className="h-4 w-4" />Administrativo INSS ({admsCliente.length})
            </TabsTrigger>
            <TabsTrigger value="processos" className="flex items-center gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg whitespace-nowrap">
              <Scale className="h-4 w-4" />Processos Judiciais ({processos.length})
            </TabsTrigger>
            <TabsTrigger value="tarefas" className="flex items-center gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg whitespace-nowrap">
              <ClipboardList className="h-4 w-4" />
              Tarefas
              {tarefasAbertas.length > 0 && (
                <span className="ml-1 bg-[#378ADD] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{tarefasAbertas.length}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="eventos" className="flex items-center gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg whitespace-nowrap">
              <CalendarDays className="h-4 w-4" />
              Eventos
              {eventosFuturos.length > 0 && (
                <span className="ml-1 bg-purple-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{eventosFuturos.length}</span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ── Ficha ── */}
          <TabsContent value="ficha" className="p-6 mt-0">
            <div className="space-y-6">
              <div className="rounded-xl border border-[#BFDDF7] bg-[#EAF4FF]/40 p-4">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <ClipboardList className="h-4 w-4 text-[#378ADD]" />
                    <h2 className="text-sm font-semibold text-foreground">Diagnóstico</h2>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-[#378ADD]"
                    onClick={openDiagnosticoEdit}
                    title="Editar diagnóstico"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {clienteFicha?.diagnostico || clienteFicha?.ficha_questionario?.diagnostico || 'Nenhum diagnóstico cadastrado.'}
                </p>
              </div>

              <FichaCliente cliente={clienteFicha} ficha={clienteFicha?.ficha_questionario || {}} />
            </div>
          </TabsContent>

          {/* ── Documentos ── */}
          <TabsContent value="documentos" className="p-6 mt-0">
            <DocumentosSection clienteId={clienteId} userEmail={user?.email} />
          </TabsContent>

          {/* ── Administrativo ── */}
          <TabsContent value="administrativo" className="p-6 mt-0">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold text-foreground">Processos Administrativos INSS</h2>
                <p className="text-xs text-muted-foreground">{admsCliente.length} processo(s) administrativo(s)</p>
              </div>
              <div className="flex gap-2">
                <Link to="/AdministrativoINSS"><Button size="sm" variant="outline" className="text-xs"><ExternalLink className="h-3 w-3 mr-1" />Ver todos</Button></Link>
                <Link to="/AdministrativoINSS"><Button size="sm" className="bg-[#378ADD] hover:bg-[#185FA5] text-white"><Plus className="mr-1 h-3 w-3" />Novo Administrativo</Button></Link>
              </div>
            </div>
            {loadingAdm ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Carregando...</p>
            ) : admsCliente.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Nenhum processo administrativo vinculado.</p>
            ) : (
              <div className="space-y-3">
                {admsCliente.map((adm) => (
                  <Link key={adm.id} to="/AdministrativoINSS" state={{ admId: adm.id }}>
                    <div className="rounded-xl border border-border bg-card p-4 hover:border-[#BFDDF7] hover:shadow-sm transition-all cursor-pointer">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <Building2 className="h-4 w-4 text-[#378ADD] flex-shrink-0" />
                            <p className="font-semibold text-sm text-foreground">{adm.titulo_administrativo || adm.tipo_administrativo || '—'}</p>
                            <Badge className={`border text-xs ${
                              adm.status_geral === 'Deferido' ? 'bg-green-100 text-green-700 border-green-200' :
                              adm.status_geral === 'Indeferido' ? 'bg-red-100 text-red-700 border-red-200' :
                              adm.status_geral === 'Concluído' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                              'bg-slate-100 text-slate-600 border-slate-200'
                            }`}>{adm.status_geral || 'Não iniciado'}</Badge>
                          </div>
                          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                            {adm.tipo_administrativo && <Badge variant="outline" className="text-xs">{adm.tipo_administrativo}</Badge>}
                            {adm.numero_beneficio && <span>Benefício: {adm.numero_beneficio}</span>}
                            {adm.data_inicio && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />Início: {adm.data_inicio}</span>}
                          </div>
                        </div>
                        <ExternalLink className="h-4 w-4 text-slate-400 flex-shrink-0 mt-1" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── Processos Judiciais ── */}
          <TabsContent value="processos" className="p-6 mt-0">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold text-foreground">Processos vinculados</h2>
                <p className="text-xs text-muted-foreground">{processos.length} processo(s)</p>
              </div>
              <div className="flex gap-2">
                <Link to="/Processos"><Button size="sm" variant="outline" className="text-xs"><ExternalLink className="h-3 w-3 mr-1" />Ver todos</Button></Link>
                <Button size="sm" onClick={openProcCreate} className="bg-[#378ADD] hover:bg-[#185FA5] text-white">
                  <Plus className="mr-1 h-3 w-3" />Novo Processo
                </Button>
              </div>
            </div>
            {loadingProc ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Carregando...</p>
            ) : processos.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Nenhum processo vinculado.</p>
            ) : (
              <div className="space-y-3">
                {processos.map((p) => (
                  <div key={p.id} className="rounded-xl border border-border bg-card p-4 hover:border-[#BFDDF7] hover:shadow-sm transition-all">
                    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <p className="font-mono text-sm font-semibold text-foreground">{p.numero_processo}</p>
                          <Badge className={`border text-xs ${STATUS_COLORS[p.status] || ''}`}>{p.status}</Badge>
                        </div>
                        <div className="flex flex-wrap gap-1 mb-2">
                          {p.tipo_processo && <Badge variant="outline" className="text-xs">{p.tipo_processo}</Badge>}
                          {p.fase_processo && <Badge variant="outline" className="text-xs text-slate-500">{p.fase_processo}</Badge>}
                        </div>
                        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                          {p.orgao && <span>Órgão: {p.orgao}</span>}
                          {p.data_inicio && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />Início: {p.data_inicio}</span>}
                          {p.valor_causa && <span>Valor: R$ {Number(p.valor_causa).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>}
                        </div>
                        {p.descricao && <p className="text-xs text-muted-foreground mt-1 italic line-clamp-2">{p.descricao}</p>}
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <Button size="icon" variant="ghost" onClick={() => openProcEdit(p)}><Pencil className="h-4 w-4 text-slate-400" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => deleteProcMutation.mutate(p.id)}><Trash2 className="h-4 w-4 text-red-400" /></Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── Tarefas ── */}
          <TabsContent value="tarefas" className="p-6 mt-0">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-base font-semibold text-foreground">Tarefas do Cliente</h2>
                <p className="text-xs text-muted-foreground">{tarefasAbertas.length} em aberto · {tarefasConcluidas.length} concluída(s)</p>
              </div>
              <Button size="sm" onClick={openTarefaDialog} className="bg-[#378ADD] hover:bg-[#185FA5] text-white">
                <Plus className="mr-1 h-3 w-3" />Nova Tarefa
              </Button>
            </div>

            {loadingTarefas ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Carregando...</p>
            ) : (
              <div className="space-y-6">

                {/* Em aberto */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-2 w-2 rounded-full bg-[#378ADD]" />
                    <h3 className="text-sm font-semibold text-foreground">Em aberto ({tarefasAbertas.length})</h3>
                  </div>
                  {tarefasAbertas.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border p-6 text-center text-muted-foreground text-sm">
                      Nenhuma tarefa em aberto
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {tarefasAbertas.map(t => {
                        const vencida = t.data_vencimento && t.data_vencimento < hoje;
                        const proximaVencer = t.data_vencimento && differenceInDays(parseISO(t.data_vencimento), new Date()) <= 3 && !vencida;
                        return (
                          <div key={t.id} className={`rounded-xl border p-4 transition-all ${vencida ? 'border-red-200 bg-red-50' : proximaVencer ? 'border-amber-200 bg-amber-50' : 'border-border bg-card hover:border-[#BFDDF7]'}`}>
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                  {vencida && <AlertCircle className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />}
                                  <p className="font-semibold text-sm text-foreground">{t.titulo}</p>
                                  {t.prioridade && (
                                    <Badge className={`border text-xs ${PRIORIDADE_COLORS[t.prioridade] || 'bg-slate-100 text-slate-600'}`}>
                                      {t.prioridade}
                                    </Badge>
                                  )}
                                  {t.status && (
                                    <Badge variant="outline" className="text-xs">{t.status_detalhado || t.status}</Badge>
                                  )}
                                </div>
                                {t.descricao && <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{t.descricao}</p>}
                                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                                  {t.responsavel_id && (
                                    <span className="flex items-center gap-1"><User className="h-3 w-3" />{getPessoaNome(t.responsavel_id)}</span>
                                  )}
                                  {t.data_vencimento && (
                                    <span className={`flex items-center gap-1 ${vencida ? 'text-red-600 font-semibold' : proximaVencer ? 'text-amber-600 font-semibold' : ''}`}>
                                      <Clock className="h-3 w-3" />
                                      {vencida ? 'Vencida em' : 'Vence em'}: {new Date(t.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR')}
                                      {vencida && ` (${Math.abs(differenceInDays(parseISO(t.data_vencimento), new Date()))}d atraso)`}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Histórico concluídas */}
                {tarefasConcluidas.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-2 w-2 rounded-full bg-emerald-500" />
                      <h3 className="text-sm font-semibold text-muted-foreground">Histórico — Concluídas ({tarefasConcluidas.length})</h3>
                    </div>
                    <div className="space-y-2">
                      {tarefasConcluidas.map(t => (
                        <div key={t.id} className="rounded-xl border border-border bg-muted/20 p-4 opacity-70">
                          <div className="flex items-center gap-2 flex-wrap">
                            <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                            <p className="text-sm font-medium text-foreground line-through">{t.titulo}</p>
                            {t.data_vencimento && (
                              <span className="text-xs text-muted-foreground">
                                {new Date(t.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR')}
                              </span>
                            )}
                            {t.responsavel_id && (
                              <span className="text-xs text-muted-foreground">· {getPessoaNome(t.responsavel_id)}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* ── Eventos ── */}
          <TabsContent value="eventos" className="p-6 mt-0">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-base font-semibold text-foreground">Eventos do Cliente</h2>
                <p className="text-xs text-muted-foreground">{eventosFuturos.length} próximo(s) · {eventosPassados.length} histórico</p>
              </div>
              <Link to="/Agenda">
                <Button size="sm" variant="outline" className="text-xs">
                  <ExternalLink className="h-3 w-3 mr-1" />Ir para Agenda
                </Button>
              </Link>
            </div>

            {loadingEventos ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Carregando...</p>
            ) : eventosCliente.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-10 text-center">
                <CalendarDays className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Nenhum evento vinculado a este cliente.</p>
                <p className="text-xs text-muted-foreground mt-1">Os eventos são criados na agenda e vinculados pelo nome do cliente.</p>
              </div>
            ) : (
              <div className="space-y-6">

                {/* Próximos eventos */}
                {eventosFuturos.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-2 w-2 rounded-full bg-purple-500" />
                      <h3 className="text-sm font-semibold text-foreground">Próximos ({eventosFuturos.length})</h3>
                    </div>
                    <div className="space-y-2">
                      {eventosFuturos.map(e => {
                        const diasAte = e.data ? differenceInDays(parseISO(e.data), new Date()) : null;
                        return (
                          <div key={e.id} className="rounded-xl border border-border bg-card p-4 hover:border-[#BFDDF7] hover:shadow-sm transition-all">
                            <div className="flex items-start gap-3">
                              <div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                                e.tipo === 'Audiência' ? 'bg-purple-100' :
                                e.tipo === 'Perícia' ? 'bg-blue-100' :
                                e.tipo === 'Avaliação Social' ? 'bg-teal-100' :
                                'bg-[#EAF4FF]'
                              }`}>
                                <CalendarDays className={`h-5 w-5 ${
                                  e.tipo === 'Audiência' ? 'text-purple-600' :
                                  e.tipo === 'Perícia' ? 'text-blue-600' :
                                  e.tipo === 'Avaliação Social' ? 'text-teal-600' :
                                  'text-[#378ADD]'
                                }`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                  <p className="font-semibold text-sm text-foreground">{e.titulo || e.tipo || 'Evento'}</p>
                                  {e.tipo && (
                                    <Badge className={`border text-xs ${EVENTO_COLORS[e.tipo] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                                      {e.tipo}
                                    </Badge>
                                  )}
                                  {e.status && (
                                    <Badge variant="outline" className="text-xs">{e.status}</Badge>
                                  )}
                                </div>
                                {e.descricao && <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{e.descricao}</p>}
                                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                                  {e.data && (
                                    <span className="flex items-center gap-1 font-medium text-foreground">
                                      <Calendar className="h-3 w-3" />
                                      {new Date(e.data + 'T00:00:00').toLocaleDateString('pt-BR')}
                                      {diasAte !== null && (
                                        <span className={`ml-1 ${diasAte <= 7 ? 'text-amber-600 font-semibold' : 'text-muted-foreground'}`}>
                                          ({diasAte === 0 ? 'Hoje!' : `em ${diasAte}d`})
                                        </span>
                                      )}
                                    </span>
                                  )}
                                  {e.hora && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{e.hora}</span>}
                                  {e.local && <span>📍 {e.local}</span>}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Histórico de eventos */}
                {eventosPassados.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-2 w-2 rounded-full bg-slate-400" />
                      <h3 className="text-sm font-semibold text-muted-foreground">Histórico ({eventosPassados.length})</h3>
                    </div>
                    <div className="space-y-2">
                      {eventosPassados.map(e => (
                        <div key={e.id} className="rounded-xl border border-border bg-muted/20 p-4 opacity-70">
                          <div className="flex items-center gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-medium text-foreground">{e.titulo || e.tipo || 'Evento'}</p>
                                {e.tipo && (
                                  <Badge className={`border text-xs ${EVENTO_COLORS[e.tipo] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                                    {e.tipo}
                                  </Badge>
                                )}
                                {e.status && <Badge variant="outline" className="text-xs">{e.status}</Badge>}
                                {e.data && (
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(e.data + 'T00:00:00').toLocaleDateString('pt-BR')}
                                  </span>
                                )}
                              </div>
                              {e.descricao && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{e.descricao}</p>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Dialog Nova Tarefa ── */}
      <Dialog open={tarefaDialog} onOpenChange={setTarefaDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Tarefa — {cliente?.nome_completo}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleTarefaSubmit} className="space-y-4 pt-2">
            <div className="space-y-1">
              <Label>Título *</Label>
              <Input required value={tarefaForm.titulo || ''} onChange={e => setTarefaForm({ ...tarefaForm, titulo: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Prioridade</Label>
                <Select value={tarefaForm.prioridade || 'Média'} onValueChange={v => setTarefaForm({ ...tarefaForm, prioridade: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Baixa">Baixa</SelectItem>
                    <SelectItem value="Média">Média</SelectItem>
                    <SelectItem value="Alta">Alta</SelectItem>
                    <SelectItem value="Urgente">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Prazo *</Label>
                <Input required type="date" value={tarefaForm.data_vencimento || ''} onChange={e => setTarefaForm({ ...tarefaForm, data_vencimento: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Responsável</Label>
              <Select value={tarefaForm.responsavel_id || ''} onValueChange={v => setTarefaForm({ ...tarefaForm, responsavel_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecionar responsável..." /></SelectTrigger>
                <SelectContent>{pessoas.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Descrição</Label>
              <Textarea rows={3} value={tarefaForm.descricao || ''} onChange={e => setTarefaForm({ ...tarefaForm, descricao: e.target.value })} placeholder="Descreva a tarefa..." />
            </div>
            <div className="space-y-1">
              <Label>Observações</Label>
              <Textarea rows={2} value={tarefaForm.observacoes || ''} onChange={e => setTarefaForm({ ...tarefaForm, observacoes: e.target.value })} />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setTarefaDialog(false)}>Cancelar</Button>
              <Button type="submit" className="bg-[#378ADD] hover:bg-[#185FA5] text-white" disabled={createTarefaMutation.isPending}>
                {createTarefaMutation.isPending ? 'Criando...' : 'Criar Tarefa'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Dialog Diagnóstico ── */}
      <Dialog open={diagnosticoDialog} onOpenChange={setDiagnosticoDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Diagnóstico</DialogTitle>
          </DialogHeader>

          {diagnosticoError && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {diagnosticoError}
            </div>
          )}

          <form onSubmit={handleDiagnosticoSubmit} className="space-y-4 pt-2">
            <div className="space-y-1">
              <Label>Diagnóstico</Label>
              <Textarea
                rows={8}
                value={diagnosticoDraft}
                onChange={(e) => setDiagnosticoDraft(e.target.value)}
                placeholder="Digite o diagnóstico do caso..."
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setDiagnosticoDialog(false)}>Cancelar</Button>
              <Button
                type="submit"
                className="bg-[#378ADD] hover:bg-[#185FA5] text-white"
                disabled={updateDiagnosticoMutation.isPending}
              >
                {updateDiagnosticoMutation.isPending ? 'Salvando...' : 'Salvar Diagnóstico'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Dialog Processo ── */}
      <Dialog open={procDialog} onOpenChange={setProcDialog}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProc ? 'Editar Processo' : 'Novo Processo'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleProcSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Número do Processo *</Label>
                <Input required value={procForm.numero_processo} onChange={(e) => { setProcForm({ ...procForm, numero_processo: e.target.value }); setNumError(''); }} />
                {numError && <p className="text-xs text-red-500">{numError}</p>}
              </div>
              <div className="space-y-1">
                <Label>Tipo *</Label>
                <Select value={procForm.tipo_processo} onValueChange={(v) => setProcForm({ ...procForm, tipo_processo: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{TIPOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Status</Label>
                <Select value={procForm.status} onValueChange={(v) => setProcForm({ ...procForm, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUS_P.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Fase</Label>
                <Select value={procForm.fase_processo} onValueChange={(v) => setProcForm({ ...procForm, fase_processo: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{FASES.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Órgão</Label>
                <Input value={procForm.orgao} onChange={(e) => setProcForm({ ...procForm, orgao: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Valor da Causa (R$)</Label>
                <Input type="number" min="0" step="0.01" value={procForm.valor_causa} onChange={(e) => setProcForm({ ...procForm, valor_causa: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Data de Início *</Label>
                <Input required type="date" value={procForm.data_inicio} onChange={(e) => setProcForm({ ...procForm, data_inicio: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Data de Fim</Label>
                <Input type="date" value={procForm.data_fim} onChange={(e) => setProcForm({ ...procForm, data_fim: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>ID Externo</Label>
                <Input value={procForm.id_externo} onChange={(e) => setProcForm({ ...procForm, id_externo: e.target.value })} placeholder="ID do sistema antigo" />
              </div>
              <div className="md:col-span-2 space-y-1">
                <Label>Descrição</Label>
                <Textarea rows={3} value={procForm.descricao} onChange={(e) => setProcForm({ ...procForm, descricao: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={closeProcDialog}>Cancelar</Button>
              <Button type="submit" className="bg-[#378ADD] hover:bg-[#185FA5] text-white" disabled={createProcMutation.isPending || updateProcMutation.isPending}>
                {editingProc ? 'Salvar' : 'Cadastrar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}