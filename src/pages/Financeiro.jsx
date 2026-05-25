import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { flowdesk } from '@/api/flowdeskClient';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ComposedChart,
  Area,
  Line
} from 'recharts';
import {
  Plus,
  TrendingUp,
  TrendingDown,
  DollarSign,
  CheckCircle,
  Search,
  Pencil,
  Trash2,
  Lock,
  AlertTriangle,
  FileText,
  Calendar,
  Link2,
  Wallet,
  Landmark
} from 'lucide-react';
import { differenceInDays, format, parseISO } from 'date-fns';

const CATEGORIAS = [
  'Honorários',
  'Custas Processuais',
  'Despesas Operacionais',
  'Reembolso',
  'Salários',
  'Aluguel',
  'Material',
  'Marketing',
  'Tecnologia',
  'Outro'
];

const FORMAS = [
  'Pix',
  'Transferência',
  'Dinheiro',
  'Cheque',
  'Cartão de Débito',
  'Cartão de Crédito',
  'Boleto'
];

const STATUS = ['Confirmado', 'Pendente', 'Cancelado'];
const TIPOS = ['Entrada', 'Saída'];
const ORIGENS_HONORARIO = ['administrativo', 'judicial', 'avulso', 'outro'];
const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const SENHA_CORRETA = 'MCR2024';

const emptyForm = {
  tipo: 'Entrada',
  categoria: 'Honorários',
  descricao: '',
  valor: '',
  data: format(new Date(), 'yyyy-MM-dd'),
  data_vencimento: '',
  status: 'Confirmado',
  forma_pagamento: 'Pix',
  observacoes: '',
  conciliado: false,
  cliente_id: '',
  cliente_nome: '',
  tipo_origem: 'avulso',
  processo_id: '',
  processo_titulo: '',
  origem_modulo: 'manual',
  numero_referencia: '',
  eh_honorario: true,
  parcelas: '',
  parcela_atual: '',
  contrato_referencia: ''
};

