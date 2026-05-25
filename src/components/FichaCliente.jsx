import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { flowdesk } from '@/api/flowdeskClient';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  User, Phone, MapPin, FileText, Info, Shield, ClipboardList,
  CheckCircle2, HelpCircle, Stethoscope, Pencil, Zap, Loader2,
  ImagePlus, X, Image
} from 'lucide-react';

function tryParseJSON(str) {
  if (!str || typeof str !== 'string') return null;
  try {
    const parsed = JSON.parse(str);
    if (typeof parsed === 'object' && parsed !== null) return parsed;
  } catch (_) {}
  return null;
}

function extrairFichaEstruturada(observacoes) {
  if (!observacoes) return { ficha: null, textoLivre: null };
  let ficha = null;
  let textoLivre = observacoes;
  const hiddenMatch = observacoes.match(/HIDDEN_FICHA\s*:\s*(\{[\s\S]*\})/i);
  if (hiddenMatch) {
    ficha = tryParseJSON(hiddenMatch[1]);
    textoLivre = observacoes.replace(/HIDDEN_FICHA\s*:\s*\{[\s\S]*\}/i, '').trim();
  }
  if (!ficha) {
    ficha = tryParseJSON(observacoes);
    if (ficha) textoLivre = null;
  }
  if (!ficha) {
    const jsonMatch = observacoes.match(/\{[\s\S]{50,}\}/);
    if (jsonMatch) {
      ficha = tryParseJSON(jsonMatch[0]);
      if (ficha) textoLivre = observacoes.replace(jsonMatch[0], '').trim();
    }
  }
  return { ficha, textoLivre: textoLivre && textoLivre.length > 2 ? textoLivre : null };
}

function extrairFatos(cliente) {
  if (!cliente) return '';
  if (cliente.atendimento_questionario_json) {
    try {
      const parsed = typeof cliente.atendimento_questionario_json === 'string'
        ? JSON.parse(cliente.atendimento_questionario_json)
        : cliente.atendimento_questionario_json;
      return parsed?.fatos || '';
    } catch {}
  }
  const obs = cliente.observacoes || '';
  const marker = '<!--HIDDEN_FICHA:';
  const endMarker = '-->';
  const startIdx = obs.indexOf(marker);
  if (startIdx !== -1) {
    const jsonPart = obs.substring(startIdx + marker.length, obs.lastIndexOf(endMarker));
    try {
      const parsed = JSON.parse(jsonPart);
      return parsed?.fatos || '';
    } catch {}
  }
  return '';
}

function extrairDiagnostico(cliente) {
  if (!cliente) return '';
  if (cliente.atendimento_questionario_json) {
    try {
      const parsed = typeof cliente.atendimento_questionario_json === 'string'
        ? JSON.parse(cliente.atendimento_questionario_json)
        : cliente.atendimento_questionario_json;
      return parsed?.diagnostico || '';
    } catch {}
  }
  return '';
}

function Field({ label, value, wide }) {
  if (value === null || value === undefined || value === '' || value === false) return null;
  const display = value === true ? 'Sim' : String(value);
  return (
    <div className={wide ? 'col-span-2' : ''}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 leading-none mb-0.5">{label}</p>
      <p className="text-sm text-slate-800 break-words leading-snug">{display}</p>
    </div>
  );
}

function Section({ title, icon: Icon, children, cols = 2, action }) {
  const kids = React.Children.toArray(children).filter(c => c);
  if (!kids.length) return null;
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
      <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          {Icon && <div className="rounded-lg bg-[#EAF4FF] p-1.5"><Icon className="h-3.5 w-3.5 text-[#378ADD]" /></div>}
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">{title}</h3>
        </div>
        {action}
      </div>
      <div className={`grid grid-cols-${cols} gap-x-6 gap-y-3`}>
        {children}
      </div>
    </div>
  );
}

