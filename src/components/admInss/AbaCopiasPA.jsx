import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { flowdesk } from '@/api/flowdeskClient';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Pencil, Trash2, MoreVertical, Users, Paperclip, Upload, X, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const TIPOS = ['Cópia de PA', 'Processo Administrativo', 'Recurso', 'Exigência', 'Despacho', 'Parecer', 'Outro'];
const STATUS_LIST = ['Pendente', 'Em andamento', 'Concluído', 'Arquivado'];

const COLUNAS = [
  { id: 'Cópia de PA',             label: 'Cópia de PA',           color: 'bg-blue-50 border-blue-200',     badgeColor: 'bg-blue-100 text-blue-700',     dotColor: 'bg-blue-500' },
  { id: 'Processo Administrativo', label: 'Proc. Administrativo',  color: 'bg-violet-50 border-violet-200', badgeColor: 'bg-violet-100 text-violet-700', dotColor: 'bg-violet-500' },
  { id: 'Recurso',                 label: 'Recurso',               color: 'bg-amber-50 border-amber-200',   badgeColor: 'bg-amber-100 text-amber-700',   dotColor: 'bg-amber-500' },
  { id: 'Exigência',               label: 'Exigência',             color: 'bg-red-50 border-red-200',       badgeColor: 'bg-red-100 text-red-700',       dotColor: 'bg-red-500' },
  { id: 'Despacho',                label: 'Despacho',              color: 'bg-slate-50 border-slate-200',   badgeColor: 'bg-slate-100 text-slate-700',   dotColor: 'bg-slate-400' },
  { id: 'Parecer',                 label: 'Parecer',               color: 'bg-green-50 border-green-200',   badgeColor: 'bg-green-100 text-green-700',   dotColor: 'bg-green-500' },
  { id: 'Outro',                   label: 'Outro',                 color: 'bg-slate-50 border-slate-200',   badgeColor: 'bg-slate-100 text-slate-600',   dotColor: 'bg-slate-300' },
];

const EMPTY_FORM = {
  cliente_nome: '', tipo: 'Cópia de PA', numero_pa: '', data: '',
  responsavel: '', status: 'Pendente', descricao: '', observacoes: '', anexos: [],
};

async function uploadFiles(files) {
  const urls = [];
  for (const file of files) {
    const { file_url } = await flowdesk.integrations.Core.UploadFile({ file });
    urls.push(file_url);
  }
  return urls;
}

