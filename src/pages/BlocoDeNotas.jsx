import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { flowdesk } from '@/api/flowdeskClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Search, Pencil, Trash2, BookOpen, Lock, FileText, Filter, Printer, Download } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function gerarWord(nota) {
  const dataFormatada = nota.created_date
    ? format(new Date(nota.created_date), "dd/MM/yyyy", { locale: ptBR })
    : format(new Date(), "dd/MM/yyyy", { locale: ptBR });

  const conteudoHtml = (nota.conteudo_bloco || '').replace(/\n/g, '</p><p>');

  const html = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' 
          xmlns:w='urn:schemas-microsoft-com:office:word'
          xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset="utf-8">
      <title>${nota.titulo_bloco || 'Anotação'}</title>
      <!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View></w:WordDocument></xml><![endif]-->
      <style>
        body { font-family: Calibri, Arial, sans-serif; font-size: 12pt; margin: 2cm; color: #1a1a1a; }
        h1 { font-size: 18pt; font-weight: bold; color: #be123c; margin-bottom: 4pt; }
        .meta { font-size: 9pt; color: #888; margin-bottom: 16pt; border-bottom: 1px solid #eee; padding-bottom: 8pt; }
        .conteudo p { margin: 6pt 0; line-height: 1.6; }
      </style>
    </head>
    <body>
      <h1>${nota.titulo_bloco || 'Sem título'}</h1>
      <div class="meta">
        Categoria: ${nota.categoria_bloco || '-'} &nbsp;|&nbsp; 
        Status: ${nota.status_bloco || '-'} &nbsp;|&nbsp; 
        Data: ${dataFormatada}
      </div>
      <div class="conteudo"><p>${conteudoHtml}</p></div>
    </body>
    </html>`;

  const blob = new Blob(['\ufeff' + html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(nota.titulo_bloco || 'anotacao').replace(/\s+/g, '_')}.doc`;
  a.click();
  URL.revokeObjectURL(url);
}

function imprimirNota(nota) {
  const dataFormatada = nota.created_date
    ? format(new Date(nota.created_date), "dd/MM/yyyy", { locale: ptBR })
    : format(new Date(), "dd/MM/yyyy", { locale: ptBR });

  const conteudoHtml = (nota.conteudo_bloco || '').replace(/\n/g, '<br/>');

  const win = window.open('', '_blank');
  win.document.write(`
    <html>
    <head>
      <title>${nota.titulo_bloco || 'Anotação'}</title>
      <style>
        body { font-family: Calibri, Arial, sans-serif; font-size: 12pt; margin: 2cm; color: #1a1a1a; }
        h1 { font-size: 18pt; color: #be123c; margin-bottom: 4pt; }
        .meta { font-size: 9pt; color: #888; margin-bottom: 16pt; border-bottom: 1px solid #ddd; padding-bottom: 8pt; }
        .conteudo { line-height: 1.7; }
        @media print { button { display: none; } }
      </style>
    </head>
    <body>
      <h1>${nota.titulo_bloco || 'Sem título'}</h1>
      <div class="meta">
        Categoria: ${nota.categoria_bloco || '-'} &nbsp;|&nbsp; 
        Status: ${nota.status_bloco || '-'} &nbsp;|&nbsp; 
        Data: ${dataFormatada}
      </div>
      <div class="conteudo">${conteudoHtml}</div>
      <script>window.onload = () => { window.print(); window.close(); }<\/script>
    </body>
    </html>`);
  win.document.close();
}

const CATEGORIAS = ['pessoal', 'atendimento', 'tarefas', 'estratégia', 'reunião', 'rascunho', 'outro'];
const STATUS_OPTS = ['ativo', 'rascunho', 'arquivado'];

const CAT_COLORS = {
  pessoal: 'bg-blue-100 text-blue-700',
  atendimento: 'bg-rose-100 text-rose-700',
  tarefas: 'bg-orange-100 text-orange-700',
  'estratégia': 'bg-purple-100 text-purple-700',
  'reunião': 'bg-amber-100 text-amber-700',
  rascunho: 'bg-slate-100 text-slate-600',
  outro: 'bg-green-100 text-green-700',
};

const STATUS_COLORS = {
  ativo: 'bg-emerald-100 text-emerald-700',
  rascunho: 'bg-amber-100 text-amber-600',
  arquivado: 'bg-slate-100 text-slate-500',
};

const EMPTY = {
  titulo_bloco: '',
  conteudo_bloco: '',
  categoria_bloco: 'pessoal',
  status_bloco: 'ativo',
};

export default function BlocoDeNotas() {
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('todas');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [savedNota, setSavedNota] = useState(null);

  useEffect(() => {
    flowdesk.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: notas = [], isLoading } = useQuery({
    queryKey: ['bloco-notas', currentUser?.email],
    queryFn: () => flowdesk.entities.BlocosDeNotasUsuario.filter({ usuario_id: currentUser.email }, '-created_date'),
    enabled: !!currentUser?.email,
  });

  const createMutation = useMutation({
    mutationFn: (data) => flowdesk.entities.BlocosDeNotasUsuario.create(data),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['bloco-notas', currentUser?.email] });
      setSavedNota(created);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => flowdesk.entities.BlocosDeNotasUsuario.update(id, data),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['bloco-notas', currentUser?.email] });
      setSavedNota(updated);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => flowdesk.entities.BlocosDeNotasUsuario.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bloco-notas', currentUser?.email] });
      setDeleteTarget(null);
    },
  });

  const openCreate = () => {
    setEditingItem(null);
    setForm(EMPTY);
    setDialogOpen(true);
  };

  const openEdit = (nota) => {
    setEditingItem(nota);
    setForm({
      titulo_bloco: nota.titulo_bloco || '',
      conteudo_bloco: nota.conteudo_bloco || '',
      categoria_bloco: nota.categoria_bloco || 'pessoal',
      status_bloco: nota.status_bloco || 'ativo',
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingItem(null);
    setForm(EMPTY);
    setSavedNota(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const email = currentUser?.email || 'sistema';
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: { ...form, atualizado_por: email } });
    } else {
      createMutation.mutate({ ...form, usuario_id: email, criado_por: email, atualizado_por: email });
    }
  };

  const filtered = notas
    .filter(n => filterCat === 'todas' || n.categoria_bloco === filterCat)
    .filter(n => filterStatus === 'todos' || n.status_bloco === filterStatus)
    .filter(n => {
      const q = search.toLowerCase();
      return !q || (n.titulo_bloco || '').toLowerCase().includes(q) || (n.conteudo_bloco || '').toLowerCase().includes(q);
    });

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-rose-600" />
              Meu Bloco de Notas
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <Lock className="h-3.5 w-3.5 text-slate-400" />
              <p className="text-xs text-slate-400">Estas anotações são privadas e visíveis apenas para você</p>
            </div>
          </div>
          <Button onClick={openCreate} className="bg-rose-600 hover:bg-rose-700 text-white">
            <Plus className="mr-2 h-4 w-4" />
            Nova Anotação
          </Button>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar por título ou conteúdo..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterCat} onValueChange={setFilterCat}>
            <SelectTrigger className="w-44">
              <Filter className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as categorias</SelectItem>
              {CATEGORIAS.map(c => (
                <SelectItem key={c} value={c}>
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {STATUS_OPTS.map(s => (
                <SelectItem key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Lista */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-rose-200 border-t-rose-600 rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
            <BookOpen className="h-12 w-12 opacity-20" />
            <p className="text-sm">Nenhuma anotação encontrada.</p>
            <Button variant="outline" size="sm" onClick={openCreate}>
              Criar primeira anotação
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map(nota => (
              <div
                key={nota.id}
                className={`rounded-2xl border bg-white p-5 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col gap-3 ${
                  nota.status_bloco === 'arquivado' ? 'opacity-60' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-slate-800 text-sm leading-snug flex-1">
                    {nota.titulo_bloco || 'Sem título'}
                  </h3>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button size="icon" variant="ghost" className="h-7 w-7" title="Gerar Word" onClick={() => gerarWord(nota)}>
                      <FileText className="h-3.5 w-3.5 text-blue-400" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" title="Imprimir" onClick={() => imprimirNota(nota)}>
                      <Printer className="h-3.5 w-3.5 text-slate-400" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(nota)}>
                      <Pencil className="h-3.5 w-3.5 text-slate-400" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setDeleteTarget(nota)}>
                      <Trash2 className="h-3.5 w-3.5 text-red-400" />
                    </Button>
                  </div>
                </div>

                {nota.conteudo_bloco && (
                  <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">{nota.conteudo_bloco}</p>
                )}

                <div className="flex items-center gap-2 flex-wrap mt-auto">
                  {nota.categoria_bloco && (
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        CAT_COLORS[nota.categoria_bloco] || 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {nota.categoria_bloco}
                    </span>
                  )}
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[nota.status_bloco] || ''}`}>
                    {nota.status_bloco}
                  </span>
                  {nota.created_date && (
                    <span className="text-[10px] text-slate-400 ml-auto">
                      {format(new Date(nota.created_date), "dd/MM/yy", { locale: ptBR })}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dialog criar/editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-rose-600" />
              {editingItem ? 'Editar Anotação' : 'Nova Anotação'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-1">
              <Label>Título *</Label>
              <Input
                required
                value={form.titulo_bloco}
                onChange={e => setForm({ ...form, titulo_bloco: e.target.value })}
                placeholder="Título da anotação..."
              />
            </div>
            <div className="space-y-1">
              <Label>Conteúdo</Label>
              <Textarea
                rows={8}
                value={form.conteudo_bloco}
                onChange={e => setForm({ ...form, conteudo_bloco: e.target.value })}
                placeholder="Escreva sua anotação aqui..."
                className="resize-y"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Categoria</Label>
                <Select value={form.categoria_bloco} onValueChange={v => setForm({ ...form, categoria_bloco: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIAS.map(c => (
                      <SelectItem key={c} value={c}>
                        {c.charAt(0).toUpperCase() + c.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Status</Label>
                <Select value={form.status_bloco} onValueChange={v => setForm({ ...form, status_bloco: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTS.map(s => (
                      <SelectItem key={s} value={s}>
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {savedNota && (
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 flex items-center gap-3">
                <div className="flex-1 text-xs text-emerald-700 font-medium">
                  ✅ Anotação salva! Deseja exportar ou imprimir?
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="border-blue-300 text-blue-700 hover:bg-blue-50 gap-1.5"
                  onClick={() => gerarWord(savedNota)}
                >
                  <Download className="h-3.5 w-3.5" />
                  Word
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="border-slate-300 text-slate-700 hover:bg-slate-50 gap-1.5"
                  onClick={() => imprimirNota(savedNota)}
                >
                  <Printer className="h-3.5 w-3.5" />
                  Imprimir
                </Button>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={closeDialog}>
                Fechar
              </Button>
              {!savedNota && (
                <Button
                  type="submit"
                  className="bg-rose-600 hover:bg-rose-700 text-white"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {editingItem ? 'Salvar' : 'Criar Anotação'}
                </Button>
              )}
              {savedNota && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setSavedNota(null);
                  }}
                  className="border-rose-300 text-rose-700"
                >
                  Editar novamente
                </Button>
              )}
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmação exclusão */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir anotação?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>"{deleteTarget?.titulo_bloco}"</strong>? Esta ação não pode ser desfeita.
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