function LongField({ label, value, icon: Icon }) {
  if (!value) return null;
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
      <div className="flex items-center gap-2 mb-2">
        {Icon && <div className="rounded-lg bg-[#EAF4FF] p-1.5"><Icon className="h-3.5 w-3.5 text-[#378ADD]" /></div>}
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</h3>
      </div>
      <div className="rounded-lg bg-white border border-slate-100 p-3">
        <DiagnosticText text={value} />
      </div>
    </div>
  );
}

function DiagnosticText({ text }) {
  if (!text) return null;
  const paragraphs = text.split(/\n\n+/).flatMap(p => p.split('\n')).filter(p => p.trim());
  if (paragraphs.length <= 1) {
    return <p className="text-sm text-slate-700 leading-7">{text}</p>;
  }
  return (
    <div className="space-y-2">
      {paragraphs.map((p, i) => (
        <p key={i} className="text-sm text-slate-700 leading-7">{p}</p>
      ))}
    </div>
  );
}

function QAItem({ pergunta, resposta }) {
  if (!resposta && resposta !== false && resposta !== 0) return null;
  const display = resposta === true ? 'Sim' : resposta === false ? 'Não' : String(resposta);
  return (
    <div className="border-b border-slate-100 pb-2 last:border-0 last:pb-0">
      <p className="text-xs text-slate-500 leading-snug mb-0.5">{pergunta}</p>
      <p className="text-sm font-medium text-slate-800">{display}</p>
    </div>
  );
}

function RenderObject({ data, depth = 0 }) {
  if (!data || typeof data !== 'object') return null;
  if (Array.isArray(data)) {
    return (
      <ul className="space-y-1 list-disc list-inside">
        {data.map((item, i) => (
          <li key={i} className="text-sm text-slate-700">
            {typeof item === 'object' ? <RenderObject data={item} depth={depth + 1} /> : String(item)}
          </li>
        ))}
      </ul>
    );
  }
  return (
    <div className={`space-y-2 ${depth > 0 ? 'pl-3 border-l-2 border-slate-100' : ''}`}>
      {Object.entries(data).map(([key, val]) => {
        if (val === null || val === undefined || val === '') return null;
        const label = key.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim();
        if (typeof val === 'object') {
          return (
            <div key={key}>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">{label}</p>
              <RenderObject data={val} depth={depth + 1} />
            </div>
          );
        }
        return <QAItem key={key} pergunta={label} resposta={val} />;
      })}
    </div>
  );
}

