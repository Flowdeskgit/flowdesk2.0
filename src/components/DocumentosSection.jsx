import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { flowdesk } from '@/api/flowdeskClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Upload, FileText, Trash2, Pencil, Download, Loader2, FolderOpen, Eye, ExternalLink, X, Maximize2, Minimize2, Pin, PinOff } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const TIPOS = ['Documento pessoal', 'Procuração', 'Comprovante', 'CNIS', 'Laudo', 'Requerimento', 'Petição', 'Sentença', 'Decisão', 'Guia', 'Comprovante de residência', 'Outro'];
const CATEGORIAS = ['Todos', 'Pessoal', 'Médico', 'Administrativo', 'Jurídico', 'Outro'];

const CAT_COLORS = {
  Pessoal: 'bg-blue-100 text-blue-700',
  Médico: 'bg-green-100 text-green-700',
  Administrativo: 'bg-amber-100 text-amber-700',
  Jurídico: 'bg-purple-100 text-purple-700',
  Outro: 'bg-slate-100 text-slate-600',
};

const EMPTY = {
  nome_documento: '',
  tipo_documento: 'Outro',
  categoria_documento: 'Outro',
  descricao_documento: '',
  data_documento: '',
  observacoes: '',
};

function getFileType(url) {
  if (!url) return 'outro';
  const ext = url.split('.').pop().split('?')[0].toLowerCase();
  if (['pdf'].includes(ext)) return 'pdf';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return 'imagem';
  if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext)) return 'office';
  return 'outro';
}

function DocContent({ doc }) {
  const tipo = getFileType(doc.arquivo_url);
  const nome = doc.nome_original_arquivo || doc.nome_documento || 'Documento';
  return (
    <div className="flex-1 min-h-0 overflow-auto bg-slate-100 h-full">
      {tipo === 'pdf' && (
        <iframe src={doc.arquivo_url} className="w-full h-full min-h-[75vh]" title={nome} />
      )}
      {tipo === 'imagem' && (
        <div className="flex items-center justify-center p-6 min-h-[70vh]">
          <img src={doc.arquivo_url} alt={nome} className="max-w-full max-h-[80vh] object-contain rounded-xl shadow-lg" />
        </div>
      )}
      {tipo === 'office' && (
        <iframe
          src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(doc.arquivo_url)}`}
          className="w-full min-h-[75vh] h-full"
          title={nome}
        />
      )}
      {tipo === 'outro' && (
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4 text-slate-500">
          <FileText className="h-14 w-14 opacity-20" />
          <p className="text-sm">Este formato não pode ser visualizado diretamente.</p>
          <a href={doc.arquivo_url} download className="flex items-center gap-2 rounded-xl bg-[#378ADD] text-white px-5 py-2.5 text-sm font-medium hover:bg-[#185FA5] transition-colors">
            <Download className="h-4 w-4" />Baixar arquivo
          </a>
        </div>
      )}
    </div>
  );
}

function MultiDocViewer({ openDocs, activeDocId, onSetActive, onClose, onPin, pinnedIds }) {
  const [fullscreen, setFullscreen] = useState(false);

  if (!openDocs.length) return null;

  const activeDoc = openDocs.find(d => d.id === activeDocId) || openDocs[0];

  return (
    <div
      className={`fixed z-50 flex flex-col bg-white shadow-2xl transition-all duration-200 ${
        fullscreen ? 'inset-0 rounded-none' : 'inset-[2%] rounded-2xl border border-slate-200'
      }`}
      onClick={e => e.stopPropagation()}
    >
      {/* Barra de abas */}
      <div className="flex items-center border-b border-slate-200 bg-slate-50 rounded-tl-2xl rounded-tr-2xl flex-shrink-0 overflow-x-auto min-h-[44px]">
        <div className="flex items-center flex-1 overflow-x-auto">
          {openDocs.map(doc => {
            const nome = doc.nome_original_arquivo || doc.nome_documento || 'Documento';
            const isPinned = pinnedIds.includes(doc.id);
            const isActive = doc.id === activeDoc?.id;
            return (
              <div
                key={doc.id}
                onClick={() => onSetActive(doc.id)}
                className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium cursor-pointer border-r border-slate-200 transition-colors max-w-[200px] min-w-[120px] flex-shrink-0 ${
                  isActive
                    ? 'bg-white text-slate-800 border-b-2 border-b-[#378ADD]'
                    : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                <FileText className="h-3 w-3 flex-shrink-0 text-[#378ADD]" />
                <span className="truncate flex-1">{nome}</span>
                {isPinned && <Pin className="h-2.5 w-2.5 text-[#378ADD] flex-shrink-0" />}
                <button
                  onClick={e => { e.stopPropagation(); onClose(doc.id); }}
                  className="flex-shrink-0 rounded p-0.5 hover:bg-slate-200 text-slate-400 hover:text-slate-700"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Ações globais */}
        <div className="flex items-center gap-1 px-2 flex-shrink-0 border-l border-slate-200">
          {activeDoc && (
            <>
              <button
                onClick={() => onPin(activeDoc.id)}
                title={pinnedIds.includes(activeDoc.id) ? 'Desafixar' : 'Fixar documento'}
                className="p-1.5 rounded-lg text-slate-400 hover:text-[#378ADD] hover:bg-[#EAF4FF] transition-colors"
              >
                {pinnedIds.includes(activeDoc.id) ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
              </button>
              <a href={activeDoc.arquivo_url} target="_blank" rel="noopener noreferrer" title="Abrir em nova janela"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors">
                <ExternalLink className="h-4 w-4" />
              </a>
              <a href={activeDoc.arquivo_url} download title="Baixar"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors">
                <Download className="h-4 w-4" />
              </a>
            </>
          )}
          <button
            onClick={() => setFullscreen(fs => !fs)}
            title={fullscreen ? 'Sair do fullscreen' : 'Tela cheia'}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
          >
            {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
          <button
            onClick={() => openDocs.filter(d => !pinnedIds.includes(d.id)).forEach(d => onClose(d.id))}
            title="Fechar tudo (exceto fixados)"
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Nome do doc ativo */}
      {activeDoc && (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-100 bg-white flex-shrink-0">
          <FileText className="h-3.5 w-3.5 text-[#378ADD] flex-shrink-0" />
          <span className="text-xs font-medium text-slate-700 truncate">
            {activeDoc.nome_original_arquivo || activeDoc.nome_documento}
          </span>
          {activeDoc.categoria_documento && (
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ml-1 ${CAT_COLORS[activeDoc.categoria_documento] || 'bg-slate-100 text-slate-500'}`}>
              {activeDoc.categoria_documento}
            </span>
          )}
        </div>
      )}

      {activeDoc && <DocContent key={activeDoc.id} doc={activeDoc} />}
    </div>
  );
}

