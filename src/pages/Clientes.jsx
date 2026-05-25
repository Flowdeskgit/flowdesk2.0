import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { flowdesk } from '@/api/flowdeskClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  Users, Plus, Search, Eye, Pencil, Trash2, Scale, Building2, FileText, Loader2, AlertCircle, CheckCircle2,
} from 'lucide-react';

const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

const EMPTY_FORM = {
  nome_completo: '', cpf: '', rg: '', data_nascimento: '', telefone: '',
  email: '', endereco: '', cidade: '', estado: '', cep: '', profissao: '',
  renda_mensal: '', id_externo: '', observacoes: '',
};

const EMPTY_FICHA = {
  qualificacao_nome_completo: '', qualificacao_nacionalidade: '', qualificacao_estado_civil: '',
  qualificacao_rg: '', qualificacao_cpf: '', qualificacao_endereco: '', qualificacao_numero: '',
  qualificacao_bairro: '', qualificacao_cidade: '', qualificacao_estado: '',
  qualificacao_telefone: '', qualificacao_email: '', senha_meu_inss: '', aniversario: '',
  atendente: '', como_ficou_sabendo: [],
  ja_fez_pedido: '', resultado_pedido: '', data_pedido_decisao: '', tem_copia_pa: '',
  motivo_indeferimento: '', possui_cnis: '',
  categoria_principal: '', objetivo_tipos: [], outro_objetivo: '', cumulado_com: [],
  outro_cumulado_com: '', tipo_acao_principal: '', tipos_acao_principal: [],
  outro_tipo_acao_principal: '', acao_cumulado: [], outro_acao_cumulado: '',
  acao_trabalhista_tipos: [], outro_acao_trabalhista: '',
  acao_civel_tipos: [], outro_acao_civel: '',
  numero_ctps: '', serie_ctps: '', perdeu_ctps: '', periodo_trabalhista: '',
  contribuiu_como: [], numero_carnes: '', perdeu_carne: '', cnpj_empresa: '',
  tem_periodo_comprovado: '', descricao_periodo_comprovado: '', tem_periodo_averbar: '',
  tipo_periodo_averbar: [], descricao_periodo_averbar: '',
  trabalhou_servico_publico: '', tem_ctc: '', vai_providenciar_ctc: '',
  descricao_servico_publico: '', prestou_servico_militar: '', tem_comprovante_militar: '',
  trabalhou_atividade_especial: '', tem_formularios_atividade: '', quais_formularios: '',
  quais_providenciar: '', tem_problema_saude: '', quando_iniciou_saude: '',
  tem_documentos_medicos: '', quais_documentos_medicos: '', documentos_medicos_providenciar: '',
  documentos_digitalizados: '', documentacao_completa: '', retorno: '', data_retorno: '',
  diagnostico: '', tipo_acao_livre: '', fatos: '',
};

// ── Validação de CPF ───────────────────────────────────────────────────────────
function validarCPF(cpf) {
  const nums = cpf.replace(/\D/g, '');
  if (nums.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(nums)) return false; // todos iguais
  let soma = 0;
  for (let i = 0; i < 9; i++) soma += parseInt(nums[i]) * (10 - i);
  let resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(nums[9])) return false;
  soma = 0;
  for (let i = 0; i < 10; i++) soma += parseInt(nums[i]) * (11 - i);
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  return resto === parseInt(nums[10]);
}

function formatarCPF(valor) {
  const nums = valor.replace(/\D/g, '').slice(0, 11);
  return nums
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

// ── JSZip helpers ──────────────────────────────────────────────────────────────
function loadJSZip() {
  if (window.JSZip) return Promise.resolve(window.JSZip);
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';
    s.async = true;
    s.onload = () => resolve(window.JSZip);
    s.onerror = () => reject(new Error('Failed to load JSZip'));
    document.head.appendChild(s);
  });
}

function fillSdtXml(xmlText, fields) {
  const originalHeader = (xmlText.match(/^<\?xml[^>]*\?>\s*/) || [''])[0];
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'application/xml');
  if (doc.getElementsByTagName('parsererror')?.length) return xmlText;
  const sdts = Array.from(doc.getElementsByTagName('w:sdt'));
  for (const sdt of sdts) {
    const pr = sdt.getElementsByTagName('w:sdtPr')[0];
    if (!pr) continue;
    const tagNode = pr.getElementsByTagName('w:tag')[0];
    const aliasNode = pr.getElementsByTagName('w:alias')[0];
    const tagVal = tagNode?.getAttribute('w:val') || aliasNode?.getAttribute('w:val') || '';
    if (!tagVal) continue;
    const normalizedKey = tagVal === 'CIdade' ? 'Cidade' : tagVal;
    if (!(normalizedKey in fields)) continue;
    const value = String(fields[normalizedKey] ?? '');
    const content = sdt.getElementsByTagName('w:sdtContent')[0];
    if (!content) continue;
    const textNodes = Array.from(content.getElementsByTagName('w:t'));
    if (!textNodes.length) continue;
    textNodes[0].textContent = value;
    for (let i = 1; i < textNodes.length; i++) textNodes[i].textContent = '';
  }
  const serializer = new XMLSerializer();
  let out = serializer.serializeToString(doc);
  out = out.replace(/^<\?xml[^>]*\?>\s*/, '');
  return originalHeader ? originalHeader + out : out;
}

function normalizeDateToBR(input) {
  const s = String(input || '').trim();
  if (!s) return '';
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return s;
  const m1 = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m1) return `${m1[3]}/${m1[2]}/${m1[1]}`;
  return s;
}

function lerHiddenFicha(observacoes) {
  if (!observacoes) return null;
  const marker = '<!--HIDDEN_FICHA:';
  const endMarker = '-->';
  const startIdx = observacoes.indexOf(marker);
  if (startIdx === -1) return null;
  const jsonPart = observacoes.substring(startIdx + marker.length, observacoes.lastIndexOf(endMarker));
  try { return JSON.parse(jsonPart); } catch { return null; }
}

function salvarHiddenFicha(observacoes, dados) {
  const jsonStr = JSON.stringify(dados);
  const marker = '<!--HIDDEN_FICHA:';
  const endMarker = '-->';
  const startIdx = (observacoes || '').indexOf(marker);
  if (startIdx !== -1) {
    const textPart = observacoes.substring(0, startIdx);
    return `${textPart}${marker}${jsonStr}${endMarker}`;
  }
  const obs = observacoes || '';
  return obs ? `${obs}\n\n${marker}${jsonStr}${endMarker}` : `${marker}${jsonStr}${endMarker}`;
}

function CheckItem({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50 text-sm">
      <input type="checkbox" checked={!!checked} onChange={e => onChange(e.target.checked)} className="rounded" />
      {label}
    </label>
  );
}