function EditQuickModal({ open, onClose, title, value, onSave, saving }) {
  const [text, setText] = useState(value || '');
  React.useEffect(() => { setText(value || ''); }, [value, open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[80vw] max-w-4xl h-[75vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-slate-100 flex-shrink-0">
          <DialogTitle className="text-base">{title}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 min-h-0 flex flex-col px-6 py-4">
          <Textarea
            value={text}
            onChange={e => setText(e.target.value)}
            className="text-sm leading-relaxed resize-none flex-1 min-h-[300px] w-full"
            placeholder="Digite o conteúdo aqui..."
          />
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100 flex-shrink-0 bg-white">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            className="bg-[#378ADD] hover:bg-[#185FA5] text-white"
            onClick={() => onSave(text)}
            disabled={saving}
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function JSZIP_CDN() { return 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js'; }

function loadJSZip() {
  if (window.JSZip) return Promise.resolve(window.JSZip);
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${JSZIP_CDN()}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(window.JSZip));
      if (window.JSZip) resolve(window.JSZip);
      return;
    }
    const s = document.createElement('script');
    s.src = JSZIP_CDN();
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
  if (s.includes('T')) {
    try {
      const d = new Date(s);
      if (!Number.isNaN(d.getTime())) {
        return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
      }
    } catch {}
  }
  return s;
}

function GerarAcaoBlock({ cliente, atendimentoForm }) {
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: templatesRaw = [] } = useQuery({
    queryKey: ['template-minuta'],
    queryFn: () => flowdesk.entities.TemplateMinuta.list(),
  });

  const templates = useMemo(() => {
    return (templatesRaw || [])
      .filter(t => t?.ativo !== false)
      .sort((a, b) => Number(a?.ordem || 0) - Number(b?.ordem || 0));
  }, [templatesRaw]);

  const handleGenerate = async () => {
    const tpl = templates.find(t => t.id === selectedTemplateId);
    if (!tpl?.arquivo) { alert('Por favor, selecione uma minuta primeiro.'); return; }
    setIsGenerating(true);
    try {
      const fields = {
        Nome: cliente.nome_completo || '',
        Nacionalidade: atendimentoForm?.qualificacao_nacionalidade || '',
        'Estado civil': atendimentoForm?.qualificacao_estado_civil || '',
        RG: cliente.rg || atendimentoForm?.qualificacao_rg || '',
        CPF: cliente.cpf || atendimentoForm?.qualificacao_cpf || '',
        Endereco: atendimentoForm?.qualificacao_endereco || cliente.endereco_completo || '',
        Numero: atendimentoForm?.qualificacao_numero || '',
        Bairro: atendimentoForm?.qualificacao_bairro || '',
        Cidade: atendimentoForm?.qualificacao_cidade || cliente.cidade || '',
        Cidadedois: atendimentoForm?.qualificacao_cidade || cliente.cidade || '',
        Estado: atendimentoForm?.qualificacao_estado || cliente.estado || '',
        'Na Cidade': 'na cidade de ',
        Data: normalizeDateToBR(new Date().toISOString()),
        Fatos: atendimentoForm?.fatos || '',
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
        const xmlText = await f.async('string');
        zip.file(path, fillSdtXml(xmlText, fields));
      }
      const outBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(outBlob);
      const a = document.createElement('a');
      a.href = url;
      const fileSafeName = String(cliente.nome_completo || 'Cliente').replace(/[<>:"/\\|?*\x00-\x1F]/g, '').trim();
      const templateSafeName = String(tpl.nome || 'Documento').replace(/[<>:"/\\|?*\x00-\x1F]/g, '').trim();
      a.download = `${templateSafeName} - ${fileSafeName}.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      alert('✅ .docx gerado e baixado com sucesso!');
    } catch (err) {
      alert('Erro ao gerar .docx: ' + (err?.message || 'Erro desconhecido'));
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="rounded-xl border border-[#BFDDF7] bg-[#EAF4FF]/40 p-4">
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[#BFDDF7]">
        <div className="rounded-lg bg-[#EAF4FF] p-1.5"><Zap className="h-3.5 w-3.5 text-[#378ADD]" /></div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#185FA5]">Gerar Ação</h3>
        <span className="text-[10px] text-[#378ADD]/60 ml-1">Atalho rápido de minuta</span>
      </div>
      <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
        <div className="flex-1 min-w-0">
          <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
            <SelectTrigger className="h-9 text-xs bg-white">
              <SelectValue placeholder="Selecionar Minuta..." />
            </SelectTrigger>
            <SelectContent>
              {templates.length === 0 ? (
                <SelectItem value="__none__" disabled>Nenhuma minuta cadastrada</SelectItem>
              ) : (
                templates.map(t => (
                  <SelectItem key={t.id} value={t.id} className="text-xs">{t.nome}</SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
        <Button
          variant="outline"
          className="h-9 text-xs border-[#BFDDF7] text-[#185FA5] hover:bg-[#EAF4FF] flex-shrink-0"
          onClick={handleGenerate}
          disabled={isGenerating || !selectedTemplateId}
        >
          <FileText className="mr-1.5 h-3.5 w-3.5" />
          {isGenerating ? 'Gerando...' : 'Gerar Ação'}
        </Button>
      </div>
      {atendimentoForm?.fatos && (
        <p className="text-[10px] text-[#378ADD] mt-2">✓ Dados do atendimento (Fatos, Diagnóstico) serão usados automaticamente.</p>
      )}
    </div>
  );
}

function FichaEstruturada({ ficha, clienteId, observacoes, onUpdated }) {
  const [editOpen, setEditOpen] = useState(false);
  const [editValues, setEditValues] = useState({});
  const [diagImagens, setDiagImagens] = useState([]);
  const [uploadingImg, setUploadingImg] = useState(false);
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: (data) => flowdesk.entities.Cliente.update(clienteId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cliente', clienteId] });
      setEditOpen(false);
      if (onUpdated) onUpdated();
    },
  });

  const handleOpenEdit = (diagObj) => {
    setEditValues({ ...diagObj });
    setDiagImagens(diagObj._imagens || []);
    setEditOpen(true);
  };

  const handleUploadImage = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploadingImg(true);
    for (const file of files) {
      const { file_url } = await flowdesk.integrations.Core.UploadFile({ file });
      setDiagImagens(prev => [...prev, file_url]);
    }
    setUploadingImg(false);
    e.target.value = '';
  };

  const handleRemoveImage = (idx) => {
    setDiagImagens(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSave = () => {
    const updatedFicha = { ...ficha };
    Object.keys(editValues).filter(k => k !== '_imagens').forEach(k => { updatedFicha[k] = editValues[k]; });
    if (diagImagens.length > 0) updatedFicha._imagens = diagImagens;
    else delete updatedFicha._imagens;
    let newObs;
    const hiddenMatch = observacoes && observacoes.match(/HIDDEN_FICHA\s*:\s*(\{[\s\S]*\})/i);
    if (hiddenMatch) {
      newObs = observacoes.replace(/HIDDEN_FICHA\s*:\s*\{[\s\S]*\}/i, 'HIDDEN_FICHA: ' + JSON.stringify(updatedFicha));
    } else {
      newObs = JSON.stringify(updatedFicha);
    }
    updateMutation.mutate({ observacoes: newObs });
  };

  if (!ficha) return null;

  const pessoais = {};
  const previdenciario = {};
  const medico = {};
  const atendimento = {};
  const diagnostico = {};
  const extra = {};

  const pessoaisKeys = ['nome', 'cpf', 'rg', 'data_nascimento', 'nascimento', 'idade', 'sexo', 'genero',
    'estado_civil', 'naturalidade', 'nacionalidade', 'profissao', 'ocupacao', 'renda', 'renda_mensal',
    'escolaridade', 'nome_mae', 'nome_pai'];
  const previdenciarioKeys = ['beneficio', 'tipo_beneficio', 'numero_beneficio', 'nb', 'especie',
    'data_requerimento', 'data_indeferimento', 'data_deferimento', 'competencia', 'dib', 'der',
    'nit', 'pis', 'vinculo', 'tempo_contribuicao', 'periodo', 'modalidade', 'aposentadoria',
    'ja_fez_pedido', 'fez_pedido_inss', 'motivo_indeferimento', 'recurso', 'exigencia'];
  const medicoKeys = ['doenca', 'diagnostico_medico', 'cid', 'laudo', 'medico', 'incapacidade',
    'limitacao', 'tratamento', 'medicamento', 'cirurgia', 'internacao', 'hospital', 'psiquiatrico',
    'psicologico', 'saude'];
  const atendimentoKeys = ['atendimento', 'resumo', 'descricao', 'caso', 'relato', 'historico',
    'situacao', 'contexto', 'observacao', 'nota', 'urgencia', 'prioridade', 'encaminhamento'];
  const diagnosticoKeys = ['diagnostico', 'analise', 'conclusao', 'parecer', 'resultado',
    'avaliacao', 'orientacao', 'recomendacao', 'estrategia', 'possibilidade', 'chance', 'direito'];

  Object.entries(ficha).forEach(([key, val]) => {
    if (val === null || val === undefined || val === '') return;
    if (key === '_imagens') { diagnostico[key] = val; return; }
    const k = key.toLowerCase();
    if (pessoaisKeys.some(pk => k.includes(pk))) pessoais[key] = val;
    else if (diagnosticoKeys.some(dk => k.includes(dk))) diagnostico[key] = val;
    else if (previdenciarioKeys.some(pk => k.includes(pk))) previdenciario[key] = val;
    else if (medicoKeys.some(mk => k.includes(mk))) medico[key] = val;
    else if (atendimentoKeys.some(ak => k.includes(ak))) atendimento[key] = val;
    else extra[key] = val;
  });

  const formatKey = (key) => key.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').replace(/^\w/, c => c.toUpperCase()).trim();

  const renderFields = (obj) =>
    Object.entries(obj).map(([key, val]) => {
      if (val === null || val === undefined || val === '') return null;
      if (typeof val === 'object') {
        return (
          <div key={key} className="col-span-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">{formatKey(key)}</p>
            <RenderObject data={val} />
          </div>
        );
      }
      const str = val === true ? 'Sim' : val === false ? 'Não' : String(val);
      const isLong = str.length > 60;
      return <Field key={key} label={formatKey(key)} value={str} wide={isLong} />;
    });

  const diagKeys = Object.keys(diagnostico).filter(k => k !== '_imagens');

  return (
    <>
      {Object.keys(pessoais).length > 0 && (
        <Section title="Dados Pessoais (Ficha)" icon={User}>{renderFields(pessoais)}</Section>
      )}
      {Object.keys(previdenciario).length > 0 && (
        <Section title="Informações Previdenciárias" icon={Shield}>{renderFields(previdenciario)}</Section>
      )}
      {Object.keys(medico).length > 0 && (
        <Section title="Informações Médicas" icon={Stethoscope}>{renderFields(medico)}</Section>
      )}
      {Object.keys(atendimento).length > 0 && (
        <Section title="Dados do Atendimento" icon={ClipboardList}>{renderFields(atendimento)}</Section>
      )}
      {Object.keys(extra).length > 0 && (
        <Section title="Outras Informações" icon={HelpCircle}>{renderFields(extra)}</Section>
      )}
      {diagKeys.length > 0 && (
        <Section
          title="Diagnóstico / Análise"
          icon={CheckCircle2}
          action={
            <button
              onClick={() => handleOpenEdit(diagnostico)}
              className="opacity-60 hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-[#EAF4FF]"
              title="Editar diagnóstico"
            >
              <Pencil className="h-3.5 w-3.5 text-[#378ADD]" />
            </button>
          }
        >
          {diagnostico._imagens && diagnostico._imagens.length > 0 && (
            <div className="col-span-2 space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Imagens</p>
              <div className="flex flex-wrap gap-3">
                {diagnostico._imagens.map((url, idx) => (
                  <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="block">
                    <img src={url} alt={`Imagem ${idx + 1}`} className="max-h-64 max-w-full rounded-xl border border-slate-200 shadow-sm hover:opacity-90 transition-opacity object-contain bg-slate-50" />
                  </a>
                ))}
              </div>
            </div>
          )}
          {diagKeys.map(key => {
            const val = diagnostico[key];
            if (val === null || val === undefined || val === '') return null;
            if (typeof val === 'object') {
              return (
                <div key={key} className="col-span-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">{formatKey(key)}</p>
                  <RenderObject data={val} />
                </div>
              );
            }
            const str = val === true ? 'Sim' : val === false ? 'Não' : String(val);
            const isLong = str.length > 60;
            if (isLong) {
              return (
                <div key={key} className="col-span-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">{formatKey(key)}</p>
                  <div className="rounded-lg bg-white border border-slate-100 p-3">
                    <DiagnosticText text={str} />
                  </div>
                </div>
              );
            }
            return <Field key={key} label={formatKey(key)} value={str} />;
          })}
        </Section>
      )}

      {/* Modal edição diagnóstico */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="w-[80vw] max-w-4xl h-[80vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 pt-5 pb-4 border-b border-slate-100 flex-shrink-0">
            <DialogTitle className="text-base">Editar Diagnóstico / Análise</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
            {(() => {
              const keys = Object.keys(editValues).filter(k => typeof editValues[k] !== 'object');
              const shortKeys = keys.filter(k => String(editValues[k] ?? '').length <= 60);
              const longKeys = keys.filter(k => String(editValues[k] ?? '').length > 60);
              const singleLong = longKeys.length === 1 && shortKeys.length === 0;
              return (
                <div className={singleLong ? 'h-full flex flex-col' : 'space-y-4'}>
                  {shortKeys.map(key => (
                    <div key={key}>
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">{formatKey(key)}</label>
                      <input
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                        value={String(editValues[key] ?? '')}
                        onChange={e => setEditValues(prev => ({ ...prev, [key]: e.target.value }))}
                      />
                    </div>
                  ))}
                  {longKeys.map((key, idx) => {
                    const isOnlyOne = singleLong && idx === 0;
                    return (
                      <div key={key} className={isOnlyOne ? 'flex-1 flex flex-col min-h-0' : ''}>
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">{formatKey(key)}</label>
                        <Textarea
                          value={String(editValues[key] ?? '')}
                          onChange={e => setEditValues(prev => ({ ...prev, [key]: e.target.value }))}
                          className={`text-sm leading-relaxed resize-none ${isOnlyOne ? 'flex-1 h-full min-h-[300px]' : 'min-h-[200px]'}`}
                          style={isOnlyOne ? { height: '100%' } : {}}
                        />
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
          <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/60">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Image className="h-3.5 w-3.5 text-[#378ADD]" />Imagens do Diagnóstico
              </span>
              <label className="cursor-pointer">
                <input type="file" accept="image/*" multiple className="hidden" onChange={handleUploadImage} disabled={uploadingImg} />
                <span className="inline-flex items-center gap-1 text-xs text-[#185FA5] hover:text-[#378ADD] font-medium px-2 py-1 rounded-md hover:bg-[#EAF4FF] transition-colors">
                  {uploadingImg ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
                  {uploadingImg ? 'Enviando...' : 'Adicionar imagem'}
                </span>
              </label>
            </div>
            {diagImagens.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {diagImagens.map((url, idx) => (
                  <div key={idx} className="relative group">
                    <img src={url} alt={`Imagem ${idx + 1}`} className="h-20 w-20 object-cover rounded-lg border border-slate-200" />
                    <button
                      onClick={() => handleRemoveImage(idx)}
                      className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full h-5 w-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100 flex-shrink-0 bg-white">
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button
              className="bg-[#378ADD] hover:bg-[#185FA5] text-white"
              onClick={handleSave}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function FichaCliente({ cliente }) {
  const queryClient = useQueryClient();
  const [editFatosOpen, setEditFatosOpen] = useState(false);

  const nascimento = cliente.data_nascimento
    ? new Date(cliente.data_nascimento + 'T00:00:00').toLocaleDateString('pt-BR')
    : null;

  const renda = cliente.renda_mensal
    ? `R$ ${Number(cliente.renda_mensal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
    : null;

  const endereco = [cliente.endereco_completo, cliente.cep ? `CEP ${cliente.cep}` : null].filter(Boolean).join(' — ') || null;
  const localidade = [cliente.cidade, cliente.estado].filter(Boolean).join(' / ') || null;

  const { ficha, textoLivre } = useMemo(() => extrairFichaEstruturada(cliente.observacoes), [cliente.observacoes]);
  const fatos = useMemo(() => extrairFatos(cliente), [cliente]);
  const diagnostico = useMemo(() => extrairDiagnostico(cliente), [cliente]);

  const atendimentoFormSimplificado = useMemo(() => {
    if (!cliente.atendimento_questionario_json) return { fatos, diagnostico };
    try {
      const parsed = typeof cliente.atendimento_questionario_json === 'string'
        ? JSON.parse(cliente.atendimento_questionario_json)
        : cliente.atendimento_questionario_json;
      return parsed;
    } catch {
      return { fatos, diagnostico };
    }
  }, [cliente.atendimento_questionario_json, fatos, diagnostico]);

  const updateFatosMutation = useMutation({
    mutationFn: async (novosFatos) => {
      let existing = {};
      if (cliente.atendimento_questionario_json) {
        try {
          existing = typeof cliente.atendimento_questionario_json === 'string'
            ? JSON.parse(cliente.atendimento_questionario_json)
            : cliente.atendimento_questionario_json;
        } catch {}
      }
      const updated = { ...existing, fatos: novosFatos };
      const jsonStr = JSON.stringify(updated);
      const obs = cliente.observacoes || '';
      const marker = '<!--HIDDEN_FICHA:';
      const endMarker = '-->';
      const startIdx = obs.indexOf(marker);
      let finalObs;
      if (startIdx !== -1) {
        const textPart = obs.substring(0, startIdx);
        finalObs = `${textPart}${marker}${jsonStr}${endMarker}`;
      } else {
        finalObs = obs ? `${obs}\n\n${marker}${jsonStr}${endMarker}` : `${marker}${jsonStr}${endMarker}`;
      }
      return flowdesk.entities.Cliente.update(cliente.id, { atendimento_questionario_json: jsonStr, observacoes: finalObs });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cliente', cliente.id] });
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      setEditFatosOpen(false);
    },
  });

  return (
    <div className="space-y-3">
      <Section title="Dados Pessoais" icon={User}>
        <Field label="RG" value={cliente.rg} />
        <Field label="Data de Nascimento" value={nascimento} />
        <Field label="Profissão" value={cliente.profissao} />
        <Field label="Renda Mensal" value={renda} />
      </Section>

      <Section title="Contato" icon={Phone}>
        <Field label="Telefone" value={cliente.telefone} />
        <Field label="E-mail" value={cliente.email} />
      </Section>

      <Section title="Endereço" icon={MapPin}>
        <Field label="Endereço" value={endereco} wide />
        <Field label="Cidade / Estado" value={localidade} />
      </Section>

      {ficha && (
        <FichaEstruturada
          ficha={ficha}
          clienteId={cliente.id}
          observacoes={cliente.observacoes}
        />
      )}

      {/* Dos Fatos */}
      <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
        <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-[#EAF4FF] p-1.5"><ClipboardList className="h-3.5 w-3.5 text-[#378ADD]" /></div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Dos Fatos</h3>
          </div>
          <button
            onClick={() => setEditFatosOpen(true)}
            className="opacity-60 hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-[#EAF4FF]"
            title="Editar Dos Fatos"
          >
            <Pencil className="h-3.5 w-3.5 text-[#378ADD]" />
          </button>
        </div>
        {fatos ? (
          <div className="rounded-lg bg-white border border-slate-100 p-3">
            <DiagnosticText text={fatos} />
          </div>
        ) : (
          <button
            onClick={() => setEditFatosOpen(true)}
            className="w-full rounded-lg bg-white border border-dashed border-slate-200 p-3 text-left text-sm text-slate-400 hover:border-[#BFDDF7] hover:text-[#378ADD] transition-colors"
          >
            Clique na canetinha para adicionar os fatos do caso.
          </button>
        )}
      </div>

      <GerarAcaoBlock cliente={cliente} atendimentoForm={atendimentoFormSimplificado} />

      {textoLivre && <LongField label="Observações" value={textoLivre} icon={Info} />}
      {!ficha && !textoLivre && cliente.observacoes && (
        <LongField label="Observações" value={cliente.observacoes} icon={Info} />
      )}

      {(cliente.criado_por || cliente.atualizado_por || cliente.id_externo) && (
        <div className="rounded-xl border border-slate-100 bg-slate-50/40 p-3 flex flex-wrap gap-4 text-[11px] text-slate-400">
          {cliente.id_externo && <span>ID Externo: <strong>{cliente.id_externo}</strong></span>}
          {cliente.criado_por && <span>Criado por: <strong>{cliente.criado_por.split('@')[0]}</strong></span>}
          {cliente.atualizado_por && <span>Atualizado por: <strong>{cliente.atualizado_por.split('@')[0]}</strong></span>}
        </div>
      )}

      <EditQuickModal
        open={editFatosOpen}
        onClose={() => setEditFatosOpen(false)}
        title="Editar — Dos Fatos"
        value={fatos}
        onSave={(novosFatos) => updateFatosMutation.mutate(novosFatos)}
        saving={updateFatosMutation.isPending}
      />
    </div>
  );
}