export default function DocumentosSection({ clienteId, processoId, userEmail }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const [filterCat, setFilterCat] = useState('Todos');
  const [uploading, setUploading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [uploadError, setUploadError] = useState('');

  const [openDocs, setOpenDocs] = useState([]);
  const [activeDocId, setActiveDocId] = useState(null);
  const [pinnedIds, setPinnedIds] = useState([]);

  const queryKey = clienteId
    ? ['docs-cliente', clienteId]
    : ['docs-processo', processoId];

  const { data: docs = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => clienteId
      ? flowdesk.entities.DocumentoVinculado.filter({ cliente_id: clienteId }, '-created_date', 500)
      : flowdesk.entities.DocumentoVinculado.filter({ processo_id: processoId }, '-created_date', 500),
    enabled: !!(clienteId || processoId),
  });

  const createMutation = useMutation({
    mutationFn: (data) => flowdesk.entities.DocumentoVinculado.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey }); closeDialog(); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => flowdesk.entities.DocumentoVinculado.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey }); closeDialog(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => flowdesk.entities.DocumentoVinculado.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setDeleteTarget(null);
      if (deleteTarget) {
        setOpenDocs(prev => prev.filter(d => d.id !== deleteTarget.id));
        setPinnedIds(prev => prev.filter(id => id !== deleteTarget.id));
      }
    },
  });

  const openDoc = (doc) => {
    setOpenDocs(prev => {
      if (prev.find(d => d.id === doc.id)) {
        setActiveDocId(doc.id);
        return prev;
      }
      setActiveDocId(doc.id);
      return [...prev, doc];
    });
  };

  const closeDoc = (docId) => {
    if (pinnedIds.includes(docId)) return;
    setOpenDocs(prev => {
      const next = prev.filter(d => d.id !== docId);
      if (activeDocId === docId && next.length) {
        setActiveDocId(next[next.length - 1].id);
      } else if (!next.length) {
        setActiveDocId(null);
      }
      return next;
    });
  };

  const togglePin = (docId) => {
    setPinnedIds(prev =>
      prev.includes(docId) ? prev.filter(id => id !== docId) : [...prev, docId]
    );
  };

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploadError('');
    if (files.length === 1) {
      setPendingFiles(files);
      setForm({ ...EMPTY, nome_documento: files[0].name.replace(/\.[^/.]+$/, '') });
      setEditingItem(null);
      setDialogOpen(true);
    } else {
      setUploading(true);
      const email = userEmail || 'sistema';
      try {
        for (const file of files) {
          const res = await flowdesk.integrations.Core.UploadFile({ file });
          await flowdesk.entities.DocumentoVinculado.create({
            nome_documento: file.name.replace(/\.[^/.]+$/, ''),
            tipo_documento: 'Outro',
            categoria_documento: 'Outro',
            arquivo_url: res.file_url,
            nome_original_arquivo: file.name,
            ...(clienteId ? { cliente_id: clienteId } : {}),
            ...(processoId ? { processo_id: processoId } : {}),
            criado_por: email,
            atualizado_por: email,
          });
        }
        queryClient.invalidateQueries({ queryKey });
      } catch (err) {
        setUploadError('Erro ao enviar arquivo(s). Tente novamente.');
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    }
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingItem(null);
    setForm(EMPTY);
    setPendingFiles([]);
    setUploadError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const openEdit = (doc) => {
    setEditingItem(doc);
    setPendingFiles([]);
    setForm({
      nome_documento: doc.nome_documento || '',
      tipo_documento: doc.tipo_documento || 'Outro',
      categoria_documento: doc.categoria_documento || 'Outro',
      descricao_documento: doc.descricao_documento || '',
      data_documento: doc.data_documento || '',
      observacoes: doc.observacoes || '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);
    setUploadError('');
    const email = userEmail || 'sistema';
    try {
      let arquivo_url = editingItem?.arquivo_url || '';
      let nome_original = editingItem?.nome_original_arquivo || '';
      if (pendingFiles.length > 0) {
        const res = await flowdesk.integrations.Core.UploadFile({ file: pendingFiles[0] });
        arquivo_url = res.file_url;
        nome_original = pendingFiles[0].name;
      }
      const payload = {
        ...form,
        arquivo_url,
        nome_original_arquivo: nome_original,
        ...(clienteId ? { cliente_id: clienteId } : {}),
        ...(processoId ? { processo_id: processoId } : {}),
        atualizado_por: email,
      };
      if (editingItem) {
        updateMutation.mutate({ id: editingItem.id, data: payload });
      } else {
        createMutation.mutate({ ...payload, criado_por: email });
      }
    } catch (err) {
      setUploadError('Erro ao enviar o arquivo. Verifique o arquivo e tente novamente.');
    } finally {
      setUploading(false);
    }
  };

  const filtered = (filterCat === 'Todos' ? docs : docs.filter(d => d.categoria_documento === filterCat))
    .slice()
    .sort((a, b) => (a.nome_documento || '').localeCompare(b.nome_documento || '', 'pt-BR', { sensitivity: 'base' }));

  const getFileExt = (url) => {
    if (!url) return '';
    const parts = url.split('.');
    return parts[parts.length - 1]?.toUpperCase().slice(0, 4) || '';
  };

  const viewerOpen = openDocs.length > 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <FolderOpen className="h-5 w-5 text-[#378ADD]" />
          <span className="font-semibold text-slate-700 text-sm">{docs.length} documento(s)</span>
          {openDocs.length > 0 && (
            <button
              onClick={() => setOpenDocs([])}
              className="text-xs text-[#378ADD] hover:text-[#185FA5] underline ml-2"
            >
              Fechar visualizador
            </button>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          <div className="flex gap-1 flex-wrap">
            {CATEGORIAS.map(cat => (
              <button
                key={cat}
                onClick={() => setFilterCat(cat)}
                className={`text-xs px-2.5 py-1 rounded-full font-medium transition-all ${
                  filterCat === cat
                    ? 'bg-[#378ADD] text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileSelect} />
          <Button
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="bg-[#378ADD] hover:bg-[#185FA5] text-white"
          >
            <Upload className="mr-1.5 h-3.5 w-3.5" />
            Anexar
          </Button>
        </div>
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-[#378ADD]" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
          <FolderOpen className="h-10 w-10 opacity-20" />
          <p className="text-sm">Nenhum documento anexado.</p>
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
            <Upload className="mr-1.5 h-3.5 w-3.5" />
            Anexar documento
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.map(doc => {
            const isOpen = openDocs.some(d => d.id === doc.id);
            const isPinned = pinnedIds.includes(doc.id);
            return (
              <div
                key={doc.id}
                className={`rounded-xl border bg-white p-4 hover:shadow-sm transition-all flex gap-3 ${
                  isOpen
                    ? 'border-[#378ADD] bg-[#EAF4FF]/30'
                    : 'border-slate-200 hover:border-[#BFDDF7]'
                }`}
              >
                {/* File icon */}
                <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-[#EAF4FF] border border-[#BFDDF7] flex flex-col items-center justify-center">
                  <FileText className="h-4 w-4 text-[#378ADD]" />
                  <span className="text-[8px] text-[#378ADD] font-bold leading-none mt-0.5">{getFileExt(doc.arquivo_url)}</span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{doc.nome_documento}</p>
                  {doc.nome_original_arquivo && doc.nome_original_arquivo !== doc.nome_documento && (
                    <p className="text-xs text-slate-400 truncate">{doc.nome_original_arquivo}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {doc.tipo_documento && (
                      <span className="text-[10px] text-slate-500 border border-slate-200 px-1.5 py-0.5 rounded">{doc.tipo_documento}</span>
                    )}
                    {doc.categoria_documento && (
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${CAT_COLORS[doc.categoria_documento] || 'bg-slate-100 text-slate-500'}`}>
                        {doc.categoria_documento}
                      </span>
                    )}
                    {isOpen && isPinned && (
                      <span className="text-[10px] text-[#378ADD] font-semibold flex items-center gap-0.5">
                        <Pin className="h-2.5 w-2.5" />Fixado
                      </span>
                    )}
                    {isOpen && !isPinned && (
                      <span className="text-[10px] text-[#378ADD] font-medium">Aberto</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                    {doc.criado_por && <span>Por: {doc.criado_por.split('@')[0]}</span>}
                    {doc.created_date && <span>{format(new Date(doc.created_date), 'dd/MM/yy', { locale: ptBR })}</span>}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-1 flex-shrink-0">
                  {doc.arquivo_url && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className={`h-7 w-7 ${isOpen ? 'text-[#378ADD] bg-[#EAF4FF]' : ''}`}
                      title={isOpen ? 'Já aberto — clique para focar' : 'Visualizar'}
                      onClick={() => openDoc(doc)}
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {doc.arquivo_url && (
                    <a href={doc.arquivo_url} target="_blank" rel="noopener noreferrer">
                      <Button size="icon" variant="ghost" className="h-7 w-7" title="Abrir em nova janela">
                        <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
                      </Button>
                    </a>
                  )}
                  {doc.arquivo_url && (
                    <a href={doc.arquivo_url} download target="_blank" rel="noopener noreferrer">
                      <Button size="icon" variant="ghost" className="h-7 w-7" title="Baixar">
                        <Download className="h-3.5 w-3.5 text-slate-400" />
                      </Button>
                    </a>
                  )}
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(doc)}>
                    <Pencil className="h-3.5 w-3.5 text-slate-400" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setDeleteTarget(doc)}>
                    <Trash2 className="h-3.5 w-3.5 text-red-400" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Multi-doc Viewer */}
      {viewerOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/60" onClick={() => {
            const nonPinned = openDocs.filter(d => !pinnedIds.includes(d.id));
            nonPinned.forEach(d => closeDoc(d.id));
          }} />
          <MultiDocViewer
            openDocs={openDocs}
            activeDocId={activeDocId || openDocs[0]?.id}
            onSetActive={setActiveDocId}
            onClose={closeDoc}
            onPin={togglePin}
            pinnedIds={pinnedIds}
          />
        </>
      )}

      {/* Dialog edição/upload */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Editar Documento' : 'Novo Documento'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            {uploadError && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
                {uploadError}
              </div>
            )}
            {pendingFiles.length > 0 && (
              <div className="rounded-lg bg-[#EAF4FF] border border-[#BFDDF7] px-3 py-2 text-xs text-[#185FA5] flex items-center gap-2">
                <FileText className="h-3.5 w-3.5" />
                <span className="font-medium truncate">{pendingFiles[0].name}</span>
                <span className="text-[#378ADD]/60 ml-auto flex-shrink-0">({(pendingFiles[0].size / 1024).toFixed(0)} KB)</span>
              </div>
            )}
            <div className="space-y-1">
              <Label>Nome do Documento *</Label>
              <Input
                required
                value={form.nome_documento}
                onChange={e => setForm({ ...form, nome_documento: e.target.value })}
                placeholder="Nome para identificar o documento..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Tipo</Label>
                <Select value={form.tipo_documento} onValueChange={v => setForm({ ...form, tipo_documento: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TIPOS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Categoria</Label>
                <Select value={form.categoria_documento} onValueChange={v => setForm({ ...form, categoria_documento: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIAS.filter(c => c !== 'Todos').map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Data do Documento</Label>
              <Input type="date" value={form.data_documento} onChange={e => setForm({ ...form, data_documento: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Descrição</Label>
              <Textarea rows={2} value={form.descricao_documento} onChange={e => setForm({ ...form, descricao_documento: e.target.value })} />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={closeDialog}>Cancelar</Button>
              <Button
                type="submit"
                className="bg-[#378ADD] hover:bg-[#185FA5] text-white"
                disabled={uploading || createMutation.isPending || updateMutation.isPending}
              >
                {uploading
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Enviando...</>
                  : editingItem ? 'Salvar' : `Anexar${pendingFiles.length > 0 ? ` (${pendingFiles.length})` : ''}`
                }
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmar exclusão */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir documento?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>"{deleteTarget?.nome_documento}"</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteMutation.mutate(deleteTarget.id)}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}