function fmt(v) {
  return (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function toNumber(v) {
  if (typeof v === 'number') return v;
  if (!v) return 0;
  const parsed = Number(String(v).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
}

function diffDias(dataStr) {
  if (!dataStr) return null;
  try { return differenceInDays(parseISO(dataStr), new Date()); } catch { return null; }
}

function safeDateFormat(dateStr, pattern = 'dd/MM/yyyy') {
  if (!dateStr) return '-';
  try { return format(parseISO(dateStr), pattern); } catch { return '-'; }
}

function getEntityApi(entityName) {
  return flowdesk?.entities?.[entityName] || null;
}

async function safeList(entityName, sort = '-created_date', limit = 500) {
  try {
    const api = getEntityApi(entityName);
    if (!api?.list) return [];
    const result = await api.list(sort, limit);
    return Array.isArray(result) ? result : [];
  } catch (error) {
    console.error(`Erro ao listar entidade ${entityName}:`, error);
    return [];
  }
}

function getClientLabel(cliente) {
  return (
    cliente?.nome || cliente?.name || cliente?.full_name ||
    cliente?.cliente_nome || cliente?.razao_social ||
    cliente?.nome_completo || `Cliente ${cliente?.id || ''}`
  );
}

function getProcessLabel(proc, tipo = '') {
  const numero = proc?.numero_processo || proc?.numero || proc?.protocolo || proc?.nb || proc?.nup || proc?.referencia || '';
  const titulo = proc?.titulo || proc?.descricao || proc?.nome || proc?.assunto || proc?.tipo_beneficio || proc?.tipo_acao || proc?.objeto || '';
  const cliente = proc?.cliente_nome || proc?.nome_cliente || proc?.requerente || proc?.autor || '';
  const partes = [numero, titulo, cliente].filter(Boolean);
  if (partes.length) return partes.join(' • ');
  return `${tipo === 'administrativo' ? 'Processo Administrativo' : 'Processo Judicial'} ${proc?.id || ''}`;
}

function getClientIdFromProcess(proc) {
  return proc?.cliente_id || proc?.cliente || proc?.pessoa_id || proc?.autor_id || proc?.requerente_id || '';
}

function PasswordGate({ onUnlock }) {
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState(false);

  const check = () => {
    if (senha === SENHA_CORRETA) { onUnlock(); }
    else { setErro(true); setSenha(''); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-8 w-full max-w-sm text-center space-y-4">
        <div className="h-14 w-14 bg-[#EAF4FF] rounded-full flex items-center justify-center mx-auto">
          <Lock className="h-7 w-7 text-[#378ADD]" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">Módulo Financeiro</h2>
        <p className="text-slate-500 text-sm">Área restrita. Digite a senha para continuar.</p>
        <Input
          type="password"
          placeholder="Senha"
          value={senha}
          onChange={(e) => { setSenha(e.target.value); setErro(false); }}
          onKeyDown={(e) => e.key === 'Enter' && check()}
          className={erro ? 'border-red-500' : ''}
        />
        {erro && <p className="text-xs text-red-500">Senha incorreta.</p>}
        <Button onClick={check} className="w-full bg-[#378ADD] hover:bg-[#185FA5] text-white">
          Entrar
        </Button>
      </div>
    </div>
  );
}

function ErrorState({ title = 'Erro ao carregar', description = 'Algo deu errado.' }) {
  return (
    <div className="bg-white rounded-xl border border-red-200 p-8 text-center">
      <AlertTriangle className="h-10 w-10 text-red-500 mx-auto mb-3" />
      <h3 className="font-semibold text-slate-800">{title}</h3>
      <p className="text-sm text-slate-500 mt-1">{description}</p>
    </div>
  );
}

function AlertaBadge({ dataVencimento }) {
  const diff = diffDias(dataVencimento);
  if (diff === null) return null;
  if (diff < 0) return <Badge className="bg-red-100 text-red-700 border-0 text-xs">Vencido {Math.abs(diff)}d atrás</Badge>;
  if (diff <= 7) return <Badge className="bg-orange-100 text-orange-700 border-0 text-xs">Vence em {diff}d</Badge>;
  return null;
}

function OrigemBadge({ origem }) {
  if (!origem) return <Badge variant="outline">Sem origem</Badge>;
  const map = {
    administrativo: 'bg-blue-100 text-blue-700 border-0',
    judicial: 'bg-violet-100 text-violet-700 border-0',
    avulso: 'bg-slate-100 text-slate-700 border-0',
    outro: 'bg-amber-100 text-amber-700 border-0'
  };
  const labelMap = {
    administrativo: 'Administrativo',
    judicial: 'Judicial',
    avulso: 'Avulso',
    outro: 'Outro'
  };
  return <Badge className={map[origem] || 'bg-slate-100 text-slate-700 border-0'}>{labelMap[origem] || origem}</Badge>;
}

function ContasList({ items, tipo, onEdit, onDelete }) {
  if (!items.length) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
        <DollarSign className="h-10 w-10 mx-auto mb-2 opacity-30" />
        <p>Nenhuma conta {tipo === 'pagar' ? 'a pagar' : 'a receber'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((l) => {
        const diff = diffDias(l.data_vencimento);
        let alertClass = '';
        if (diff !== null) {
          if (diff < 0) alertClass = 'border-red-300 bg-red-50';
          else if (diff <= 7) alertClass = 'border-orange-300 bg-orange-50';
        }
        return (
          <div key={l.id} className={`bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between gap-4 ${alertClass}`}>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-medium text-slate-800 text-sm">{l.descricao || 'Sem descrição'}</p>
                <AlertaBadge dataVencimento={l.data_vencimento} />
                {l.categoria === 'Honorários' && <OrigemBadge origem={l.tipo_origem} />}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {l.categoria}
                {l.cliente_nome ? ` · Cliente: ${l.cliente_nome}` : ''}
                {l.data_vencimento ? ` · Vence: ${safeDateFormat(l.data_vencimento)}` : ''}
              </p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <span className={`font-bold text-sm ${tipo === 'pagar' ? 'text-red-600' : 'text-green-600'}`}>
                {fmt(l.valor)}
              </span>
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onEdit(l)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500" onClick={() => onDelete(l.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function Financeiro() {
  const qc = useQueryClient();
  const [unlocked, setUnlocked] = useState(false);
  const [filtroMes, setFiltroMes] = useState(new Date().getMonth());
  const [filtroAno, setFiltroAno] = useState(new Date().getFullYear());
  const [busca, setBusca] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('Todas');
  const [filtroOrigem, setFiltroOrigem] = useState('todas');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['financeiro-modulo-completo'],
    enabled: unlocked,
    queryFn: async () => {
      const [lancamentos, clientes, processosAdministrativos, processosJudiciais] = await Promise.all([
        safeList('LancamentoFinanceiro', '-data', 1000),
        safeList('Cliente', '-created_date', 1000),
        safeList('ProcessoAdministrativo', '-created_date', 1000),
        safeList('ProcessoJudicial', '-created_date', 1000)
      ]);
      return { lancamentos, clientes, processosAdministrativos, processosJudiciais };
    }
  });

  const lancamentos = data?.lancamentos || [];
  const clientes = data?.clientes || [];
  const processosAdministrativos = data?.processosAdministrativos || [];
  const processosJudiciais = data?.processosJudiciais || [];

  const clientesOrdenados = useMemo(() => {
    return [...clientes].sort((a, b) => getClientLabel(a).localeCompare(getClientLabel(b), 'pt-BR'));
  }, [clientes]);

  const processosAdministrativosNormalizados = useMemo(() => {
    return processosAdministrativos.map((item) => ({
      ...item, _tipo: 'administrativo',
      _label: getProcessLabel(item, 'administrativo'),
      _cliente_id: getClientIdFromProcess(item)
    }));
  }, [processosAdministrativos]);

  const processosJudiciaisNormalizados = useMemo(() => {
    return processosJudiciais.map((item) => ({
      ...item, _tipo: 'judicial',
      _label: getProcessLabel(item, 'judicial'),
      _cliente_id: getClientIdFromProcess(item)
    }));
  }, [processosJudiciais]);

  const processosDaOrigem = useMemo(() => {
    let base = [];
    if (form.tipo_origem === 'administrativo') base = processosAdministrativosNormalizados;
    if (form.tipo_origem === 'judicial') base = processosJudiciaisNormalizados;
    if (!form.cliente_id) return base;
    return base.filter((p) => String(p._cliente_id || '') === String(form.cliente_id || ''));
  }, [form.tipo_origem, form.cliente_id, processosAdministrativosNormalizados, processosJudiciaisNormalizados]);

  useEffect(() => {
    const ehHonorario = form.categoria === 'Honorários';
    setForm((prev) => ({ ...prev, eh_honorario: ehHonorario }));
  }, [form.categoria]);

  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      const api = getEntityApi('LancamentoFinanceiro');
      if (!api) throw new Error('Entidade LancamentoFinanceiro não encontrada.');
      if (editingId) return api.update(editingId, payload);
      return api.create(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['financeiro-modulo-completo'] });
      setDialogOpen(false);
      setEditingId(null);
      setForm(emptyForm);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const api = getEntityApi('LancamentoFinanceiro');
      if (!api) throw new Error('Entidade LancamentoFinanceiro não encontrada.');
      return api.delete(id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['financeiro-modulo-completo'] }); }
  });

  const conciliarMutation = useMutation({
    mutationFn: async ({ id, val }) => {
      const api = getEntityApi('LancamentoFinanceiro');
      if (!api) throw new Error('Entidade LancamentoFinanceiro não encontrada.');
      return api.update(id, { conciliado: val });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['financeiro-modulo-completo'] }); }
  });

  const filtrados = useMemo(() => {
    return lancamentos.filter((l) => {
      if (!l?.data) return false;
      let dateObj;
      try { dateObj = parseISO(l.data); } catch { return false; }
      const mesMatch = dateObj.getMonth() === filtroMes && dateObj.getFullYear() === filtroAno;
      const buscaTexto = busca.trim().toLowerCase();
      const camposBusca = [l?.descricao, l?.categoria, l?.cliente_nome, l?.processo_titulo, l?.numero_referencia, l?.contrato_referencia].filter(Boolean).join(' ').toLowerCase();
      const buscaMatch = !buscaTexto || camposBusca.includes(buscaTexto);
      const categoriaMatch = filtroCategoria === 'Todas' || l?.categoria === filtroCategoria;
      const origemMatch = filtroOrigem === 'todas' || (l?.tipo_origem || 'outro') === filtroOrigem;
      return mesMatch && buscaMatch && categoriaMatch && origemMatch;
    });
  }, [lancamentos, filtroMes, filtroAno, busca, filtroCategoria, filtroOrigem]);

  const totalEntradas = filtrados.filter((l) => l.tipo === 'Entrada' && l.status !== 'Cancelado').reduce((s, l) => s + toNumber(l.valor), 0);
  const totalSaidas = filtrados.filter((l) => l.tipo === 'Saída' && l.status !== 'Cancelado').reduce((s, l) => s + toNumber(l.valor), 0);
  const saldo = totalEntradas - totalSaidas;

  const contasPagar = lancamentos.filter((l) => l.tipo === 'Saída' && l.status === 'Pendente');
  const contasReceber = lancamentos.filter((l) => l.tipo === 'Entrada' && l.status === 'Pendente');

  const honorarios = filtrados.filter((l) => l.categoria === 'Honorários');
  const honorariosAdministrativos = honorarios.filter((l) => l.tipo_origem === 'administrativo');
  const honorariosJudiciais = honorarios.filter((l) => l.tipo_origem === 'judicial');
  const honorariosAvulsos = honorarios.filter((l) => l.tipo_origem === 'avulso');
  const totalHonorarios = honorarios.filter((l) => l.tipo === 'Entrada' && l.status !== 'Cancelado').reduce((s, l) => s + toNumber(l.valor), 0);

  const vencidosCount = [...contasPagar, ...contasReceber].filter((l) => { const d = diffDias(l.data_vencimento); return d !== null && d < 0; }).length;
  const vencendoCount = [...contasPagar, ...contasReceber].filter((l) => { const d = diffDias(l.data_vencimento); return d !== null && d >= 0 && d <= 7; }).length;

  const chartBarData = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(filtroAno, filtroMes - 5 + i, 1);
      const m = d.getMonth();
      const y = d.getFullYear();
      const items = lancamentos.filter((l) => {
        if (!l?.data) return false;
        try { const ld = parseISO(l.data); return ld.getMonth() === m && ld.getFullYear() === y && l.status !== 'Cancelado'; } catch { return false; }
      });
      return {
        mes: MESES[m],
        Entradas: items.filter((l) => l.tipo === 'Entrada').reduce((s, l) => s + toNumber(l.valor), 0),
        Saídas: items.filter((l) => l.tipo === 'Saída').reduce((s, l) => s + toNumber(l.valor), 0)
      };
    });
  }, [lancamentos, filtroMes, filtroAno]);

  const chartCategorias = useMemo(() => {
    const map = {};
    filtrados.filter((l) => l.status !== 'Cancelado').forEach((l) => {
      const cat = l.categoria || 'Sem categoria';
      if (!map[cat]) map[cat] = { name: cat, Entradas: 0, Saídas: 0 };
      if (l.tipo === 'Entrada') map[cat].Entradas += toNumber(l.valor);
      else map[cat].Saídas += toNumber(l.valor);
    });
    return Object.values(map);
  }, [filtrados]);

  const chartPrevisao = useMemo(() => {
    const mediaEntradas = chartBarData.reduce((s, d) => s + d.Entradas, 0) / 6;
    const mediaSaidas = chartBarData.reduce((s, d) => s + d.Saídas, 0) / 6;
    let saldoAcum = saldo;
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(filtroAno, filtroMes + 1 + i, 1);
      saldoAcum = saldoAcum + mediaEntradas - mediaSaidas;
      return { mes: MESES[d.getMonth()], Saldo: saldoAcum, Receita: mediaEntradas, Despesa: mediaSaidas };
    });
  }, [chartBarData, saldo, filtroAno, filtroMes]);

  const dreEntradas = useMemo(() => {
    const map = {};
    filtrados.filter((l) => l.tipo === 'Entrada' && l.status !== 'Cancelado').forEach((l) => {
      map[l.categoria || 'Sem categoria'] = (map[l.categoria || 'Sem categoria'] || 0) + toNumber(l.valor);
    });
    return map;
  }, [filtrados]);

  const dreSaidas = useMemo(() => {
    const map = {};
    filtrados.filter((l) => l.tipo === 'Saída' && l.status !== 'Cancelado').forEach((l) => {
      map[l.categoria || 'Sem categoria'] = (map[l.categoria || 'Sem categoria'] || 0) + toNumber(l.valor);
    });
    return map;
  }, [filtrados]);

  const openNew = () => { setEditingId(null); setForm(emptyForm); setDialogOpen(true); };

  const openEdit = (l) => {
    setEditingId(l.id);
    setForm({
      tipo: l.tipo || 'Entrada', categoria: l.categoria || 'Outro', descricao: l.descricao || '',
      valor: l.valor ?? '', data: l.data || format(new Date(), 'yyyy-MM-dd'),
      data_vencimento: l.data_vencimento || '', status: l.status || 'Confirmado',
      forma_pagamento: l.forma_pagamento || 'Pix', observacoes: l.observacoes || '',
      conciliado: !!l.conciliado, cliente_id: l.cliente_id || '', cliente_nome: l.cliente_nome || '',
      tipo_origem: l.tipo_origem || 'avulso', processo_id: l.processo_id || '',
      processo_titulo: l.processo_titulo || '', origem_modulo: l.origem_modulo || 'manual',
      numero_referencia: l.numero_referencia || '', eh_honorario: l.categoria === 'Honorários',
      parcelas: l.parcelas || '', parcela_atual: l.parcela_atual || '',
      contrato_referencia: l.contrato_referencia || ''
    });
    setDialogOpen(true);
  };

  const handleTipoOrigemChange = (value) => {
    setForm((prev) => ({
      ...prev, tipo_origem: value, processo_id: '', processo_titulo: '', numero_referencia: '',
      origem_modulo: value === 'administrativo' || value === 'judicial' ? value : 'manual'
    }));
  };

  const handleClienteChange = (clienteId) => {
    const cliente = clientes.find((c) => String(c.id) === String(clienteId));
    setForm((prev) => ({
      ...prev, cliente_id: clienteId, cliente_nome: cliente ? getClientLabel(cliente) : '',
      processo_id: '', processo_titulo: '', numero_referencia: ''
    }));
  };

  const handleProcessoChange = (processoId) => {
    const proc = processosDaOrigem.find((p) => String(p.id) === String(processoId));
    setForm((prev) => ({
      ...prev, processo_id: processoId, processo_titulo: proc?._label || '',
      numero_referencia: proc?.numero_processo || proc?.numero || proc?.protocolo || proc?.nb || proc?.nup || prev.numero_referencia || '',
      origem_modulo: proc?._tipo || prev.origem_modulo
    }));
  };

  const handleSave = () => {
    const payload = {
      ...form, valor: toNumber(form.valor), conciliado: !!form.conciliado,
      eh_honorario: form.categoria === 'Honorários',
      cliente_id: form.categoria === 'Honorários' ? form.cliente_id || '' : '',
      cliente_nome: form.categoria === 'Honorários' ? form.cliente_nome || '' : '',
      tipo_origem: form.categoria === 'Honorários' ? form.tipo_origem || 'avulso' : '',
      processo_id: form.categoria === 'Honorários' && (form.tipo_origem === 'administrativo' || form.tipo_origem === 'judicial') ? form.processo_id || '' : '',
      processo_titulo: form.categoria === 'Honorários' && (form.tipo_origem === 'administrativo' || form.tipo_origem === 'judicial') ? form.processo_titulo || '' : '',
      origem_modulo: form.categoria === 'Honorários' ? form.origem_modulo || 'manual' : 'manual',
      numero_referencia: form.categoria === 'Honorários' ? form.numero_referencia || '' : '',
      parcelas: form.parcelas ? Number(form.parcelas) : null,
      parcela_atual: form.parcela_atual ? Number(form.parcela_atual) : null
    };
    saveMutation.mutate(payload);
  };

  const anos = Array.from({ length: 7 }, (_, i) => new Date().getFullYear() - 3 + i);

  if (!unlocked) return <PasswordGate onUnlock={() => setUnlocked(true)} />;

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-500">
          Carregando financeiro...
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6">
        <ErrorState title="Erro ao carregar o financeiro" description="Verifique se as entidades necessárias existem na Base e tente novamente." />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Financeiro</h1>
          <p className="text-slate-500 text-sm">Controle financeiro do escritório com vínculo de honorários por cliente e processo</p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          {(vencidosCount > 0 || vencendoCount > 0) && (
            <Badge className="bg-red-100 text-red-700 border border-red-200 gap-1 flex items-center">
              <AlertTriangle className="h-3 w-3" />
              {vencidosCount} vencido(s), {vencendoCount} a vencer esta semana
            </Badge>
          )}
          <Button onClick={openNew} className="bg-[#378ADD] hover:bg-[#185FA5] text-white">
            <Plus className="mr-2 h-4 w-4" />
            Novo Lançamento
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <Select value={String(filtroMes)} onValueChange={(v) => setFiltroMes(Number(v))}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>{MESES.map((m, i) => <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={String(filtroAno)} onValueChange={(v) => setFiltroAno(Number(v))}>
          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
          <SelectContent>{anos.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Todas">Todas categorias</SelectItem>
            {CATEGORIAS.map((cat) => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filtroOrigem} onValueChange={setFiltroOrigem}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas origens</SelectItem>
            <SelectItem value="administrativo">Administrativo</SelectItem>
            <SelectItem value="judicial">Judicial</SelectItem>
            <SelectItem value="avulso">Avulso</SelectItem>
            <SelectItem value="outro">Outro</SelectItem>
          </SelectContent>
        </Select>
        <div className="relative flex-1 min-w-60">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input className="pl-9" placeholder="Buscar por descrição, cliente, processo..." value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
            <TrendingUp className="h-6 w-6 text-green-600" />
          </div>
          <div><p className="text-xs text-slate-500">Entradas</p><p className="text-xl font-bold text-green-600">{fmt(totalEntradas)}</p></div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
            <TrendingDown className="h-6 w-6 text-red-600" />
          </div>
          <div><p className="text-xs text-slate-500">Saídas</p><p className="text-xl font-bold text-red-600">{fmt(totalSaidas)}</p></div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4">
          <div className={`h-12 w-12 rounded-full flex items-center justify-center ${saldo >= 0 ? 'bg-blue-100' : 'bg-orange-100'}`}>
            <DollarSign className={`h-6 w-6 ${saldo >= 0 ? 'text-blue-600' : 'text-orange-600'}`} />
          </div>
          <div><p className="text-xs text-slate-500">Saldo do Mês</p><p className={`text-xl font-bold ${saldo >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>{fmt(saldo)}</p></div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-violet-100 flex items-center justify-center">
            <Wallet className="h-6 w-6 text-violet-600" />
          </div>
          <div><p className="text-xs text-slate-500">Honorários</p><p className="text-xl font-bold text-violet-600">{fmt(totalHonorarios)}</p></div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center">
            <Landmark className="h-6 w-6 text-amber-600" />
          </div>
          <div><p className="text-xs text-slate-500">Recebimentos Pendentes</p><p className="text-xl font-bold text-amber-600">{contasReceber.length}</p></div>
        </div>
      </div>

      <Tabs defaultValue="lancamentos">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="lancamentos">Lançamentos</TabsTrigger>
          <TabsTrigger value="honorarios">Honorários</TabsTrigger>
          <TabsTrigger value="graficos">Gráficos</TabsTrigger>
          <TabsTrigger value="pagar">
            Contas a Pagar
            {contasPagar.length > 0 && <span className="ml-1 bg-red-500 text-white rounded-full text-xs px-1.5 py-0.5">{contasPagar.length}</span>}
          </TabsTrigger>
          <TabsTrigger value="receber">
            Contas a Receber
            {contasReceber.length > 0 && <span className="ml-1 bg-green-500 text-white rounded-full text-xs px-1.5 py-0.5">{contasReceber.length}</span>}
          </TabsTrigger>
          <TabsTrigger value="dre">DRE</TabsTrigger>
          <TabsTrigger value="previsao">Previsão</TabsTrigger>
        </TabsList>

        <TabsContent value="lancamentos">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[1200px]">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Data</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Descrição</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Cliente</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Origem</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Referência</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Categoria</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Tipo</th>
                    <th className="text-right px-4 py-3 font-medium text-slate-600">Valor</th>
                    <th className="text-center px-4 py-3 font-medium text-slate-600">Status</th>
                    <th className="text-center px-4 py-3 font-medium text-slate-600">Conciliado</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.length === 0 && (
                    <tr><td colSpan={11} className="text-center py-12 text-slate-400">Nenhum lançamento encontrado</td></tr>
                  )}
                  {filtrados.map((l) => (
                    <tr key={l.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-600">{safeDateFormat(l.data)}</td>
                      <td className="px-4 py-3 text-slate-800">{l.descricao || '-'}</td>
                      <td className="px-4 py-3 text-slate-600">{l.cliente_nome || '-'}</td>
                      <td className="px-4 py-3">{l.categoria === 'Honorários' ? <OrigemBadge origem={l.tipo_origem} /> : '-'}</td>
                      <td className="px-4 py-3 text-slate-500 max-w-[280px] truncate">{l.processo_titulo || l.numero_referencia || l.contrato_referencia || '-'}</td>
                      <td className="px-4 py-3 text-slate-500">{l.categoria || '-'}</td>
                      <td className="px-4 py-3">
                        <Badge className={l.tipo === 'Entrada' ? 'bg-green-100 text-green-700 border-0' : 'bg-red-100 text-red-700 border-0'}>{l.tipo}</Badge>
                      </td>
                      <td className={`px-4 py-3 text-right font-medium ${l.tipo === 'Entrada' ? 'text-green-600' : 'text-red-600'}`}>{fmt(l.valor || 0)}</td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant="outline" className={l.status === 'Confirmado' ? 'border-green-500 text-green-600' : l.status === 'Pendente' ? 'border-yellow-500 text-yellow-600' : 'border-slate-400 text-slate-500'}>
                          {l.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => conciliarMutation.mutate({ id: l.id, val: !l.conciliado })}
                          className={`h-5 w-5 rounded border-2 mx-auto flex items-center justify-center ${l.conciliado ? 'bg-[#378ADD] border-[#378ADD]' : 'border-slate-300'}`}
                        >
                          {l.conciliado && <CheckCircle className="h-3 w-3 text-white" />}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 justify-end">
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(l)}><Pencil className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500" onClick={() => deleteMutation.mutate(l.id)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="honorarios" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs text-slate-500">Honorários Administrativos</p>
              <p className="text-2xl font-bold text-blue-600">{fmt(honorariosAdministrativos.filter((l) => l.tipo === 'Entrada' && l.status !== 'Cancelado').reduce((s, l) => s + toNumber(l.valor), 0))}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs text-slate-500">Honorários Judiciais</p>
              <p className="text-2xl font-bold text-violet-600">{fmt(honorariosJudiciais.filter((l) => l.tipo === 'Entrada' && l.status !== 'Cancelado').reduce((s, l) => s + toNumber(l.valor), 0))}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs text-slate-500">Honorários Avulsos</p>
              <p className="text-2xl font-bold text-slate-700">{fmt(honorariosAvulsos.filter((l) => l.tipo === 'Entrada' && l.status !== 'Cancelado').reduce((s, l) => s + toNumber(l.valor), 0))}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[1000px]">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Cliente</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Origem</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Processo / Referência</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Descrição</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Parcela</th>
                    <th className="text-center px-4 py-3 font-medium text-slate-600">Status</th>
                    <th className="text-right px-4 py-3 font-medium text-slate-600">Valor</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {honorarios.length === 0 && (
                    <tr><td colSpan={8} className="text-center py-12 text-slate-400">Nenhum honorário encontrado no período</td></tr>
                  )}
                  {honorarios.map((h) => (
                    <tr key={h.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-700">{h.cliente_nome || '-'}</td>
                      <td className="px-4 py-3"><OrigemBadge origem={h.tipo_origem} /></td>
                      <td className="px-4 py-3 text-slate-500 max-w-[320px] truncate">{h.processo_titulo || h.numero_referencia || h.contrato_referencia || '-'}</td>
                      <td className="px-4 py-3 text-slate-800">{h.descricao || '-'}</td>
                      <td className="px-4 py-3 text-slate-500">{h.parcela_atual && h.parcelas ? `${h.parcela_atual}/${h.parcelas}` : '-'}</td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant="outline" className={h.status === 'Confirmado' ? 'border-green-500 text-green-600' : h.status === 'Pendente' ? 'border-yellow-500 text-yellow-600' : 'border-slate-400 text-slate-500'}>
                          {h.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-green-600">{fmt(h.valor)}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 justify-end">
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(h)}><Pencil className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500" onClick={() => deleteMutation.mutate(h.id)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="graficos" className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Evolução Receita x Despesa (últimos 6 meses)</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartBarData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" />
                <YAxis tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => fmt(v)} />
                <Legend />
                <Bar dataKey="Entradas" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Saídas" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Distribuição por Categoria — {MESES[filtroMes]}/{filtroAno}</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartCategorias} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => fmt(v)} />
                <Legend />
                <Bar dataKey="Entradas" fill="#22c55e" radius={[0, 4, 4, 0]} />
                <Bar dataKey="Saídas" fill="#ef4444" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </TabsContent>

        <TabsContent value="pagar" className="space-y-3">
          {contasPagar.filter((l) => { const d = diffDias(l.data_vencimento); return d !== null && d < 0; }).length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-700 font-medium">
                {contasPagar.filter((l) => { const d = diffDias(l.data_vencimento); return d !== null && d < 0; }).length} conta(s) a pagar vencida(s).
              </p>
            </div>
          )}
          <ContasList items={contasPagar} tipo="pagar" onEdit={openEdit} onDelete={(id) => deleteMutation.mutate(id)} />
        </TabsContent>

        <TabsContent value="receber" className="space-y-3">
          {contasReceber.filter((l) => { const d = diffDias(l.data_vencimento); return d !== null && d < 0; }).length > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-600 flex-shrink-0" />
              <p className="text-sm text-orange-700 font-medium">
                {contasReceber.filter((l) => { const d = diffDias(l.data_vencimento); return d !== null && d < 0; }).length} recebimento(s) em atraso.
              </p>
            </div>
          )}
          <ContasList items={contasReceber} tipo="receber" onEdit={openEdit} onDelete={(id) => deleteMutation.mutate(id)} />
        </TabsContent>

        <TabsContent value="dre">
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-5 w-5 text-[#378ADD]" />
              <h3 className="text-lg font-bold text-slate-800">DRE — {MESES[filtroMes]}/{filtroAno}</h3>
            </div>
            <div>
              <p className="text-sm font-semibold text-green-700 border-b border-green-200 pb-1 mb-2">RECEITAS</p>
              {Object.entries(dreEntradas).map(([cat, val]) => (
                <div key={cat} className="flex justify-between py-1.5 text-sm border-b border-slate-100">
                  <span className="text-slate-600">{cat}</span>
                  <span className="font-medium text-green-600">{fmt(val)}</span>
                </div>
              ))}
              <div className="flex justify-between py-2 text-sm font-bold text-green-700 border-t-2 border-green-300 mt-1">
                <span>Total Receitas</span><span>{fmt(totalEntradas)}</span>
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-red-700 border-b border-red-200 pb-1 mb-2">DESPESAS</p>
              {Object.entries(dreSaidas).map(([cat, val]) => (
                <div key={cat} className="flex justify-between py-1.5 text-sm border-b border-slate-100">
                  <span className="text-slate-600">{cat}</span>
                  <span className="font-medium text-red-600">{fmt(val)}</span>
                </div>
              ))}
              <div className="flex justify-between py-2 text-sm font-bold text-red-700 border-t-2 border-red-300 mt-1">
                <span>Total Despesas</span><span>{fmt(totalSaidas)}</span>
              </div>
            </div>
            <div className={`flex justify-between py-3 px-4 rounded-xl text-base font-bold ${saldo >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              <span>RESULTADO LÍQUIDO</span><span>{fmt(saldo)}</span>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="previsao">
          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-[#378ADD]" />
              <h3 className="text-sm font-semibold text-slate-700">Previsão de Fluxo de Caixa — Próximos 6 meses</h3>
            </div>
            <p className="text-xs text-slate-400">Baseado na média mensal histórica dos últimos 6 meses.</p>
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={chartPrevisao}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" />
                <YAxis tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => fmt(v)} />
                <Legend />
                <Area type="monotone" dataKey="Saldo" fill="#bfdbfe" stroke="#3b82f6" strokeWidth={2} />
                <Line type="monotone" dataKey="Receita" stroke="#22c55e" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                <Line type="monotone" dataKey="Despesa" stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-3 gap-3 mt-2">
              {chartPrevisao.map((d) => (
                <div key={d.mes} className="rounded-lg border border-slate-200 p-3 text-center">
                  <p className="text-xs text-slate-500">{d.mes}</p>
                  <p className={`text-sm font-bold ${d.Saldo >= 0 ? 'text-blue-600' : 'text-red-600'}`}>{fmt(d.Saldo)}</p>
                  <p className="text-xs text-slate-400">saldo prev.</p>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar' : 'Novo'} Lançamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={(v) => setForm((f) => ({ ...f, tipo: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TIPOS.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Data</Label>
                <Input type="date" value={form.data} onChange={(e) => setForm((f) => ({ ...f, data: e.target.value }))} />
              </div>
              <div>
                <Label>Vencimento</Label>
                <Input type="date" value={form.data_vencimento} onChange={(e) => setForm((f) => ({ ...f, data_vencimento: e.target.value }))} />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUS.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Descrição</Label>
              <Input value={form.descricao} onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))} placeholder="Ex.: Honorários iniciais, custas, aluguel..." />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <Label>Categoria</Label>
                <Select value={form.categoria} onValueChange={(v) => setForm((f) => ({ ...f, categoria: v, tipo: v === 'Honorários' ? 'Entrada' : f.tipo }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIAS.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Valor (R$)</Label>
                <Input type="number" step="0.01" value={form.valor} onChange={(e) => setForm((f) => ({ ...f, valor: e.target.value }))} />
              </div>
              <div>
                <Label>Forma de Pagamento</Label>
                <Select value={form.forma_pagamento} onValueChange={(v) => setForm((f) => ({ ...f, forma_pagamento: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{FORMAS.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Conciliado</Label>
                <Select value={form.conciliado ? 'sim' : 'nao'} onValueChange={(v) => setForm((f) => ({ ...f, conciliado: v === 'sim' }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sim">Sim</SelectItem>
                    <SelectItem value="nao">Não</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {form.categoria === 'Honorários' && (
              <div className="rounded-2xl border border-[#BFDDF7] bg-[#EAF4FF]/40 p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <Link2 className="h-4 w-4 text-[#185FA5]" />
                  <h3 className="text-sm font-semibold text-[#185FA5]">Vínculo jurídico do honorário</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label>Cliente</Label>
                    <Select value={form.cliente_id || ''} onValueChange={handleClienteChange}>
                      <SelectTrigger><SelectValue placeholder="Selecionar cliente" /></SelectTrigger>
                      <SelectContent>
                        {clientesOrdenados.length === 0
                          ? <SelectItem value="__sem_clientes__" disabled>Nenhum cliente encontrado</SelectItem>
                          : clientesOrdenados.map((cliente) => <SelectItem key={cliente.id} value={String(cliente.id)}>{getClientLabel(cliente)}</SelectItem>)
                        }
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Origem do Honorário</Label>
                    <Select value={form.tipo_origem} onValueChange={handleTipoOrigemChange}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="administrativo">Processo Administrativo</SelectItem>
                        <SelectItem value="judicial">Processo Judicial</SelectItem>
                        <SelectItem value="avulso">Contrato Avulso</SelectItem>
                        <SelectItem value="outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Origem do Módulo</Label>
                    <Input value={form.origem_modulo || ''} disabled />
                  </div>
                </div>

                {(form.tipo_origem === 'administrativo' || form.tipo_origem === 'judicial') && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label>Processo vinculado</Label>
                      <Select value={form.processo_id || ''} onValueChange={handleProcessoChange} disabled={!form.cliente_id}>
                        <SelectTrigger><SelectValue placeholder={!form.cliente_id ? 'Selecione primeiro o cliente' : 'Selecionar processo'} /></SelectTrigger>
                        <SelectContent>
                          {processosDaOrigem.length === 0
                            ? <SelectItem value="__sem_processos__" disabled>Nenhum processo encontrado</SelectItem>
                            : processosDaOrigem.map((proc) => <SelectItem key={proc.id} value={String(proc.id)}>{proc._label}</SelectItem>)
                          }
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Número / Referência</Label>
                      <Input value={form.numero_referencia} onChange={(e) => setForm((f) => ({ ...f, numero_referencia: e.target.value }))} placeholder="Número do processo, protocolo, NB..." />
                    </div>
                  </div>
                )}

                {(form.tipo_origem === 'avulso' || form.tipo_origem === 'outro') && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label>Contrato / Referência</Label>
                      <Input value={form.contrato_referencia} onChange={(e) => setForm((f) => ({ ...f, contrato_referencia: e.target.value }))} placeholder="Ex.: contrato de honorários, consultoria, acordo..." />
                    </div>
                    <div>
                      <Label>Número / Referência</Label>
                      <Input value={form.numero_referencia} onChange={(e) => setForm((f) => ({ ...f, numero_referencia: e.target.value }))} placeholder="Referência livre" />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label>Parcelas</Label>
                    <Input type="number" min="1" value={form.parcelas} onChange={(e) => setForm((f) => ({ ...f, parcelas: e.target.value }))} placeholder="Ex.: 6" />
                  </div>
                  <div>
                    <Label>Parcela Atual</Label>
                    <Input type="number" min="1" value={form.parcela_atual} onChange={(e) => setForm((f) => ({ ...f, parcela_atual: e.target.value }))} placeholder="Ex.: 1" />
                  </div>
                  <div>
                    <Label>Cliente vinculado</Label>
                    <Input value={form.cliente_nome || ''} disabled />
                  </div>
                </div>

                {form.processo_titulo && (
                  <div className="rounded-xl border border-[#BFDDF7] bg-white px-3 py-2">
                    <p className="text-xs text-slate-500">Processo selecionado</p>
                    <p className="text-sm font-medium text-slate-800">{form.processo_titulo}</p>
                  </div>
                )}
              </div>
            )}

            <div>
              <Label>Observações</Label>
              <Textarea rows={3} value={form.observacoes} onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} className="bg-[#378ADD] hover:bg-[#185FA5] text-white" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}