function RadioItem({ label, value, current, onChange }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer text-sm">
      <input type="radio" value={value} checked={current === value} onChange={() => onChange(value)} />
      {label}
    </label>
  );
}

function SectionTitle({ number, title }) {
  return (
    <div className="rounded-lg bg-slate-100 px-3 py-2 mb-3">
      <h3 className="text-sm font-semibold text-slate-700">{number}. {title}</h3>
    </div>
  );
}

export default function Clientes() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');

  const [atendimentoDialog, setAtendimentoDialog] = useState(false);
  const [fichaForm, setFichaForm] = useState(EMPTY_FICHA);
  const [savingFicha, setSavingFicha] = useState(false);
  const [loadingFicha, setLoadingFicha] = useState(false);
  const [fichaError, setFichaError] = useState('');

  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // CPF state
  const cpfValido = formData.cpf ? validarCPF(formData.cpf) : null; // null = não digitado ainda

  const { data: clientes = [], isLoading } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => flowdesk.entities.Cliente.list('nome_completo'),
  });

  const { data: processos = [] } = useQuery({
    queryKey: ['processos-all'],
    queryFn: () => flowdesk.entities.Processo.list('-created_date', 1000),
  });

  const { data: adms = [] } = useQuery({
    queryKey: ['adm-inss-all'],
    queryFn: () => flowdesk.entities.AdministrativoINSS.list('-created_date', 1000),
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['template-minuta'],
    queryFn: () => flowdesk.entities.TemplateMinuta.list(),
  });

  const templatesAtivos = useMemo(() =>
    (templates || []).filter(t => t?.ativo !== false).sort((a, b) => Number(a?.ordem || 0) - Number(b?.ordem || 0)),
    [templates]
  );

  const createMutation = useMutation({
    mutationFn: (data) => flowdesk.entities.Cliente.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      setSaveSuccess('Cliente cadastrado com sucesso!');
      setTimeout(() => { setSaveSuccess(''); closeDialog(); }, 1500);
    },
    onError: (err) => {
      setSaveError(`Erro ao cadastrar: ${err?.message || 'Tente novamente.'}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => flowdesk.entities.Cliente.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      setSaveSuccess('Cliente atualizado com sucesso!');
      setTimeout(() => { setSaveSuccess(''); closeDialog(); }, 1500);
    },
    onError: (err) => {
      setSaveError(`Erro ao salvar: ${err?.message || 'Tente novamente.'}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => flowdesk.entities.Cliente.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['clientes'] }); },
    onError: (err) => { alert(`Erro ao excluir: ${err?.message}`); },
  });

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingCliente(null);
    setFormData(EMPTY_FORM);
    setFormErrors({});
    setSaveError('');
    setSaveSuccess('');
    setSelectedTemplateId('');
  };

  const openCreate = () => {
    setEditingCliente(null);
    setFormData(EMPTY_FORM);
    setFichaForm(EMPTY_FICHA);
    setFormErrors({});
    setSaveError('');
    setSaveSuccess('');
    setSelectedTemplateId('');
    setIsDialogOpen(true);
  };

  const openEdit = (cliente) => {
    setEditingCliente(cliente);
    setFormData({
      nome_completo: cliente.nome_completo || '',
      cpf: cliente.cpf || '',
      rg: cliente.rg || '',
      data_nascimento: cliente.data_nascimento || '',
      telefone: cliente.telefone || '',
      email: cliente.email || '',
      endereco: cliente.endereco || '',
      cidade: cliente.cidade || '',
      estado: cliente.estado || '',
      cep: cliente.cep || '',
      profissao: cliente.profissao || '',
      renda_mensal: cliente.renda_mensal || '',
      id_externo: cliente.id_externo || '',
      observacoes: cliente.observacoes || '',
    });
    setFormErrors({});
    setSaveError('');
    setSaveSuccess('');
    setSelectedTemplateId('');
    setIsDialogOpen(true);
  };

  const openAtendimentoDialog = async () => {
    if (!editingCliente) return;
    setLoadingFicha(true);
    setFichaError('');
    try {
      const freshData = await flowdesk.entities.Cliente.filter({ id: editingCliente.id });
      const cliente = freshData?.[0] || editingCliente;
      let loadedFicha = { ...EMPTY_FICHA };

      if (cliente.atendimento_questionario_json) {
        try {
          const parsed = typeof cliente.atendimento_questionario_json === 'string'
            ? JSON.parse(cliente.atendimento_questionario_json)
            : cliente.atendimento_questionario_json;
          loadedFicha = { ...EMPTY_FICHA, ...parsed };
        } catch {}
      }

      const hiddenFicha = lerHiddenFicha(cliente.observacoes || '');
      if (hiddenFicha) {
        Object.keys(hiddenFicha).forEach(k => {
          if (k in EMPTY_FICHA && !loadedFicha[k]) loadedFicha[k] = hiddenFicha[k];
        });
        if (hiddenFicha.diagnostico && !loadedFicha.diagnostico) loadedFicha.diagnostico = hiddenFicha.diagnostico;
        if (hiddenFicha.fatos && !loadedFicha.fatos) loadedFicha.fatos = hiddenFicha.fatos;
      }

      if (!loadedFicha.qualificacao_nome_completo) loadedFicha.qualificacao_nome_completo = cliente.nome_completo || '';
      if (!loadedFicha.qualificacao_cpf) loadedFicha.qualificacao_cpf = cliente.cpf || '';
      if (!loadedFicha.qualificacao_rg) loadedFicha.qualificacao_rg = cliente.rg || '';
      if (!loadedFicha.qualificacao_telefone) loadedFicha.qualificacao_telefone = cliente.telefone || '';
      if (!loadedFicha.qualificacao_email) loadedFicha.qualificacao_email = cliente.email || '';
      if (!loadedFicha.qualificacao_endereco) loadedFicha.qualificacao_endereco = cliente.endereco || '';
      if (!loadedFicha.qualificacao_cidade) loadedFicha.qualificacao_cidade = cliente.cidade || '';
      if (!loadedFicha.qualificacao_estado) loadedFicha.qualificacao_estado = cliente.estado || '';

      setFichaForm(loadedFicha);
      setAtendimentoDialog(true);
    } catch (err) {
      console.error('Erro ao carregar ficha:', err);
      setFichaError(`Erro ao carregar ficha: ${err?.message || 'Tente novamente.'}`);
      setFichaForm({ ...EMPTY_FICHA });
      setAtendimentoDialog(true);
    } finally {
      setLoadingFicha(false);
    }
  };

  const handleSaveFicha = async () => {
    if (!editingCliente) return;
    setSavingFicha(true);
    setFichaError('');
    try {
      const jsonStr = JSON.stringify(fichaForm);
      const freshData = await flowdesk.entities.Cliente.filter({ id: editingCliente.id });
      const clienteAtual = freshData?.[0] || editingCliente;
      const obsAtual = clienteAtual.observacoes || '';
      const novasObs = salvarHiddenFicha(obsAtual, fichaForm);

      await flowdesk.entities.Cliente.update(editingCliente.id, {
        atendimento_questionario_json: jsonStr,
        observacoes: novasObs,
      });

      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      queryClient.invalidateQueries({ queryKey: ['cliente', editingCliente.id] });
      setAtendimentoDialog(false);
      setSaveSuccess('✅ Ficha salva com sucesso!');
      setTimeout(() => setSaveSuccess(''), 3000);
    } catch (err) {
      setFichaError(`Erro ao salvar ficha: ${err?.message || 'Verifique sua conexão e tente novamente.'}`);
    } finally {
      setSavingFicha(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setSaveError('');
    setSaveSuccess('');

    const errors = {};

    if (!formData.nome_completo?.trim()) {
      errors.nome_completo = 'Nome é obrigatório';
    }

    if (!formData.cpf?.trim()) {
      errors.cpf = 'CPF é obrigatório';
    } else if (!validarCPF(formData.cpf)) {
      errors.cpf = 'CPF inválido — verifique os dígitos';
    }

    if (!formData.telefone?.trim()) {
      errors.telefone = 'Telefone é obrigatório';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    const payload = {
      nome_completo: formData.nome_completo || '',
      cpf: formData.cpf || '',
      rg: formData.rg || '',
      data_nascimento: formData.data_nascimento || '',
      telefone: formData.telefone || '',
      email: formData.email || '',
      endereco: formData.endereco || '',
      cidade: formData.cidade || '',
      estado: formData.estado || '',
      cep: formData.cep || '',
      profissao: formData.profissao || '',
      renda_mensal: formData.renda_mensal || '',
      id_externo: formData.id_externo || '',
      observacoes: formData.observacoes || '',
    };

    console.log('PAYLOAD CLIENTE ENVIADO:', payload);

    try {
      if (editingCliente) {
        await flowdesk.entities.Cliente.update(editingCliente.id, payload);
      } else {
        await flowdesk.entities.Cliente.create(payload);
      }

      await queryClient.invalidateQueries({ queryKey: ['clientes'] });

      if (editingCliente?.id) {
        await queryClient.invalidateQueries({ queryKey: ['cliente', editingCliente.id] });
      }

      setSaveSuccess(editingCliente ? 'Cliente atualizado com sucesso!' : 'Cliente cadastrado com sucesso!');

      setTimeout(() => {
        closeDialog();
      }, 1000);
    } catch (err) {
      console.error('ERRO AO SALVAR CLIENTE:', err);
      setSaveError(err?.message || 'Erro ao salvar cliente. Verifique e tente novamente.');
    }
  };

  const handleGerarAcao = async () => {
    const tpl = templatesAtivos.find(t => t.id === selectedTemplateId);
    if (!tpl?.arquivo) { alert('Selecione uma minuta primeiro.'); return; }
    setIsGenerating(true);
    try {
      const fields = {
        Nome: fichaForm.qualificacao_nome_completo || formData.nome_completo || '',
        Nacionalidade: fichaForm.qualificacao_nacionalidade || '',
        'Estado civil': fichaForm.qualificacao_estado_civil || '',
        RG: fichaForm.qualificacao_rg || formData.rg || '',
        CPF: fichaForm.qualificacao_cpf || formData.cpf || '',
        Endereco: fichaForm.qualificacao_endereco || formData.endereco || '',
        Numero: fichaForm.qualificacao_numero || '',
        Bairro: fichaForm.qualificacao_bairro || '',
        Cidade: fichaForm.qualificacao_cidade || formData.cidade || '',
        Cidadedois: fichaForm.qualificacao_cidade || formData.cidade || '',
        Estado: fichaForm.qualificacao_estado || formData.estado || '',
        'Na Cidade': 'na cidade de ',
        Data: normalizeDateToBR(new Date().toISOString()),
        Fatos: fichaForm.fatos || '',
        Virgula: ', ',
        Tipo: tpl.categoria || '',
      };
      const JSZip = await loadJSZip();
      const resp = await fetch(tpl.arquivo);
      if (!resp.ok) throw new Error(`Falha ao buscar template (${resp.status})`);
      const ab = await resp.arrayBuffer();
      const zip = await JSZip.loadAsync(ab);
      const xmlFiles = Object.keys(zip.files).filter(
        p => p === 'word/document.xml' || /^word\/header\d+\.xml$/.test(p) || /^word\/footer\d+\.xml$/.test(p)
      );
      for (const path of xmlFiles) {
        const f = zip.file(path);
        if (!f) continue;
        zip.file(path, fillSdtXml(await f.async('string'), fields));
      }
      const outBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(outBlob);
      const a = document.createElement('a');
      a.href = url;
      const nome = String(formData.nome_completo || 'Cliente').replace(/[<>:"/\\|?*\x00-\x1F]/g, '').trim();
      const tplNome = String(tpl.nome || 'Documento').replace(/[<>:"/\\|?*\x00-\x1F]/g, '').trim();
      a.download = `${tplNome} - ${nome}.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (err) {
      alert('Erro ao gerar .docx: ' + (err?.message || 'Erro desconhecido'));
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleArray = (arr, val) =>
    (arr || []).includes(val) ? (arr || []).filter(v => v !== val) : [...(arr || []), val];

  const getProcessosCount = (id) => processos.filter(p => p.cliente_id === id).length;
  const getAdmsCount = (id) => adms.filter(a => a.cliente_id === id).length;

  const filtered = clientes.filter(c => {
    const term = searchTerm.toLowerCase();
    return (
      c.nome_completo?.toLowerCase().includes(term) ||
      c.cpf?.toLowerCase().includes(term) ||
      c.telefone?.toLowerCase().includes(term) ||
      c.cidade?.toLowerCase().includes(term)
    );
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="mx-auto max-w-7xl space-y-4">
          <Skeleton className="h-10 w-48" />
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="h-6 w-6 text-[#378ADD]" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">Clientes</h1>
              <p className="text-sm text-muted-foreground">{filtered.length} cliente(s) cadastrado(s)</p>
            </div>
          </div>
          <Button onClick={openCreate} className="bg-[#378ADD] hover:bg-[#185FA5] text-white">
            <Plus className="mr-2 h-4 w-4" />Novo Cliente
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, CPF, telefone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Tabela */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Nome</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">CPF</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Telefone</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Cidade/UF</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden xl:table-cell">Processos</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden xl:table-cell">Criado por</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((cliente) => {
                const judicialCount = getProcessosCount(cliente.id);
                const admCount = getAdmsCount(cliente.id);
                const cidadeUF = [cliente.cidade, cliente.estado].filter(Boolean).join(' / ');
                return (
                  <tr key={cliente.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3"><span className="font-medium text-foreground">{cliente.nome_completo}</span></td>
                    <td className="px-4 py-3 hidden md:table-cell text-muted-foreground font-mono text-xs">{cliente.cpf}</td>
                    <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground text-xs">{cliente.telefone || '-'}</td>
                    <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground text-xs">{cidadeUF || '-'}</td>
                    <td className="px-4 py-3 hidden xl:table-cell">
                      <div className="flex flex-col gap-1">
                        <span className="flex items-center gap-1 text-xs text-muted-foreground"><Scale className="h-3 w-3 text-[#378ADD]" />{judicialCount} judicial</span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground"><Building2 className="h-3 w-3 text-[#378ADD]" />{admCount} adm.</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden xl:table-cell text-xs text-muted-foreground">{cliente.criado_por || '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-[#378ADD]" onClick={() => navigate(createPageUrl('ClienteDetalhe') + `?id=${cliente.id}`)} title="Ver detalhes"><Eye className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-[#378ADD]" onClick={() => openEdit(cliente)} title="Editar"><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-500" onClick={() => { if (confirm('Excluir este cliente?')) deleteMutation.mutate(cliente.id); }} title="Excluir"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Users className="h-12 w-12 mb-4 opacity-30" />
              <p className="text-lg">Nenhum cliente encontrado</p>
              {searchTerm && <p className="text-sm mt-1">Tente buscar por outro termo</p>}
            </div>
          )}
        </div>
      </div>

      {/* ── Dialog Novo/Editar Cliente ── */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCliente ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle>
          </DialogHeader>

          {/* Mensagens de erro/sucesso */}
          {saveError && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {saveError}
            </div>
          )}
          {saveSuccess && (
            <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700">
              <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
              {saveSuccess}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2 space-y-1">
                <Label>Nome Completo *</Label>
                <Input
                  value={formData.nome_completo}
                  onChange={(e) => { setFormData(prev => ({ ...prev, nome_completo: e.target.value })); setFormErrors({...formErrors, nome_completo: ''}); }}
                  placeholder="Nome completo do cliente"
                  className={formErrors.nome_completo ? 'border-red-500' : ''}
                />
                {formErrors.nome_completo && <p className="text-xs text-red-500">{formErrors.nome_completo}</p>}
              </div>

              {/* CPF com validação em tempo real */}
              <div className="space-y-1">
                <Label>CPF *</Label>
                <div className="relative">
                  <Input
                    value={formData.cpf}
                    onChange={(e) => {
                      const formatado = formatarCPF(e.target.value);
                      setFormData(prev => ({ ...prev, cpf: formatado }));
                      setFormErrors({...formErrors, cpf: ''});
                    }}
                    placeholder="000.000.000-00"
                    maxLength={14}
                    className={`pr-8 ${formErrors.cpf ? 'border-red-500' : formData.cpf && cpfValido ? 'border-green-500' : formData.cpf && cpfValido === false ? 'border-red-400' : ''}`}
                  />
                  {formData.cpf && (
                    <span className="absolute right-2 top-1/2 -translate-y-1/2">
                      {cpfValido
                        ? <CheckCircle2 className="h-4 w-4 text-green-500" />
                        : <AlertCircle className="h-4 w-4 text-red-400" />
                      }
                    </span>
                  )}
                </div>
                {formErrors.cpf && <p className="text-xs text-red-500">{formErrors.cpf}</p>}
                {formData.cpf && !formErrors.cpf && cpfValido === false && (
                  <p className="text-xs text-red-400">CPF inválido — verifique os dígitos</p>
                )}
                {formData.cpf && cpfValido === true && (
                  <p className="text-xs text-green-600">CPF válido ✓</p>
                )}
              </div>

              <div className="space-y-1">
                <Label>RG</Label>
                <Input value={formData.rg} onChange={(e) => setFormData(prev => ({ ...prev, rg: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Data de Nascimento</Label>
                <Input type="date" value={formData.data_nascimento} onChange={(e) => setFormData(prev => ({ ...prev, data_nascimento: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Telefone *</Label>
                <Input
                  value={formData.telefone}
                  onChange={(e) => { setFormData(prev => ({ ...prev, telefone: e.target.value })); setFormErrors({...formErrors, telefone: ''}); }}
                  placeholder="(15) 99999-9999"
                  className={formErrors.telefone ? 'border-red-500' : ''}
                />
                {formErrors.telefone && <p className="text-xs text-red-500">{formErrors.telefone}</p>}
              </div>
              <div className="space-y-1">
                <Label>E-mail</Label>
                <Input type="email" value={formData.email} onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Profissão</Label>
                <Input value={formData.profissao} onChange={(e) => setFormData(prev => ({ ...prev, profissao: e.target.value }))} />
              </div>
              <div className="md:col-span-2 space-y-1">
                <Label>Endereço Completo</Label>
                <Input value={formData.endereco} onChange={(e) => setFormData(prev => ({ ...prev, endereco: e.target.value }))} placeholder="Rua, número, bairro" />
              </div>
              <div className="space-y-1">
                <Label>Cidade</Label>
                <Input value={formData.cidade} onChange={(e) => setFormData(prev => ({ ...prev, cidade: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Estado (UF)</Label>
                <Select value={formData.estado} onValueChange={(v) => setFormData(prev => ({ ...prev, estado: v }))}>
                  <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
                  <SelectContent>{UFS.map(uf => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>CEP</Label>
                <Input value={formData.cep} onChange={(e) => setFormData(prev => ({ ...prev, cep: e.target.value }))} placeholder="00000-000" />
              </div>
              <div className="space-y-1">
                <Label>Renda Mensal (R$)</Label>
                <Input type="number" min="0" step="0.01" value={formData.renda_mensal} onChange={(e) => setFormData(prev => ({ ...prev, renda_mensal: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>ID Externo (migração)</Label>
                <Input value={formData.id_externo} onChange={(e) => setFormData(prev => ({ ...prev, id_externo: e.target.value }))} placeholder="ID do sistema antigo" />
              </div>
              <div className="md:col-span-2 space-y-1">
                <Label>Observações</Label>
                <Textarea rows={3} value={formData.observacoes} onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))} placeholder="Observações adicionais..." />
              </div>
            </div>

            {/* Minuta + Gerar Ação */}
            {editingCliente && (
              <div className="flex flex-col sm:flex-row gap-2 pt-1 border-t border-border">
                <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                  <SelectTrigger className="flex-1 h-9 text-xs">
                    <SelectValue placeholder="Selecione a Minuta..." />
                  </SelectTrigger>
                  <SelectContent>
                    {templatesAtivos.length === 0
                      ? <SelectItem value="__none__" disabled>Nenhuma minuta cadastrada</SelectItem>
                      : templatesAtivos.map(t => <SelectItem key={t.id} value={t.id} className="text-xs">{t.nome}</SelectItem>)
                    }
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 text-xs border-[#BFDDF7] text-[#185FA5] hover:bg-[#EAF4FF] flex-shrink-0"
                  onClick={handleGerarAcao}
                  disabled={isGenerating || !selectedTemplateId}
                >
                  {isGenerating ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <FileText className="mr-1.5 h-3.5 w-3.5" />}
                  {isGenerating ? 'Gerando...' : 'Gerar Ação'}
                </Button>
              </div>
            )}

            {/* Botões */}
            <div className="flex flex-wrap justify-end gap-3 pt-2 border-t border-border">
              <Button type="button" variant="outline" onClick={closeDialog}>Cancelar</Button>
              {editingCliente && (
                <Button
                  type="button"
                  className="bg-[#378ADD] hover:bg-[#185FA5] text-white"
                  onClick={openAtendimentoDialog}
                  disabled={loadingFicha}
                >
                  {loadingFicha ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Carregando...</> : 'Adicionar Atendimento'}
                </Button>
              )}
              <Button
                type="submit"
                className="bg-[#378ADD] hover:bg-[#185FA5] text-white"
                disabled={createMutation.isPending || updateMutation.isPending || (formData.cpf && cpfValido === false)}
              >
                {(createMutation.isPending || updateMutation.isPending)
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</>
                  : editingCliente ? 'Salvar Alterações' : 'Cadastrar'
                }
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Dialog Ficha Questionário ── */}
      <Dialog open={atendimentoDialog} onOpenChange={setAtendimentoDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ficha Questionário – 1º Atendimento</DialogTitle>
          </DialogHeader>

          {fichaError && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {fichaError}
            </div>
          )}

          <div className="space-y-6 pt-2">
            {/* 1. Identificação */}
            <div>
              <SectionTitle number="1" title="Identificação / Qualificação" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2"><Label>Nome Completo</Label><Input value={fichaForm.qualificacao_nome_completo} onChange={e => setFichaForm(prev => ({ ...prev, qualificacao_nome_completo: e.target.value }))} /></div>
                <div><Label>Nacionalidade</Label><Input value={fichaForm.qualificacao_nacionalidade} onChange={e => setFichaForm(prev => ({ ...prev, qualificacao_nacionalidade: e.target.value }))} /></div>
                <div><Label>Estado Civil</Label><Input value={fichaForm.qualificacao_estado_civil} onChange={e => setFichaForm(prev => ({ ...prev, qualificacao_estado_civil: e.target.value }))} /></div>
                <div><Label>RG</Label><Input value={fichaForm.qualificacao_rg} onChange={e => setFichaForm(prev => ({ ...prev, qualificacao_rg: e.target.value }))} /></div>
                <div><Label>CPF</Label><Input value={fichaForm.qualificacao_cpf} onChange={e => setFichaForm(prev => ({ ...prev, qualificacao_cpf: e.target.value }))} /></div>
                <div className="md:col-span-2"><Label>Endereço</Label><Input value={fichaForm.qualificacao_endereco} onChange={e => setFichaForm(prev => ({ ...prev, qualificacao_endereco: e.target.value }))} /></div>
                <div><Label>Número</Label><Input value={fichaForm.qualificacao_numero} onChange={e => setFichaForm(prev => ({ ...prev, qualificacao_numero: e.target.value }))} /></div>
                <div><Label>Bairro</Label><Input value={fichaForm.qualificacao_bairro} onChange={e => setFichaForm(prev => ({ ...prev, qualificacao_bairro: e.target.value }))} /></div>
                <div><Label>Cidade</Label><Input value={fichaForm.qualificacao_cidade} onChange={e => setFichaForm(prev => ({ ...prev, qualificacao_cidade: e.target.value }))} /></div>
                <div><Label>Estado</Label><Input value={fichaForm.qualificacao_estado} onChange={e => setFichaForm(prev => ({ ...prev, qualificacao_estado: e.target.value }))} /></div>
                <div><Label>Telefone</Label><Input value={fichaForm.qualificacao_telefone} onChange={e => setFichaForm(prev => ({ ...prev, qualificacao_telefone: e.target.value }))} /></div>
                <div><Label>E-mail</Label><Input value={fichaForm.qualificacao_email} onChange={e => setFichaForm(prev => ({ ...prev, qualificacao_email: e.target.value }))} /></div>
                <div><Label>Senha do Meu INSS</Label><Input value={fichaForm.senha_meu_inss} onChange={e => setFichaForm(prev => ({ ...prev, senha_meu_inss: e.target.value }))} /></div>
                <div><Label>Aniversário</Label><Input value={fichaForm.aniversario} onChange={e => setFichaForm(prev => ({ ...prev, aniversario: e.target.value }))} /></div>
                <div><Label>Atendente</Label><Input value={fichaForm.atendente} onChange={e => setFichaForm(prev => ({ ...prev, atendente: e.target.value }))} /></div>
              </div>
              <div className="mt-3">
                <Label className="mb-2 block">Como ficou sabendo do escritório?</Label>
                <div className="grid grid-cols-2 gap-2">
                  {['Já é Cliente','Indicação de outro cliente','Redes Sociais/Internet','Outro'].map(op => (
                    <CheckItem key={op} label={op} checked={(fichaForm.como_ficou_sabendo || []).includes(op)} onChange={() => setFichaForm(prev => ({ ...prev, como_ficou_sabendo: toggleArray(prev.como_ficou_sabendo, op) }))} />
                  ))}
                </div>
              </div>
            </div>

            {/* 2. Pedido Administrativo */}
            <div>
              <SectionTitle number="2" title="Pedido Administrativo" />
              <div className="space-y-3">
                <div>
                  <Label className="mb-1 block">Já fez pedido administrativo?</Label>
                  <div className="flex gap-4"><RadioItem label="Sim" value="Sim" current={fichaForm.ja_fez_pedido} onChange={v => setFichaForm(prev => ({ ...prev, ja_fez_pedido: v }))} /><RadioItem label="Não" value="Não" current={fichaForm.ja_fez_pedido} onChange={v => setFichaForm(prev => ({ ...prev, ja_fez_pedido: v }))} /></div>
                </div>
                {fichaForm.ja_fez_pedido === 'Sim' && (<>
                  <div>
                    <Label className="mb-1 block">Se sim, foi:</Label>
                    <div className="flex gap-4"><RadioItem label="Deferido" value="Deferido" current={fichaForm.resultado_pedido} onChange={v => setFichaForm(prev => ({ ...prev, resultado_pedido: v }))} /><RadioItem label="Indeferido" value="Indeferido" current={fichaForm.resultado_pedido} onChange={v => setFichaForm(prev => ({ ...prev, resultado_pedido: v }))} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Data do pedido / decisão</Label><Input type="date" value={fichaForm.data_pedido_decisao} onChange={e => setFichaForm(prev => ({ ...prev, data_pedido_decisao: e.target.value }))} /></div>
                    <div>
                      <Label className="mb-1 block">Tem cópia do processo administrativo?</Label>
                      <div className="flex gap-4 mt-1"><RadioItem label="Sim" value="Sim" current={fichaForm.tem_copia_pa} onChange={v => setFichaForm(prev => ({ ...prev, tem_copia_pa: v }))} /><RadioItem label="Não" value="Não" current={fichaForm.tem_copia_pa} onChange={v => setFichaForm(prev => ({ ...prev, tem_copia_pa: v }))} /></div>
                    </div>
                  </div>
                  {fichaForm.resultado_pedido === 'Indeferido' && (
                    <div><Label>No caso de indeferimento, qual o motivo?</Label><Textarea rows={3} value={fichaForm.motivo_indeferimento} onChange={e => setFichaForm(prev => ({ ...prev, motivo_indeferimento: e.target.value }))} /></div>
                  )}
                </>)}
                <div>
                  <Label className="mb-1 block">Possui CNIS impresso?</Label>
                  <div className="flex gap-4"><RadioItem label="Sim" value="Sim" current={fichaForm.possui_cnis} onChange={v => setFichaForm(prev => ({ ...prev, possui_cnis: v }))} /><RadioItem label="Não" value="Não" current={fichaForm.possui_cnis} onChange={v => setFichaForm(prev => ({ ...prev, possui_cnis: v }))} /></div>
                </div>
              </div>
            </div>

            {/* 3. Objetivo */}
            <div>
              <SectionTitle number="3" title="Objetivo" />
              <div className="space-y-3">
                <div>
                  <Label className="mb-1 block">Categoria principal</Label>
                  <div className="flex flex-wrap gap-4">
                    {['Requerimento Administrativo','Ação Judicial Previdenciária','Ação Trabalhista','Ação Cível'].map(op => (
                      <RadioItem key={op} label={op} value={op} current={fichaForm.categoria_principal} onChange={v => setFichaForm(prev => ({ ...prev, categoria_principal: v }))} />
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="mb-2 block">Tipos</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {['Concessão','Revisão','Restabelecimento','Retificação/Inclusão','Idade','Tempo','Especial','Salário Maternidade','Invalidez','Deficiente','Pensão por Morte','Rural','Urbano','LOAS'].map(op => (
                      <CheckItem key={op} label={op} checked={(fichaForm.objetivo_tipos || []).includes(op)} onChange={() => setFichaForm(prev => ({ ...prev, objetivo_tipos: toggleArray(prev.objetivo_tipos, op) }))} />
                    ))}
                  </div>
                </div>
                <div><Label>Outro objetivo</Label><Input value={fichaForm.outro_objetivo} onChange={e => setFichaForm(prev => ({ ...prev, outro_objetivo: e.target.value }))} /></div>
                <div>
                  <Label className="mb-2 block">Cumulado com</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {['Inclusão/Retificação de salário de contribuição','Reconhecimento de tempo especial','Reconhecimento de tempo rural','Inclusão/Retificação de vínculo','Inclusão de vínculo','Pagamento de período como autônomo/facultativo','Reconhecimento de união estável','Tutela antecipada'].map(op => (
                      <CheckItem key={op} label={op} checked={(fichaForm.cumulado_com || []).includes(op)} onChange={() => setFichaForm(prev => ({ ...prev, cumulado_com: toggleArray(prev.cumulado_com, op) }))} />
                    ))}
                  </div>
                </div>
                <div><Label>Outro cumulado com</Label><Input value={fichaForm.outro_cumulado_com} onChange={e => setFichaForm(prev => ({ ...prev, outro_cumulado_com: e.target.value }))} /></div>
              </div>
            </div>

            {/* 4. Ação Judicial */}
            <div>
              <SectionTitle number="4" title="Ação Judicial / Trabalhista / Cível" />
              <div className="space-y-3">
                <div>
                  <Label className="mb-1 block">Tipo de ação principal</Label>
                  <div className="flex flex-wrap gap-4">
                    {['Ação Judicial Previdenciária','Ação Trabalhista','Ação Cível'].map(op => (
                      <RadioItem key={op} label={op} value={op} current={fichaForm.tipo_acao_principal} onChange={v => setFichaForm(prev => ({ ...prev, tipo_acao_principal: v }))} />
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="mb-2 block">Tipos da ação principal</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {['Concessão','Revisão','Restabelecimento','Retificação/Inclusão','Idade','Tempo','Especial','Salário Maternidade','Invalidez','Deficiente','Pensão por Morte','Rural','Urbano','LOAS'].map(op => (
                      <CheckItem key={op} label={op} checked={(fichaForm.tipos_acao_principal || []).includes(op)} onChange={() => setFichaForm(prev => ({ ...prev, tipos_acao_principal: toggleArray(prev.tipos_acao_principal, op) }))} />
                    ))}
                  </div>
                </div>
                <div><Label>Outro tipo de ação principal</Label><Input value={fichaForm.outro_tipo_acao_principal} onChange={e => setFichaForm(prev => ({ ...prev, outro_tipo_acao_principal: e.target.value }))} /></div>
                <div>
                  <Label className="mb-2 block">Ação Trabalhista</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {['Reconhecimento de vínculo','Verbas rescisórias','Rescisão indireta','Falta depósito FGTS','Insalubridade','Horas extras','Danos morais'].map(op => (
                      <CheckItem key={op} label={op} checked={(fichaForm.acao_trabalhista_tipos || []).includes(op)} onChange={() => setFichaForm(prev => ({ ...prev, acao_trabalhista_tipos: toggleArray(prev.acao_trabalhista_tipos, op) }))} />
                    ))}
                  </div>
                </div>
                <div><Label>Outro (Ação Trabalhista)</Label><Input value={fichaForm.outro_acao_trabalhista} onChange={e => setFichaForm(prev => ({ ...prev, outro_acao_trabalhista: e.target.value }))} /></div>
                <div>
                  <Label className="mb-2 block">Ação Cível</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {['Cobrança','Rescisão contratual','Danos morais'].map(op => (
                      <CheckItem key={op} label={op} checked={(fichaForm.acao_civel_tipos || []).includes(op)} onChange={() => setFichaForm(prev => ({ ...prev, acao_civel_tipos: toggleArray(prev.acao_civel_tipos, op) }))} />
                    ))}
                  </div>
                </div>
                <div><Label>Outro (Ação Cível)</Label><Input value={fichaForm.outro_acao_civel} onChange={e => setFichaForm(prev => ({ ...prev, outro_acao_civel: e.target.value }))} /></div>
              </div>
            </div>

            {/* 5. Documentos e Períodos */}
            <div>
              <SectionTitle number="5" title="Documentos e Períodos" />
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Número da CTPS</Label><Input value={fichaForm.numero_ctps} onChange={e => setFichaForm(prev => ({ ...prev, numero_ctps: e.target.value }))} /></div>
                <div><Label>Série da CTPS</Label><Input value={fichaForm.serie_ctps} onChange={e => setFichaForm(prev => ({ ...prev, serie_ctps: e.target.value }))} /></div>
              </div>
              <div className="space-y-3 mt-3">
                <div>
                  <Label className="mb-1 block">Já perdeu alguma CTPS?</Label>
                  <div className="flex gap-4"><RadioItem label="Sim" value="Sim" current={fichaForm.perdeu_ctps} onChange={v => setFichaForm(prev => ({ ...prev, perdeu_ctps: v }))} /><RadioItem label="Não" value="Não" current={fichaForm.perdeu_ctps} onChange={v => setFichaForm(prev => ({ ...prev, perdeu_ctps: v }))} /></div>
                </div>
                <div>
                  <Label className="mb-2 block">Já contribuiu como</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {['Facultativo','Empresário','Autônomo'].map(op => (
                      <CheckItem key={op} label={op} checked={(fichaForm.contribuiu_como || []).includes(op)} onChange={() => setFichaForm(prev => ({ ...prev, contribuiu_como: toggleArray(prev.contribuiu_como, op) }))} />
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Número de carnês</Label><Input value={fichaForm.numero_carnes} onChange={e => setFichaForm(prev => ({ ...prev, numero_carnes: e.target.value }))} /></div>
                  <div>
                    <Label className="mb-1 block">Já perdeu algum carnê?</Label>
                    <div className="flex gap-4 mt-1"><RadioItem label="Sim" value="Sim" current={fichaForm.perdeu_carne} onChange={v => setFichaForm(prev => ({ ...prev, perdeu_carne: v }))} /><RadioItem label="Não" value="Não" current={fichaForm.perdeu_carne} onChange={v => setFichaForm(prev => ({ ...prev, perdeu_carne: v }))} /></div>
                  </div>
                </div>
                <div><Label>CNPJ da empresa (se teve)</Label><Input value={fichaForm.cnpj_empresa} onChange={e => setFichaForm(prev => ({ ...prev, cnpj_empresa: e.target.value }))} /></div>
                <div>
                  <Label className="mb-1 block">Tem período que pode ser comprovado/contribuído?</Label>
                  <div className="flex gap-4"><RadioItem label="Sim" value="Sim" current={fichaForm.tem_periodo_comprovado} onChange={v => setFichaForm(prev => ({ ...prev, tem_periodo_comprovado: v }))} /><RadioItem label="Não" value="Não" current={fichaForm.tem_periodo_comprovado} onChange={v => setFichaForm(prev => ({ ...prev, tem_periodo_comprovado: v }))} /></div>
                </div>
                {fichaForm.tem_periodo_comprovado === 'Sim' && (
                  <div><Label>Descrever período comprovado/contribuído</Label><Textarea rows={3} value={fichaForm.descricao_periodo_comprovado} onChange={e => setFichaForm(prev => ({ ...prev, descricao_periodo_comprovado: e.target.value }))} /></div>
                )}
                <div>
                  <Label className="mb-1 block">Tem período para reconhecer/averbar?</Label>
                  <div className="flex gap-4"><RadioItem label="Sim" value="Sim" current={fichaForm.tem_periodo_averbar} onChange={v => setFichaForm(prev => ({ ...prev, tem_periodo_averbar: v }))} /><RadioItem label="Não" value="Não" current={fichaForm.tem_periodo_averbar} onChange={v => setFichaForm(prev => ({ ...prev, tem_periodo_averbar: v }))} /></div>
                </div>
                {fichaForm.tem_periodo_averbar === 'Sim' && (<>
                  <div>
                    <Label className="mb-2 block">Tipo do período para averbar</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {['Rural','Urbano','Especial'].map(op => (
                        <CheckItem key={op} label={op} checked={(fichaForm.tipo_periodo_averbar || []).includes(op)} onChange={() => setFichaForm(prev => ({ ...prev, tipo_periodo_averbar: toggleArray(prev.tipo_periodo_averbar, op) }))} />
                      ))}
                    </div>
                  </div>
                  <div><Label>Descrever período para reconhecer/averbar</Label><Textarea rows={3} value={fichaForm.descricao_periodo_averbar} onChange={e => setFichaForm(prev => ({ ...prev, descricao_periodo_averbar: e.target.value }))} /></div>
                </>)}
              </div>
            </div>

            {/* 6. Serviço Público */}
            <div>
              <SectionTitle number="6" title="Serviço Público / Militar / Atividade Especial / Saúde" />
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="mb-1 block">Trabalhou no serviço público?</Label>
                    <div className="flex gap-4 mt-1"><RadioItem label="Sim" value="Sim" current={fichaForm.trabalhou_servico_publico} onChange={v => setFichaForm(prev => ({ ...prev, trabalhou_servico_publico: v }))} /><RadioItem label="Não" value="Não" current={fichaForm.trabalhou_servico_publico} onChange={v => setFichaForm(prev => ({ ...prev, trabalhou_servico_publico: v }))} /></div>
                  </div>
                  <div>
                    <Label className="mb-1 block">Tem CTC?</Label>
                    <div className="flex gap-4 mt-1"><RadioItem label="Sim" value="Sim" current={fichaForm.tem_ctc} onChange={v => setFichaForm(prev => ({ ...prev, tem_ctc: v }))} /><RadioItem label="Não" value="Não" current={fichaForm.tem_ctc} onChange={v => setFichaForm(prev => ({ ...prev, tem_ctc: v }))} /></div>
                  </div>
                  <div>
                    <Label className="mb-1 block">Vai providenciar CTC?</Label>
                    <div className="flex gap-4 mt-1"><RadioItem label="Sim" value="Sim" current={fichaForm.vai_providenciar_ctc} onChange={v => setFichaForm(prev => ({ ...prev, vai_providenciar_ctc: v }))} /><RadioItem label="Não" value="Não" current={fichaForm.vai_providenciar_ctc} onChange={v => setFichaForm(prev => ({ ...prev, vai_providenciar_ctc: v }))} /></div>
                  </div>
                </div>
                <div><Label>Descrever local e período do serviço público</Label><Textarea rows={2} value={fichaForm.descricao_servico_publico} onChange={e => setFichaForm(prev => ({ ...prev, descricao_servico_publico: e.target.value }))} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="mb-1 block">Prestou serviço militar?</Label>
                    <div className="flex gap-4 mt-1"><RadioItem label="Sim" value="Sim" current={fichaForm.prestou_servico_militar} onChange={v => setFichaForm(prev => ({ ...prev, prestou_servico_militar: v }))} /><RadioItem label="Não" value="Não" current={fichaForm.prestou_servico_militar} onChange={v => setFichaForm(prev => ({ ...prev, prestou_servico_militar: v }))} /></div>
                  </div>
                  <div>
                    <Label className="mb-1 block">Tem comprovante do serviço militar?</Label>
                    <div className="flex gap-4 mt-1"><RadioItem label="Sim" value="Sim" current={fichaForm.tem_comprovante_militar} onChange={v => setFichaForm(prev => ({ ...prev, tem_comprovante_militar: v }))} /><RadioItem label="Não" value="Não" current={fichaForm.tem_comprovante_militar} onChange={v => setFichaForm(prev => ({ ...prev, tem_comprovante_militar: v }))} /></div>
                  </div>
                  <div>
                    <Label className="mb-1 block">Trabalhou em atividade especial?</Label>
                    <div className="flex gap-4 mt-1"><RadioItem label="Sim" value="Sim" current={fichaForm.trabalhou_atividade_especial} onChange={v => setFichaForm(prev => ({ ...prev, trabalhou_atividade_especial: v }))} /><RadioItem label="Não" value="Não" current={fichaForm.trabalhou_atividade_especial} onChange={v => setFichaForm(prev => ({ ...prev, trabalhou_atividade_especial: v }))} /></div>
                  </div>
                  <div>
                    <Label className="mb-1 block">Tem formulários da atividade especial?</Label>
                    <div className="flex gap-4 mt-1"><RadioItem label="Sim" value="Sim" current={fichaForm.tem_formularios_atividade} onChange={v => setFichaForm(prev => ({ ...prev, tem_formularios_atividade: v }))} /><RadioItem label="Não" value="Não" current={fichaForm.tem_formularios_atividade} onChange={v => setFichaForm(prev => ({ ...prev, tem_formularios_atividade: v }))} /></div>
                  </div>
                </div>
                <div><Label>Quais possui?</Label><Textarea rows={2} value={fichaForm.quais_formularios} onChange={e => setFichaForm(prev => ({ ...prev, quais_formularios: e.target.value }))} /></div>
                <div><Label>Quais providenciar?</Label><Textarea rows={2} value={fichaForm.quais_providenciar} onChange={e => setFichaForm(prev => ({ ...prev, quais_providenciar: e.target.value }))} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="mb-1 block">Tem algum problema de saúde?</Label>
                    <div className="flex gap-4 mt-1"><RadioItem label="Sim" value="Sim" current={fichaForm.tem_problema_saude} onChange={v => setFichaForm(prev => ({ ...prev, tem_problema_saude: v }))} /><RadioItem label="Não" value="Não" current={fichaForm.tem_problema_saude} onChange={v => setFichaForm(prev => ({ ...prev, tem_problema_saude: v }))} /></div>
                  </div>
                  <div><Label>Quando iniciou?</Label><Input value={fichaForm.quando_iniciou_saude} onChange={e => setFichaForm(prev => ({ ...prev, quando_iniciou_saude: e.target.value }))} placeholder="dd/mm/aaaa ou descrição" /></div>
                </div>
                <div>
                  <Label className="mb-1 block">Tem documentos médicos?</Label>
                  <div className="flex gap-4"><RadioItem label="Sim" value="Sim" current={fichaForm.tem_documentos_medicos} onChange={v => setFichaForm(prev => ({ ...prev, tem_documentos_medicos: v }))} /><RadioItem label="Não" value="Não" current={fichaForm.tem_documentos_medicos} onChange={v => setFichaForm(prev => ({ ...prev, tem_documentos_medicos: v }))} /></div>
                </div>
                <div><Label>Quais documentos médicos possui?</Label><Textarea rows={2} value={fichaForm.quais_documentos_medicos} onChange={e => setFichaForm(prev => ({ ...prev, quais_documentos_medicos: e.target.value }))} /></div>
                <div><Label>Documentos médicos a providenciar</Label><Textarea rows={2} value={fichaForm.documentos_medicos_providenciar} onChange={e => setFichaForm(prev => ({ ...prev, documentos_medicos_providenciar: e.target.value }))} /></div>
              </div>
            </div>

            {/* 7. Para uso do escritório */}
            <div>
              <SectionTitle number="7" title="Para uso do escritório / Diagnóstico / Fatos" />
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="mb-1 block">Documentos digitalizados?</Label>
                    <div className="flex gap-4 mt-1"><RadioItem label="Sim" value="Sim" current={fichaForm.documentos_digitalizados} onChange={v => setFichaForm(prev => ({ ...prev, documentos_digitalizados: v }))} /><RadioItem label="Não" value="Não" current={fichaForm.documentos_digitalizados} onChange={v => setFichaForm(prev => ({ ...prev, documentos_digitalizados: v }))} /></div>
                  </div>
                  <div>
                    <Label className="mb-1 block">Documentação completa?</Label>
                    <div className="flex gap-4 mt-1"><RadioItem label="Sim" value="Sim" current={fichaForm.documentacao_completa} onChange={v => setFichaForm(prev => ({ ...prev, documentacao_completa: v }))} /><RadioItem label="Não" value="Não" current={fichaForm.documentacao_completa} onChange={v => setFichaForm(prev => ({ ...prev, documentacao_completa: v }))} /></div>
                  </div>
                  <div>
                    <Label className="mb-1 block">Retorno?</Label>
                    <div className="flex gap-4 mt-1"><RadioItem label="Sim" value="Sim" current={fichaForm.retorno} onChange={v => setFichaForm(prev => ({ ...prev, retorno: v }))} /><RadioItem label="Não" value="Não" current={fichaForm.retorno} onChange={v => setFichaForm(prev => ({ ...prev, retorno: v }))} /></div>
                  </div>
                  <div><Label>Data do retorno</Label><Input type="date" value={fichaForm.data_retorno} onChange={e => setFichaForm(prev => ({ ...prev, data_retorno: e.target.value }))} /></div>
                </div>
                <div><Label>Diagnóstico</Label><Textarea rows={5} value={fichaForm.diagnostico} onChange={e => setFichaForm(prev => ({ ...prev, diagnostico: e.target.value }))} placeholder="Diagnóstico e observações do caso..." /></div>
                <div><Label>Tipo de ação</Label><Input value={fichaForm.tipo_acao_livre} onChange={e => setFichaForm(prev => ({ ...prev, tipo_acao_livre: e.target.value }))} /></div>
                <div><Label>Fatos</Label><Textarea rows={8} value={fichaForm.fatos} onChange={e => setFichaForm(prev => ({ ...prev, fatos: e.target.value }))} placeholder="Descreva os fatos do caso..." /></div>
              </div>
            </div>

            {/* Botões da ficha */}
            <div className="flex justify-end gap-3 pt-2 border-t border-border">
              <Button type="button" variant="outline" onClick={() => setAtendimentoDialog(false)}>Cancelar</Button>
              <Button
                type="button"
                className="bg-[#378ADD] hover:bg-[#185FA5] text-white"
                onClick={handleSaveFicha}
                disabled={savingFicha}
              >
                {savingFicha ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</> : 'Salvar Atendimento'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
