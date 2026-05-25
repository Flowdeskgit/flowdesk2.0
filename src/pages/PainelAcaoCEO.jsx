import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { flowdesk } from '@/api/flowdeskClient';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { format, differenceInDays, isToday, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  AlertTriangle, CheckCircle2, Calendar, User, Clock,
  TrendingUp, Users, Briefcase, Building2, Search, Plus,
  ArrowLeft, ChevronRight, BarChart3, Target,
  Zap, ShieldAlert, FileWarning, Activity, Flame,
  FileText, RefreshCw, ExternalLink, Hash, Landmark,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

const hoje = () => { const d = new Date(); d.setHours(0,0,0,0); return d; };

const diasAtraso = (data) => {
  if (!data) return 0;
  const d = new Date(data); d.setHours(0,0,0,0);
  return Math.max(0, differenceInDays(hoje(), d));
};

const diasRestantes = (data) => {
  if (!data) return null;
  const d = new Date(data); d.setHours(0,0,0,0);
  return differenceInDays(d, hoje());
};

const estadoTarefa = (t) => {
  if (t.status === 'Concluída' || t.status === 'Não realizada / Impedimento') return 'concluida';
  if (!t.data_vencimento) return 'em_dia';
  const dr = diasRestantes(t.data_vencimento);
  if (dr < 0) return 'atrasada';
  if (dr === 0) return 'hoje';
  if (dr <= 3) return '3dias';
  if (dr <= 7) return '7dias';
  return 'em_dia';
};

const PRIORIDADE_LABEL = {
  critico:  { label: 'Crítico',         color: 'bg-red-100 text-red-700 border-red-200',       dot: 'bg-red-500' },
  alta:     { label: 'Alta Prioridade',  color: 'bg-orange-100 text-orange-700 border-orange-200', dot: 'bg-orange-500' },
  media:    { label: 'Média',            color: 'bg-yellow-100 text-yellow-700 border-yellow-200', dot: 'bg-yellow-500' },
  baixa:    { label: 'Baixa',            color: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
};

const prioridadeDaTarefa = (t) => {
  const e = estadoTarefa(t);
  if (e === 'atrasada') return 'critico';
  if (e === 'hoje') return 'alta';
  if (e === '3dias') return 'media';
  return 'baixa';
};

const normalizarTexto = (valor) =>
  String(valor ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

const texto = (valor) => String(valor ?? '').trim();

const formatarDataImportacao = (valor) => {
  if (!valor) return '-';
  const parsed = parseISO(String(valor));
  if (isValid(parsed)) return format(parsed, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  return String(valor);
};

const getCampoPrecatorio = (item, chaves) => {
  for (const chave of chaves) {
    const valor = item?.[chave];
    if (valor !== undefined && valor !== null && String(valor).trim() !== '') return valor;
  }
  return '';
};

const CAMPOS_PRECATORIO = [
  { label: 'Ordem', chaves: ['ordem_cronologica', 'ordemCronologica', 'Ordem Cronológica', 'ordem'] },
  { label: 'Nº da RP', chaves: ['numero_rp', 'numeroRP', 'Nº da RP', 'N da RP', 'rp'] },
  { label: 'Nº do Precatório', chaves: ['numero_precatorio', 'numeroPrecatorio', 'Nº do Precatório', 'N do Precatório', 'precatorio'] },
  { label: 'Apresentação', chaves: ['momento_apresentacao_precatorio', 'momentoApresentacaoPrecatorio', 'Momento de Apresentação do Precatório'] },
  { label: 'Requisição', chaves: ['momento_requisicao_precatorio', 'momentoRequisicaoPrecatorio', 'Momento de Requisição do Precatório'] },
  { label: 'Vencimento', chaves: ['vencimento', 'Vencimento'] },
  { label: 'Última atualização', chaves: ['data_ultima_atualizacao', 'dataUltimaAtualizacao', 'Data da última atualização'] },
  { label: 'Natureza', chaves: ['natureza_credito', 'naturezaCredito', 'Natureza do Crédito'] },
  { label: 'Preferência', chaves: ['tipo_preferencia', 'tipoPreferencia', 'Tipo de Preferência'] },
  { label: 'Valor do Precatório', chaves: ['valor_precatorio', 'valorPrecatorio', 'Valor do Precatório'] },
  { label: 'Valor do Pagamento', chaves: ['valor_pagamento', 'valorPagamento', 'Valor do Pagamento'] },
];

const FILTROS = ['Hoje', 'Semana', 'Mês', 'Todos'];
const PRECATORIOS_WEBHOOK_URL = 'https://marciaribeiro.app.n8n.cloud/webhook/precatorios-trt15';

export default function PainelAcaoCEO() {
  const [view, setView] = useState(() => {
    if (typeof window === 'undefined') return 'painel';
    const params = new URLSearchParams(window.location.search);
    return params.get('view') === 'precatorios' ? 'precatorios' : 'painel';
  });
  const [filtro, setFiltro] = useState('Todos');
  const [busca, setBusca] = useState('');
  const [buscaPrecatorio, setBuscaPrecatorio] = useState('');
  const [selectedTask, setSelectedTask] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [retornoExecutivo, setRetornoExecutivo] = useState('');
  const [motivoAtraso, setMotivoAtraso] = useState('');
  const [novoStatus, setNovoStatus] = useState('Concluída');

  const queryClient = useQueryClient();

  const abrirPrecatorios = () => {
    setView('precatorios');
    if (typeof window !== 'undefined') window.history.pushState(null, '', `${window.location.pathname}?view=precatorios`);
  };

  const voltarPainel = () => {
    setView('painel');
    if (typeof window !== 'undefined') window.history.pushState(null, '', window.location.pathname);
  };

  const { data: tarefas = [], isLoading: loadingTarefas } = useQuery({ queryKey: ['tarefas-ceo'], queryFn: () => flowdesk.entities.Tarefa.list('-created_date') });
  const { data: pessoas = [] } = useQuery({ queryKey: ['pessoas-ceo'], queryFn: () => flowdesk.entities.Pessoa.list() });
  const { data: clientes = [] } = useQuery({ queryKey: ['clientes-ceo'], queryFn: () => flowdesk.entities.Cliente.list() });
  const { data: processos = [] } = useQuery({ queryKey: ['processos-ceo'], queryFn: () => flowdesk.entities.Processo.list() });
  const { data: admInss = [] } = useQuery({ queryKey: ['adm-inss-ceo'], queryFn: () => flowdesk.entities.AdministrativoINSS.list() });
  const { data: exigencias = [] } = useQuery({ queryKey: ['exigencias-ceo'], queryFn: () => flowdesk.entities.ExigenciaINSS.list() });
  const { data: precatorios = [], isLoading: loadingPrecatorios, isFetching: fetchingPrecatorios, error: erroPrecatorios, refetch: refetchPrecatorios } = useQuery({
    queryKey: ['precatorios-ceo'],
    queryFn: async () => {
      const response = await fetch(PRECATORIOS_WEBHOOK_URL, { method: 'GET', headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error('Não foi possível carregar o webhook de precatórios do n8n.');
      const data = await response.json();
      if (Array.isArray(data)) return data;
      return Array.isArray(data.rows) ? data.rows : [];
    },
    enabled: view === 'precatorios',
    retry: false,
  });

  const createNotification = useMutation({ mutationFn: (data) => flowdesk.entities.Notificacao.create(data) });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => flowdesk.entities.Tarefa.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tarefas-ceo'] });
      setIsDialogOpen(false);
      setSelectedTask(null);
      setRetornoExecutivo('');
      setMotivoAtraso('');
      setNovoStatus('Concluída');
    },
  });

  const getPessoaNome = (id) => pessoas.find(p => p.id === id)?.nome || '-';

  const tarefasAbertas = useMemo(() => tarefas.filter(t => t.status !== 'Concluída' && t.status !== 'Não realizada / Impedimento'), [tarefas]);

  const tarefasFiltradas = useMemo(() => {
    let base = tarefasAbertas;
    if (filtro === 'Hoje') base = base.filter(t => t.data_vencimento && isToday(new Date(t.data_vencimento)));
    else if (filtro === 'Semana') base = base.filter(t => { if (!t.data_vencimento) return false; return diasRestantes(t.data_vencimento) <= 7; });
    else if (filtro === 'Mês') base = base.filter(t => { if (!t.data_vencimento) return false; return diasRestantes(t.data_vencimento) <= 30; });
    if (busca.trim()) {
      const b = busca.toLowerCase();
      base = base.filter(t => t.titulo?.toLowerCase().includes(b) || t.descricao?.toLowerCase().includes(b) || getPessoaNome(t.responsavel_id).toLowerCase().includes(b));
    }
    return base;
  }, [tarefasAbertas, filtro, busca, pessoas]);

  const urgentes   = tarefasAbertas.filter(t => (t.status_detalhado || '') === 'Urgente');
  const venceHoje  = tarefasAbertas.filter(t => estadoTarefa(t) === 'hoje');
  const atrasadas  = tarefasAbertas.filter(t => estadoTarefa(t) === 'atrasada');
  const vence3dias = tarefasAbertas.filter(t => estadoTarefa(t) === '3dias');
  const vence7dias = tarefasAbertas.filter(t => estadoTarefa(t) === '7dias');

  const criticas = tarefasFiltradas.filter(t => prioridadeDaTarefa(t) === 'critico');
  const altas    = tarefasFiltradas.filter(t => prioridadeDaTarefa(t) === 'alta');
  const medias   = tarefasFiltradas.filter(t => prioridadeDaTarefa(t) === 'media');

  const alertas = useMemo(() => {
    const lista = [];
    urgentes.slice(0, 3).forEach(t => { lista.push({ tipo: 'urgente', texto: `Tarefa URGENTE — resolver hoje`, desc: t.titulo, nivel: 'critico', icon: Zap }); });
    exigencias.forEach(e => {
      if (!e.prazo_final || e.status_exigencia === 'Cumprida' || e.status_exigencia === 'Cancelada') return;
      const dr = diasRestantes(e.prazo_final);
      if (dr <= 5 && dr >= 0) lista.push({ tipo: 'exigencia', texto: `Exigência vence em ${dr === 0 ? 'hoje' : dr + ' dias'}`, desc: e.descricao_exigencia, nivel: dr === 0 ? 'critico' : 'alta', icon: FileWarning });
      else if (dr < 0) lista.push({ tipo: 'exigencia', texto: `Exigência vencida há ${-dr} dia(s)`, desc: e.descricao_exigencia, nivel: 'critico', icon: FileWarning });
    });
    atrasadas.slice(0, 5).forEach(t => {
      const dias = diasAtraso(t.data_vencimento);
      lista.push({ tipo: 'tarefa', texto: `Tarefa atrasada há ${dias} dia(s)`, desc: t.titulo, nivel: dias > 7 ? 'critico' : 'alta', icon: AlertTriangle });
    });
    return lista.sort((a, b) => (a.nivel === 'critico' ? -1 : 1));
  }, [exigencias, atrasadas, urgentes]);

  const porResponsavel = useMemo(() => {
    const map = {};
    tarefasAbertas.forEach(t => {
      const key = t.responsavel_id || '__sem__';
      if (!map[key]) map[key] = { total: 0, atrasadas: 0 };
      map[key].total++;
      if (estadoTarefa(t) === 'atrasada') map[key].atrasadas++;
    });
    return Object.entries(map)
      .map(([id, v]) => ({ id, nome: id === '__sem__' ? 'Sem responsável' : getPessoaNome(id), ...v }))
      .sort((a, b) => b.total - a.total).slice(0, 6);
  }, [tarefasAbertas, pessoas]);

  const loteMaisRecente = useMemo(() => {
    const primeiroComLote = precatorios.find(p => p.import_batch_id);
    return primeiroComLote?.import_batch_id || null;
  }, [precatorios]);

  const precatoriosAtuais = useMemo(() => {
    if (!loteMaisRecente) return precatorios;
    return precatorios.filter(p => p.import_batch_id === loteMaisRecente);
  }, [precatorios, loteMaisRecente]);

  const precatoriosFiltrados = useMemo(() => {
    const termo = normalizarTexto(buscaPrecatorio);
    if (!termo) return precatoriosAtuais;
    return precatoriosAtuais.filter(item =>
      CAMPOS_PRECATORIO.some(campo => normalizarTexto(getCampoPrecatorio(item, campo.chaves)).includes(termo)) ||
      normalizarTexto(item.devedor).includes(termo) ||
      normalizarTexto(item.fonte).includes(termo)
    );
  }, [precatoriosAtuais, buscaPrecatorio]);

  const clientesAtivos = clientes.length;
  const processosAtivos = processos.filter(p => p.status === 'Em andamento').length;
  const admAtivos = admInss.filter(a => !['Concluído', 'Encerrado', 'Indeferido'].includes(a.status_geral)).length;
  const deferidos = admInss.filter(a => a.status_geral === 'Deferido').length;
  const indeferidos = admInss.filter(a => a.status_geral === 'Indeferido').length;
  const taxaDeferimento = deferidos + indeferidos > 0 ? Math.round((deferidos / (deferidos + indeferidos)) * 100) : null;

  const handleConcluir = (task) => {
    setSelectedTask(task);
    setNovoStatus('Concluída');
    setRetornoExecutivo(task.retorno_executivo || '');
    setMotivoAtraso('');
    setIsDialogOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!retornoExecutivo.trim()) { alert('Preencha o Retorno Executivo'); return; }
    const estado = estadoTarefa(selectedTask);
    if (estado === 'atrasada' && !motivoAtraso.trim()) { alert('Preencha o Motivo do Atraso'); return; }
    const dadosUpdate = { ...selectedTask, status: novoStatus, retorno_executivo: retornoExecutivo };
    if (motivoAtraso.trim()) dadosUpdate.observacoes = (dadosUpdate.observacoes || '') + `\n\nMOTIVO DO ATRASO: ${motivoAtraso}`;
    updateMutation.mutate({ id: selectedTask.id, data: dadosUpdate });
    if (estado === 'atrasada') {
      createNotification.mutate({ titulo: '✅ Tarefa Atrasada Concluída', mensagem: `"${selectedTask.titulo}" concluída. Motivo: ${motivoAtraso}`, tipo: 'info', usuario_id: 'dra', tarefa_id: selectedTask.id, lida: false });
    }
  };

  if (view === 'precatorios') {
    return (
      <PrecatoriosView
        buscaPrecatorio={buscaPrecatorio}
        setBuscaPrecatorio={setBuscaPrecatorio}
        voltarPainel={voltarPainel}
        precatorios={precatoriosAtuais}
        precatoriosFiltrados={precatoriosFiltrados}
        loadingPrecatorios={loadingPrecatorios}
        fetchingPrecatorios={fetchingPrecatorios}
        erroPrecatorios={erroPrecatorios}
        refetchPrecatorios={refetchPrecatorios}
      />
    );
  }

  if (loadingTarefas) return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}</div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Painel Estratégico</h1>
            <p className="text-muted-foreground text-sm mt-0.5">{format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link to="/Tarefas">
              <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                <Plus className="h-3.5 w-3.5" />Nova Tarefa
              </Button>
            </Link>
            <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={abrirPrecatorios}>
              <FileText className="h-3.5 w-3.5" />Precatórios
            </Button>
            <Link to="/Clientes">
              <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                <Plus className="h-3.5 w-3.5" />Novo Cliente
              </Button>
            </Link>
            <Link to="/AdministrativoINSS">
              <Button size="sm" className="gap-1.5 text-xs bg-[#378ADD] hover:bg-[#185FA5] text-white">
                <Plus className="h-3.5 w-3.5" />Novo Adm. INSS
              </Button>
            </Link>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar tarefa, responsável..." className="pl-9 rounded-xl" />
          </div>
          <div className="flex gap-1.5 bg-card border border-border rounded-xl p-1">
            {FILTROS.map(f => (
              <button
                key={f}
                onClick={() => setFiltro(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  filtro === f ? 'bg-[#378ADD] text-white shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >{f}</button>
            ))}
          </div>
        </div>

        <section>
          <SectionLabel icon={<BarChart3 className="h-4 w-4" />} title="Indicadores de Prazos" />
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-3">
            <StatCard label="Urgentes" value={urgentes.length} icon={<Zap className="h-5 w-5" />} bg="bg-purple-50" border="border-purple-400" text="text-purple-700" num="text-purple-900" highlight={urgentes.length > 0} />
            <StatCard label="Vence Hoje" value={venceHoje.length} icon={<Clock className="h-5 w-5" />} bg="bg-amber-50" border="border-amber-200" text="text-amber-700" num="text-amber-900" />
            <StatCard label="Atrasadas" value={atrasadas.length} icon={<AlertTriangle className="h-5 w-5" />} bg="bg-red-50" border="border-red-200" text="text-red-700" num="text-red-900" />
            <StatCard label="Vence em 3 dias" value={vence3dias.length} icon={<Flame className="h-5 w-5" />} bg="bg-orange-50" border="border-orange-200" text="text-orange-700" num="text-orange-900" />
            <StatCard label="Vence em 7 dias" value={vence7dias.length} icon={<Calendar className="h-5 w-5" />} bg="bg-blue-50" border="border-blue-200" text="text-blue-700" num="text-blue-900" />
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section>
            <SectionLabel icon={<Target className="h-4 w-4" />} title="Prioridades da CEO" />
            <div className="mt-3 bg-card rounded-2xl border border-border shadow-sm overflow-hidden divide-y divide-border">
              {criticas.length === 0 && altas.length === 0 && medias.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground text-sm">
                  <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-400" />
                  Nenhuma prioridade crítica no período
                </div>
              ) : (
                <>
                  {criticas.slice(0, 4).map(t => <PrioridadeRow key={t.id} tarefa={t} nivel="critico" onClick={() => handleConcluir(t)} getPessoaNome={getPessoaNome} />)}
                  {altas.slice(0, 3).map(t => <PrioridadeRow key={t.id} tarefa={t} nivel="alta" onClick={() => handleConcluir(t)} getPessoaNome={getPessoaNome} />)}
                  {medias.slice(0, 3).map(t => <PrioridadeRow key={t.id} tarefa={t} nivel="media" onClick={() => handleConcluir(t)} getPessoaNome={getPessoaNome} />)}
                </>
              )}
            </div>
          </section>

          <section>
            <SectionLabel icon={<ShieldAlert className="h-4 w-4" />} title="Alertas Inteligentes" />
            <div className="mt-3 space-y-2.5">
              {alertas.length === 0 ? (
                <div className="bg-card rounded-2xl border border-border p-6 text-center text-muted-foreground text-sm">
                  <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-400" />
                  Nenhum alerta ativo
                </div>
              ) : alertas.slice(0, 6).map((a, i) => <AlertaCard key={i} alerta={a} />)}
            </div>
          </section>
        </div>

        {urgentes.length > 0 && (
          <section>
            <SectionLabel icon={<Zap className="h-4 w-4 text-purple-600" />} title={`Tarefas Urgentes — Resolver Hoje (${urgentes.length})`} />
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {urgentes.slice(0, 6).map(t => (
                <div key={t.id} onClick={() => handleConcluir(t)} className="bg-purple-50 border-2 border-purple-400 rounded-xl p-4 cursor-pointer hover:shadow-md hover:shadow-purple-200 transition-all group">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Zap className="h-3.5 w-3.5 text-purple-600 flex-shrink-0" />
                        <p className="text-sm font-bold text-purple-900 truncate">{t.titulo}</p>
                      </div>
                      <p className="text-xs text-purple-600">{getPessoaNome(t.responsavel_id)}</p>
                      {t.data_vencimento && <p className="text-xs text-purple-500 mt-1">Vence: {format(new Date(t.data_vencimento), 'dd/MM/yyyy', { locale: ptBR })}</p>}
                    </div>
                    <ChevronRight className="h-4 w-4 text-purple-300 group-hover:text-purple-600 transition-colors flex-shrink-0" />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <section className="lg:col-span-3">
            <SectionLabel icon={<AlertTriangle className="h-4 w-4 text-red-500" />} title={`Tarefas Atrasadas (${atrasadas.length})`} />
            <div className="mt-3 space-y-3">
              {atrasadas.length === 0 ? (
                <div className="bg-card rounded-2xl border border-border p-8 text-center text-muted-foreground text-sm">
                  <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-400" />
                  Nenhuma tarefa atrasada
                </div>
              ) : atrasadas.slice(0, 8).map(t => <TarefaAtrasadaCard key={t.id} tarefa={t} getPessoaNome={getPessoaNome} onClick={() => handleConcluir(t)} />)}
            </div>
          </section>

          <section className="lg:col-span-2">
            <SectionLabel icon={<Users className="h-4 w-4" />} title="Carga por Responsável" />
            <div className="mt-3 bg-card rounded-2xl border border-border shadow-sm overflow-hidden divide-y divide-border">
              {porResponsavel.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground text-sm">Sem dados</div>
              ) : porResponsavel.map((p) => <ResponsavelRow key={p.id} pessoa={p} totalGeral={tarefasAbertas.length} />)}
            </div>
          </section>
        </div>

        <section>
          <SectionLabel icon={<Activity className="h-4 w-4" />} title="Visão Geral do Escritório" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
            <NegocioCard label="Clientes Ativos" value={clientesAtivos} icon={<Users className="h-5 w-5 text-violet-600" />} bg="bg-violet-50" border="border-violet-200" text="text-violet-700" link="/Clientes" />
            <NegocioCard label="Processos Ativos" value={processosAtivos} icon={<Briefcase className="h-5 w-5 text-blue-600" />} bg="bg-blue-50" border="border-blue-200" text="text-blue-700" link="/Processos" />
            <NegocioCard label="Adm. INSS Ativos" value={admAtivos} icon={<Building2 className="h-5 w-5 text-teal-600" />} bg="bg-teal-50" border="border-teal-200" text="text-teal-700" link="/AdministrativoINSS" />
            <div className="rounded-2xl border bg-emerald-50 border-emerald-200 p-5 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
                {taxaDeferimento !== null && <span className="text-2xl font-bold text-emerald-900">{taxaDeferimento}%</span>}
              </div>
              <p className="text-xs font-medium text-emerald-700">Taxa de Deferimento</p>
              <div className="flex gap-2 text-xs text-slate-500">
                <span className="text-emerald-600 font-semibold">{deferidos} def.</span>
                <span>·</span>
                <span className="text-red-500 font-semibold">{indeferidos} ndef.</span>
              </div>
              {taxaDeferimento !== null && (
                <div className="w-full bg-slate-200 rounded-full h-1.5 mt-1">
                  <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${taxaDeferimento}%` }} />
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registrar Retorno Executivo</DialogTitle>
          </DialogHeader>
          {selectedTask && (
            <form onSubmit={handleSubmit} className="space-y-4 pt-1">
              <div className="rounded-xl bg-muted/40 p-4 border border-border">
                <p className="text-xs text-muted-foreground mb-1">Tarefa</p>
                <p className="font-semibold text-foreground text-sm">{selectedTask.titulo}</p>
                <div className="mt-2 pt-2 border-t border-border flex flex-wrap gap-4 text-xs text-muted-foreground">
                  <span><strong>Responsável:</strong> {getPessoaNome(selectedTask.responsavel_id)}</span>
                  {selectedTask.data_vencimento && <span><strong>Prazo:</strong> {format(new Date(selectedTask.data_vencimento), 'dd/MM/yyyy', { locale: ptBR })}</span>}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Status Final</Label>
                <Select value={novoStatus} onValueChange={setNovoStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Concluída">Concluída</SelectItem>
                    <SelectItem value="Não realizada / Impedimento">Não realizada / Impedimento</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {estadoTarefa(selectedTask) === 'atrasada' && (
                <div className="space-y-1.5 p-3 rounded-xl bg-red-50 border border-red-200">
                  <Label className="text-red-700 font-semibold">Motivo do Atraso *</Label>
                  <Textarea value={motivoAtraso} onChange={e => setMotivoAtraso(e.target.value)} placeholder="Explique o motivo do atraso..." rows={3} className="border-red-200" />
                </div>
              )}
              <div className="space-y-1.5">
                <Label>Retorno Executivo *</Label>
                <Textarea value={retornoExecutivo} onChange={e => setRetornoExecutivo(e.target.value)} placeholder="Resultado, ações tomadas e próximos passos..." rows={4} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700" disabled={updateMutation.isPending}>
                  <CheckCircle2 className="mr-1.5 h-4 w-4" />Concluir
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PrecatoriosView({ buscaPrecatorio, setBuscaPrecatorio, voltarPainel, precatorios, precatoriosFiltrados, loadingPrecatorios, fetchingPrecatorios, erroPrecatorios, refetchPrecatorios }) {
  const totalPrecatarios = new Set(
    precatorios.map(p => texto(getCampoPrecatorio(p, ['numero_precatorio', 'numeroPrecatorio', 'Nº do Precatório']))).filter(Boolean)
  ).size;
  const ultimaAtualizacao = precatorios.find(p => p.atualizado_em)?.atualizado_em;
  const pdfUrl = precatorios.find(p => p.pdf_url)?.pdf_url;
  const precatoriosExibidos = precatoriosFiltrados.slice(0, 500);
  const resultadosOcultos = Math.max(0, precatoriosFiltrados.length - precatoriosExibidos.length);

  if (loadingPrecatorios) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-10 w-72" />
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-96 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={voltarPainel}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <Landmark className="h-5 w-5 text-[#378ADD]" />
              <h1 className="text-2xl font-bold text-foreground tracking-tight">Precatórios</h1>
            </div>
            <p className="text-sm text-muted-foreground mt-1">Fazenda Pública do Estado de São Paulo</p>
          </div>
          <div className="flex items-center gap-2">
            {pdfUrl && (
              <a href={pdfUrl} target="_blank" rel="noreferrer">
                <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                  <ExternalLink className="h-3.5 w-3.5" />PDF
                </Button>
              </a>
            )}
            <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => refetchPrecatorios()} disabled={fetchingPrecatorios}>
              <RefreshCw className={`h-3.5 w-3.5 ${fetchingPrecatorios ? 'animate-spin' : ''}`} />Atualizar
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <ResumoPrecatorioCard icon={<FileText className="h-4 w-4" />} label="Registros" value={precatorios.length} />
          <ResumoPrecatorioCard icon={<Hash className="h-4 w-4" />} label="Precatórios" value={totalPrecatarios} />
          <ResumoPrecatorioCard icon={<Search className="h-4 w-4" />} label="Resultado" value={precatoriosFiltrados.length} />
          <ResumoPrecatorioCard icon={<Calendar className="h-4 w-4" />} label="Atualização" value={formatarDataImportacao(ultimaAtualizacao)} compact />
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input value={buscaPrecatorio} onChange={e => setBuscaPrecatorio(e.target.value)} placeholder="Buscar por número do precatório, RP, natureza, preferência, valor..." className="pl-9 rounded-xl" />
        </div>

        {erroPrecatorios && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            Não consegui carregar o webhook de precatórios do n8n. Confirme se o workflow TRT15 Precatórios está ativo.
          </div>
        )}
        {resultadosOcultos > 0 && (
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
            Mostrando os primeiros 500 resultados. Refine a busca para localizar registros específicos.
          </div>
        )}

        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  {CAMPOS_PRECATORIO.map(campo => (
                    <th key={campo.label} className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">{campo.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {precatoriosFiltrados.length === 0 ? (
                  <tr><td colSpan={CAMPOS_PRECATORIO.length} className="h-32 text-center text-muted-foreground">Nenhum precatório encontrado</td></tr>
                ) : precatoriosExibidos.map((item, index) => (
                  <tr key={item.id || `${getCampoPrecatorio(item, ['numero_precatorio', 'numeroPrecatorio'])}-${index}`} className="hover:bg-muted/40">
                    {CAMPOS_PRECATORIO.map(campo => {
                      const valor = getCampoPrecatorio(item, campo.chaves);
                      const isPrecatorio = campo.label === 'Nº do Precatório';
                      const isPreferencia = campo.label === 'Preferência';
                      const isValor = campo.label.includes('Valor');
                      return (
                        <td key={campo.label} className={`px-3 py-3 align-middle ${isValor ? 'text-right whitespace-nowrap' : 'whitespace-nowrap'}`}>
                          {isPreferencia && valor ? (
                            <Badge className="bg-[#EAF4FF] text-[#185FA5] border-[#BFDDF7] border">{valor}</Badge>
                          ) : (
                            <span className={isPrecatorio ? 'font-mono text-xs' : ''}>{valor || '-'}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function ResumoPrecatorioCard({ icon, label, value, compact }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 flex items-center gap-3">
      <div className="h-9 w-9 rounded-xl bg-[#EAF4FF] text-[#378ADD] flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`${compact ? 'text-sm' : 'text-xl'} font-bold text-foreground truncate`}>{value}</p>
      </div>
    </div>
  );
}

function SectionLabel({ icon, title }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground">{icon}</span>
      <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">{title}</h2>
    </div>
  );
}

function StatCard({ label, value, icon, bg, border, text, num, highlight }) {
  return (
    <div className={`rounded-2xl border-2 ${bg} ${border} p-5 flex flex-col gap-3 ${highlight ? 'ring-2 ring-purple-400 ring-offset-1 shadow-lg shadow-purple-100' : ''}`}>
      <div className={`flex items-center justify-between ${text}`}>{icon}<span className={`text-3xl font-bold ${num}`}>{value}</span></div>
      <p className={`text-xs font-medium ${text}`}>{label}</p>
    </div>
  );
}

function NegocioCard({ label, value, icon, bg, border, text, link }) {
  return (
    <Link to={link}>
      <div className={`rounded-2xl border ${bg} ${border} p-5 flex flex-col gap-3 hover:shadow-md transition-shadow cursor-pointer`}>
        <div className="flex items-center justify-between">{icon}<span className="text-2xl font-bold text-foreground">{value}</span></div>
        <p className={`text-xs font-medium ${text}`}>{label}</p>
      </div>
    </Link>
  );
}

function PrioridadeRow({ tarefa, nivel, onClick, getPessoaNome }) {
  const cfg = PRIORIDADE_LABEL[nivel];
  const dr = tarefa.data_vencimento ? diasRestantes(tarefa.data_vencimento) : null;
  return (
    <div onClick={onClick} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 cursor-pointer transition-colors group">
      <span className={`h-2 w-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{tarefa.titulo}</p>
        <p className="text-xs text-muted-foreground truncate">{getPessoaNome(tarefa.responsavel_id)}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {dr !== null && (
          <span className={`text-xs font-medium ${dr < 0 ? 'text-red-600' : dr === 0 ? 'text-amber-600' : 'text-orange-500'}`}>
            {dr < 0 ? `${-dr}d atraso` : dr === 0 ? 'Hoje' : `${dr}d`}
          </span>
        )}
        <ChevronRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-slate-500 transition-colors" />
      </div>
    </div>
  );
}

function AlertaCard({ alerta }) {
  const { nivel, texto, desc, icon: Icon, tipo } = alerta;
  const isCritico = nivel === 'critico';
  const isUrgente = tipo === 'urgente';
  return (
    <div className={`rounded-xl border p-4 flex gap-3 ${isUrgente ? 'bg-purple-50 border-purple-400 shadow-sm shadow-purple-100' : isCritico ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-200'}`}>
      <Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${isUrgente ? 'text-purple-600' : isCritico ? 'text-red-500' : 'text-orange-500'}`} />
      <div className="min-w-0">
        <p className={`text-xs font-semibold ${isUrgente ? 'text-purple-800' : isCritico ? 'text-red-700' : 'text-orange-700'}`}>{texto}</p>
        {desc && <p className="text-xs text-slate-500 mt-0.5 truncate">{desc}</p>}
      </div>
      <Badge className={`ml-auto flex-shrink-0 text-[10px] border ${isUrgente ? 'bg-purple-100 text-purple-800 border-purple-300' : isCritico ? 'bg-red-100 text-red-700 border-red-200' : 'bg-orange-100 text-orange-700 border-orange-200'}`}>
        {isUrgente ? '⚡ Urgente' : isCritico ? 'Crítico' : 'Atenção'}
      </Badge>
    </div>
  );
}

function TarefaAtrasadaCard({ tarefa, getPessoaNome, onClick }) {
  const dias = diasAtraso(tarefa.data_vencimento);
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} onClick={onClick} className="bg-card rounded-xl border border-border p-4 hover:border-red-300 hover:shadow-sm transition-all cursor-pointer group">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500 flex-shrink-0" />
            <p className="text-sm font-semibold text-slate-800 truncate">{tarefa.titulo}</p>
          </div>
          {tarefa.descricao && <p className="text-xs text-slate-500 line-clamp-1 ml-3.5">{tarefa.descricao}</p>}
          <div className="flex items-center gap-3 mt-2 ml-3.5">
            <span className="flex items-center gap-1 text-xs text-slate-400"><User className="h-3 w-3" />{getPessoaNome(tarefa.responsavel_id)}</span>
            {tarefa.data_vencimento && <span className="flex items-center gap-1 text-xs text-slate-400"><Calendar className="h-3 w-3" />{format(new Date(tarefa.data_vencimento), 'dd/MM/yyyy', { locale: ptBR })}</span>}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge className="bg-red-100 text-red-700 border-red-200 border text-xs whitespace-nowrap">{dias}d atraso</Badge>
          <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-[#378ADD] transition-colors" />
        </div>
      </div>
    </motion.div>
  );
}

function ResponsavelRow({ pessoa, totalGeral }) {
  const pct = totalGeral > 0 ? Math.round((pessoa.total / totalGeral) * 100) : 0;
  const carga = pct >= 30 ? 'text-red-600' : pct >= 15 ? 'text-orange-600' : 'text-emerald-600';
  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
            <User className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground truncate max-w-[120px]">{pessoa.nome}</p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-muted-foreground">{pessoa.total} tarefas</span>
          {pessoa.atrasadas > 0 && <span className="text-red-600 font-semibold">{pessoa.atrasadas} at.</span>}
          <span className={`font-bold ${carga}`}>{pct}%</span>
        </div>
      </div>
      <div className="w-full bg-muted rounded-full h-1.5 ml-9">
        <div className={`h-1.5 rounded-full transition-all ${pct >= 30 ? 'bg-red-400' : pct >= 15 ? 'bg-orange-400' : 'bg-emerald-400'}`} style={{ width: `${Math.min(pct * 2, 100)}%` }} />
      </div>
    </div>
  );
}