export default function AbaCopiasPA({ admId }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [uploading, setUploading] = useState(false);

  const { data: copias = [] } = useQuery({
    queryKey: ['copias-pa', admId || 'all'],
    queryFn: () => admId
      ? flowdesk.entities.CopiasPA.filter({ adm_id: admId })
      : flowdesk.entities.CopiasPA.list('-created_date', 500),
  });

  const qk = ['copias-pa', admId || 'all'];

  const createMutation = useMutation({
    mutationFn: (data) => flowdesk.entities.CopiasPA.create({ ...data, adm_id: admId }),
    onSuccess: () => { queryClient.invalidateQueries(qk); closeForm(); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => flowdesk.entities.CopiasPA.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries(qk); closeForm(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => flowdesk.entities.CopiasPA.delete(id),
    onSuccess: () => queryClient.invalidateQueries(qk),
  });

  const closeForm = () => { setShowForm(false); setEditing(null); setForm(EMPTY_FORM); };

  const openCreate = (tipo = 'Cópia de PA') => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, tipo });
    setShowForm(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({
      cliente_nome: item.cliente_nome || '',
      tipo: item.tipo || 'Cópia de PA',
      numero_pa: item.numero_pa || '',
      data: item.data || '',
      responsavel: item.responsavel || '',
      status: item.status || 'Pendente',
      descricao: item.descricao || '',
      observacoes: item.observacoes || '',
      anexos: item.anexos || [],
    });
    setShowForm(true);
  };

  const onDragEnd = (result) => {
    const { destination, draggableId } = result;
    if (!destination) return;
    const destCol = COLUNAS.find(c => c.id === destination.droppableId);
    if (!destCol) return;
    const item = copias.find(c => c.id === draggableId);
    if (!item || item.tipo === destCol.id) return;
    updateMutation.mutate({ id: item.id, data: { ...item, tipo: destCol.id } });
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    const urls = await uploadFiles(files);
    setForm(p => ({ ...p, anexos: [...(p.anexos || []), ...urls] }));
    setUploading(false);
    e.target.value = '';
  };

  const handleSave = () => {
    if (!form.cliente_nome.trim()) return alert('Nome do cliente obrigatório');
    if (editing) updateMutation.mutate({ id: editing.id, data: form });
    else createMutation.mutate(form);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="font-semibold text-foreground">Cópias PA's</h3>
          <p className="text-xs text-muted-foreground">{copias.length} registro(s)</p>
        </div>
        <Button size="sm" className="bg-rose-600 hover:bg-rose-700 text-white" onClick={() => openCreate()}>
          <Plus className="h-3.5 w-3.5 mr-1" />Nova Cópia PA
        </Button>
      </div>

      {/* Kanban */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: '40vh' }}>
          {COLUNAS.map(col => {
            const cards = copias.filter(c => (c.tipo || 'Cópia de PA') === col.id);
            return (
              <div key={col.id} className="flex-shrink-0 w-64 flex flex-col">
                {/* Column Header */}
                <div className={`rounded-t-2xl px-4 py-3 ${col.color} border-2 border-b-0`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`h-2.5 w-2.5 rounded-full ${col.dotColor}`} />
                      <h3 className="font-semibold text-slate-800 text-sm leading-tight">{col.label}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${col.badgeColor}`}>{cards.length}</span>
                      <Button size="icon" variant="ghost" className="h-6 w-6 text-slate-500 hover:text-slate-800" onClick={() => openCreate(col.id)}>
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Droppable */}
                <Droppable droppableId={col.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex-1 min-h-[150px] rounded-b-2xl border-2 border-t-0 p-2 space-y-2 transition-colors ${col.color} ${snapshot.isDraggingOver ? 'ring-2 ring-inset ring-rose-300' : ''}`}
                    >
                      <AnimatePresence>
                        {cards.map((item, index) => (
                          <Draggable key={item.id} draggableId={item.id} index={index}>
                            {(prov, snap) => (
                              <div ref={prov.innerRef} {...prov.draggableProps} {...prov.dragHandleProps}>
                                <motion.div
                                  initial={{ opacity: 0, y: 8 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.95 }}
                                  transition={{ delay: index * 0.03 }}
                                  className={`bg-card rounded-xl border border-border p-3 cursor-pointer hover:shadow-md hover:border-rose-200 transition-all ${snap.isDragging ? 'shadow-xl rotate-1' : ''}`}
                                >
                                  <div className="flex items-start justify-between gap-1 mb-2">
                                    <p className="text-sm font-semibold text-foreground line-clamp-2 leading-snug flex-1">{item.cliente_nome}</p>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                                        <Button variant="ghost" size="icon" className="h-5 w-5 flex-shrink-0">
                                          <MoreVertical className="h-3 w-3" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => openEdit(item)}>
                                          <Pencil className="h-3.5 w-3.5 mr-2" />Editar
                                        </DropdownMenuItem>
                                        <DropdownMenuItem className="text-red-600" onClick={() => deleteMutation.mutate(item.id)}>
                                          <Trash2 className="h-3.5 w-3.5 mr-2" />Excluir
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>

                                  {item.numero_pa && (
                                    <p className="text-[10px] text-muted-foreground font-mono mb-1 truncate">PA: {item.numero_pa}</p>
                                  )}
                                  {item.responsavel && (
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                                      <Users className="h-3 w-3 flex-shrink-0" />
                                      <span className="truncate">{item.responsavel}</span>
                                    </div>
                                  )}
                                  {item.status && item.status !== 'Pendente' && (
                                    <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 mb-1">
                                      {item.status}
                                    </span>
                                  )}
                                  {item.data && (
                                    <p className="text-[10px] text-slate-400 mt-1">📅 {item.data}</p>
                                  )}
                                  {item.anexos?.length > 0 && (
                                    <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-1">
                                      <Paperclip className="h-2.5 w-2.5" />{item.anexos.length} anexo(s)
                                    </p>
                                  )}
                                </motion.div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                      </AnimatePresence>
                      {provided.placeholder}
                      {cards.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-6 text-slate-400 gap-1">
                          <FileText className="h-5 w-5 opacity-20" />
                          <p className="text-xs">Nenhum registro</p>
                        </div>
                      )}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>

      {/* Dialog Create/Edit */}
      <Dialog open={showForm} onOpenChange={(o) => !o && closeForm()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Editar Cópia PA' : 'Nova Cópia PA'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="md:col-span-2">
              <Label>Nome do Cliente *</Label>
              <Input value={form.cliente_nome} onChange={e => setForm(p => ({ ...p, cliente_nome: e.target.value }))} placeholder="Ex: João Silva" />
            </div>
            <div>
              <Label>Tipo *</Label>
              <Select value={form.tipo} onValueChange={v => setForm(p => ({ ...p, tipo: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TIPOS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Número do PA</Label>
              <Input value={form.numero_pa} onChange={e => setForm(p => ({ ...p, numero_pa: e.target.value }))} placeholder="Ex: 1234567890" />
            </div>
            <div>
              <Label>Responsável</Label>
              <Input value={form.responsavel} onChange={e => setForm(p => ({ ...p, responsavel: e.target.value }))} placeholder="Nome do responsável" />
            </div>
            <div>
              <Label>Data</Label>
              <Input type="date" value={form.data} onChange={e => setForm(p => ({ ...p, data: e.target.value }))} />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUS_LIST.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label>Descrição</Label>
              <Textarea value={form.descricao} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))} rows={2} />
            </div>
            <div className="md:col-span-2">
              <Label>Observações</Label>
              <Textarea value={form.observacoes} onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))} rows={2} />
            </div>
            <div className="md:col-span-2">
              <Label>Anexar Documentos</Label>
              <label className="mt-1 flex items-center gap-2 cursor-pointer border border-dashed border-slate-300 rounded-lg p-3 hover:border-rose-300 hover:bg-rose-50 transition-colors">
                <Upload className="h-4 w-4 text-slate-400" />
                <span className="text-sm text-slate-500">{uploading ? 'Enviando...' : 'Selecionar múltiplos arquivos'}</span>
                <input type="file" multiple className="hidden" onChange={handleFileUpload} disabled={uploading} accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx" />
              </label>
              {form.anexos?.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {form.anexos.map((url, i) => (
                    <div key={i} className="flex items-center gap-1 border border-slate-200 rounded-lg px-2 py-1 bg-slate-50 text-xs">
                      <Paperclip className="h-3 w-3 text-slate-400" />
                      <a href={url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">Anexo {i + 1}</a>
                      <button onClick={() => setForm(p => ({ ...p, anexos: p.anexos.filter((_, idx) => idx !== i) }))} className="ml-1 text-red-400 hover:text-red-600">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={closeForm}>Cancelar</Button>
            <Button className="bg-rose-600 hover:bg-rose-700 text-white" onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
              {editing ? 'Atualizar' : 'Criar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}