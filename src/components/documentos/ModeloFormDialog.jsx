import React, { useState, useEffect } from 'react';
import { flowdesk } from '@/api/flowdeskClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Upload, X, Loader2, Tag, Plus, Check } from 'lucide-react';

const CATEGORIAS_PADRAO = ['Previdenciário', 'Trabalhista', 'Bancário', 'Cível', 'Administrativo', 'Kit Judicial', 'Ficha Questionário', 'Rol de Testemunhas', 'Simulação', 'Solicitação de Prontuário', 'Solicitação de Documentos', 'Autodeclaração', 'Outro'];
const TAGS_SUGERIDAS = ['aposentadoria', 'loas', 'salário-maternidade', 'recurso', 'procuração', 'declaração', 'petição', 'contrato', 'honorários', 'bpc', 'revisão', 'concessão', 'trabalhista', 'cível'];

const EMPTY_FORM = {
  nome: '',
  categoria: 'Previdenciário',
  descricao: '',
  tags: [],
  arquivo_url: '',
  nome_arquivo: '',
  tipo_arquivo: 'docx',
  versao: '1.0',
  status: 'ativo',
};

const STORAGE_KEY = 'flowdesk_categorias_documento';

function loadCategorias() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

export default function ModeloFormDialog({ open, onClose, onSave, modelo, user }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [uploading, setUploading] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [categoriasExtras, setCategoriasExtras] = useState(loadCategorias);
  const [novaCategoriaInput, setNovaCategoriaInput] = useState('');
  const [addingCategoria, setAddingCategoria] = useState(false);

  const todasCategorias = [...CATEGORIAS_PADRAO, ...categoriasExtras.filter(c => !CATEGORIAS_PADRAO.includes(c))];

  const confirmarNovaCategoria = () => {
    const nova = novaCategoriaInput.trim();
    if (!nova) return;
    if (!todasCategorias.includes(nova)) {
      const novas = [...categoriasExtras, nova];
      setCategoriasExtras(novas);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(novas));
    }
    setForm((prev) => ({ ...prev, categoria: nova }));
    setNovaCategoriaInput('');
    setAddingCategoria(false);
  };

  useEffect(() => {
    if (modelo) {
      setForm({
        nome: modelo.nome || '',
        categoria: modelo.categoria || 'Previdenciário',
        descricao: modelo.descricao || '',
        tags: Array.isArray(modelo.tags) ? modelo.tags : [],
        arquivo_url: modelo.arquivo_url || '',
        nome_arquivo: modelo.nome_arquivo || '',
        tipo_arquivo: modelo.tipo_arquivo || 'docx',
        versao: modelo.versao || '1.0',
        status: modelo.status || 'ativo',
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setTagInput('');
  }, [modelo, open]);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop().toLowerCase();
    const tipoMap = { docx: 'docx', doc: 'doc', pdf: 'pdf', xlsx: 'xlsx', xls: 'xls', jpg: 'jpg', jpeg: 'jpeg', png: 'png' };

    setUploading(true);
    const { file_url } = await flowdesk.integrations.Core.UploadFile({ file });
    setForm((prev) => ({
      ...prev,
      arquivo_url: file_url,
      nome_arquivo: file.name,
      tipo_arquivo: tipoMap[ext] || 'outro',
    }));
    setUploading(false);
  };

  const addTag = (tag) => {
    const t = tag.trim().toLowerCase();
    if (t && !form.tags.includes(t)) {
      setForm((prev) => ({ ...prev, tags: [...prev.tags, t] }));
    }
    setTagInput('');
  };

  const removeTag = (tag) => {
    setForm((prev) => ({ ...prev, tags: prev.tags.filter((t) => t !== tag) }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.arquivo_url) {
      alert('Por favor, anexe o arquivo modelo.');
      return;
    }
    onSave({ ...form, cadastrado_por: user?.email || 'sistema' });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{modelo ? 'Editar Modelo' : 'Anexar Novo Modelo'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2 space-y-1">
              <Label>Nome do Modelo *</Label>
              <Input
                required
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                placeholder="Ex: Petição Inicial Aposentadoria por Idade"
              />
            </div>

            <div className="space-y-1">
              <Label>Categoria *</Label>
              <div className="flex gap-2">
                {!addingCategoria ? (
                  <>
                    <Select value={form.categoria} onValueChange={(v) => setForm({ ...form, categoria: v })}>
                      <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {todasCategorias.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 border-slate-200 flex-shrink-0"
                      title="Criar nova categoria"
                      onClick={() => setAddingCategoria(true)}
                    >
                      <Plus className="h-4 w-4 text-slate-500" />
                    </Button>
                  </>
                ) : (
                  <>
                    <Input
                      autoFocus
                      value={novaCategoriaInput}
                      onChange={(e) => setNovaCategoriaInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') { e.preventDefault(); confirmarNovaCategoria(); }
                        if (e.key === 'Escape') { setAddingCategoria(false); setNovaCategoriaInput(''); }
                      }}
                      placeholder="Nome da nova categoria..."
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      size="icon"
                      className="h-9 w-9 bg-rose-600 hover:bg-rose-700 text-white flex-shrink-0"
                      onClick={confirmarNovaCategoria}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 flex-shrink-0"
                      onClick={() => { setAddingCategoria(false); setNovaCategoriaInput(''); }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
              {addingCategoria && (
                <p className="text-xs text-slate-400">Pressione Enter para confirmar ou Esc para cancelar.</p>
              )}
            </div>

            <div className="space-y-1">
              <Label>Versão</Label>
              <Input
                value={form.versao}
                onChange={(e) => setForm({ ...form, versao: e.target.value })}
                placeholder="1.0"
              />
            </div>

            <div className="md:col-span-2 space-y-1">
              <Label>Descrição</Label>
              <Textarea
                rows={3}
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                placeholder="Descreva quando usar este modelo..."
              />
            </div>

            <div className="md:col-span-2 space-y-2">
              <Label>Tags</Label>
              <div className="flex gap-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(tagInput); } }}
                  placeholder="Digite uma tag e pressione Enter"
                  className="flex-1"
                />
                <Button type="button" variant="outline" size="sm" onClick={() => addTag(tagInput)}>
                  <Tag className="h-3.5 w-3.5" />
                </Button>
              </div>

              <div className="flex flex-wrap gap-1">
                {TAGS_SUGERIDAS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => addTag(tag)}
                    className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                      form.tags.includes(tag)
                        ? 'bg-rose-100 text-rose-700 border-rose-200'
                        : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>

              {form.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {form.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="border-rose-200 text-rose-700 gap-1 text-xs">
                      {tag}
                      <button type="button" onClick={() => removeTag(tag)}>
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="md:col-span-2 space-y-2">
              <Label>Arquivo Modelo *</Label>
              <div className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${form.arquivo_url ? 'border-green-300 bg-green-50' : 'border-slate-200 bg-slate-50'}`}>
                {form.arquivo_url ? (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-green-700">✅ Arquivo anexado</p>
                    <p className="text-xs text-slate-500">{form.nome_arquivo}</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-slate-300 text-xs"
                      onClick={() => document.getElementById('modelo-file-input').click()}
                    >
                      Substituir arquivo
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="h-8 w-8 text-slate-300 mx-auto" />
                    <p className="text-sm text-slate-500">Clique para selecionar o arquivo modelo</p>
                    <p className="text-xs text-slate-400">Suporta .docx, .doc, .pdf, .xlsx, .xls, .jpg, .jpeg, .png</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-rose-200 text-rose-700 hover:bg-rose-50"
                      onClick={() => document.getElementById('modelo-file-input').click()}
                      disabled={uploading}
                    >
                      {uploading ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Upload className="mr-2 h-3.5 w-3.5" />}
                      {uploading ? 'Enviando...' : 'Selecionar Arquivo'}
                    </Button>
                  </div>
                )}
                <input
                  id="modelo-file-input"
                  type="file"
                  accept=".docx,.doc,.pdf,.xlsx,.xls,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" className="bg-rose-600 hover:bg-rose-700 text-white" disabled={uploading}>
              {modelo ? 'Salvar Alterações' : 'Anexar Modelo'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}