import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { flowdesk } from '@/api/flowdeskClient';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FileText, Plus, Search, Clock, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const statusColors = {
  'Aguardando': 'bg-amber-100 text-amber-700 border-amber-200',
  'Recebido Parcialmente': 'bg-blue-100 text-blue-700 border-blue-200',
  'Recebido': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'Cancelado': 'bg-slate-100 text-slate-700 border-slate-200',
};

export default function AguardandoDocumentos() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [tipoFilter, setTipoFilter] = useState('all');
  const [formData, setFormData] = useState({
    cliente: '',
    atendimento_id: '',
    tipo: 'Documentos',
    documentos_pendentes: '',
    data_solicitacao: '',
    prazo_entrega: '',
    status: 'Aguardando',
    responsavel_id: '',
    observacoes: '',
  });

  const queryClient = useQueryClient();

  const { data: documentos = [], isLoading } = useQuery({
    queryKey: ['aguardando-documentos'],
    queryFn: () => flowdesk.entities.AguardandoDocumento.list('-created_date'),
  });

  const { data: pessoas = [] } = useQuery({
    queryKey: ['pessoas'],
    queryFn: () => flowdesk.entities.Pessoa.list(),
  });

  const { data: atendimentos = [] } = useQuery({
    queryKey: ['atendimentos'],
    queryFn: () => flowdesk.entities.Atendimento.list('-created_date'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => flowdesk.entities.AguardandoDocumento.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aguardando-documentos'] });
      closeDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => flowdesk.entities.AguardandoDocumento.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aguardando-documentos'] });
      closeDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => flowdesk.entities.AguardandoDocumento.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aguardando-documentos'] });
    },
  });

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingItem(null);
    setFormData({
      cliente: '',
      atendimento_id: '',
      tipo: 'Documentos',
      documentos_pendentes: '',
      data_solicitacao: '',
      prazo_entrega: '',
      status: 'Aguardando',
      responsavel_id: '',
      observacoes: '',
    });
  };

  const openEditDialog = (item) => {
    setEditingItem(item);
    setFormData(item);
    setIsDialogOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const getPessoaNome = (id) => {
    const pessoa = pessoas.find(p => p.id === id);
    return pessoa?.nome || '-';
  };

  const filteredDocumentos = documentos.filter(doc => {
    const matchesSearch = doc.cliente?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.documentos_pendentes?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTipo = tipoFilter === 'all' || doc.tipo === tipoFilter;
    return matchesSearch && matchesTipo;
  });

  const abertos = filteredDocumentos.filter(d => d.status === 'Aguardando' || d.status === 'Recebido Parcialmente');
  const concluidos = filteredDocumentos.filter(d => d.status === 'Recebido' || d.status === 'Cancelado');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground md:text-3xl">Aguardando Documentos</h1>
            <p className="text-muted-foreground">Documentos pendentes dos clientes</p>
          </div>
          <Button
            onClick={() => setIsDialogOpen(true)}
            className="bg-[#378ADD] hover:bg-[#185FA5] text-white"
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo Registro
          </Button>
        </div>

        {/* Search + Filtro */}
        <div className="flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Buscar por cliente ou documento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={tipoFilter} onValueChange={setTipoFilter}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="Tipo de documento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              {['Documentos','Cópia PA','CNIS','Prontuário Médico','Certidão','Formulário','Outro'].map(t => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="abertos" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="abertos">Em aberto ({abertos.length})</TabsTrigger>
            <TabsTrigger value="concluidos">Concluídos ({concluidos.length})</TabsTrigger>
          </TabsList>

          {/* Abertos */}
          <TabsContent value="abertos" className="mt-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <AnimatePresence>
                {abertos.map((doc, index) => {
                  const diasRestantes = doc.prazo_entrega
                    ? differenceInDays(parseISO(doc.prazo_entrega), new Date())
                    : null;

                  return (
                    <motion.div
                      key={doc.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: index * 0.05 }}
                      className="rounded-2xl border border-border bg-card p-6 hover:shadow-lg transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="font-semibold text-foreground text-lg mb-1">{doc.cliente}</h3>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className={`${statusColors[doc.status]} border`}>
                              {doc.status}
                            </Badge>
                            {doc.tipo && doc.tipo !== 'Documentos' && (
                              <Badge variant="outline" className="text-xs border-slate-300 text-slate-600">
                                {doc.tipo}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditDialog(doc)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => deleteMutation.mutate(doc.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div className="space-y-3 text-sm">
                        <div>
                          <p className="text-muted-foreground text-xs mb-1">Documentos Pendentes:</p>
                          <p className="text-foreground">{doc.documentos_pendentes}</p>
                        </div>

                        {doc.prazo_entrega && (
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-slate-400" />
                            <span className={`text-xs ${
                              diasRestantes < 0
                                ? 'text-red-400 font-medium'
                                : diasRestantes <= 3
                                ? 'text-amber-400'
                                : 'text-muted-foreground'
                            }`}>
                              Prazo: {format(parseISO(doc.prazo_entrega), 'dd/MM/yyyy', { locale: ptBR })}
                              {diasRestantes !== null && (
                                <span className="ml-1">
                                  ({diasRestantes < 0
                                    ? `${Math.abs(diasRestantes)}d atrasado`
                                    : `${diasRestantes}d restantes`})
                                </span>
                              )}
                            </span>
                          </div>
                        )}

                        {doc.responsavel_id && (
                          <div className="text-xs text-muted-foreground">
                            Responsável: {getPessoaNome(doc.responsavel_id)}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {abertos.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mb-4" />
                <p className="text-lg">Nenhum documento pendente</p>
              </div>
            )}
          </TabsContent>

          {/* Concluídos */}
          <TabsContent value="concluidos" className="mt-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <AnimatePresence>
                {concluidos.map((doc, index) => (
                  <motion.div
                    key={doc.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: index * 0.05 }}
                    className="rounded-2xl border border-border bg-card p-6 opacity-75"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground text-lg mb-1">{doc.cliente}</h3>
                        <Badge className={`${statusColors[doc.status]} border`}>
                          {doc.status}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-600"
                        onClick={() => deleteMutation.mutate(doc.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="space-y-3 text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs mb-1">Documentos:</p>
                        <p className="text-foreground line-clamp-2">{doc.documentos_pendentes}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {concluidos.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mb-4" />
                <p className="text-lg">Nenhum documento concluído</p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingItem ? 'Editar Registro' : 'Novo Registro'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">Cliente *</label>
                  <Input
                    value={formData.cliente}
                    onChange={(e) => setFormData({...formData, cliente: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Tipo de Documento</label>
                  <Select value={formData.tipo || 'Documentos'} onValueChange={(v) => setFormData({...formData, tipo: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['Documentos','Cópia PA','CNIS','Prontuário Médico','Certidão','Formulário','Outro'].map(t => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Atendimento Relacionado</label>
                  <Select value={formData.atendimento_id} onValueChange={(value) => setFormData({...formData, atendimento_id: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {atendimentos.map(a => (
                        <SelectItem key={a.id} value={a.id}>{a.numero_caso} - {a.cliente}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Documentos Pendentes *</label>
                <Textarea
                  value={formData.documentos_pendentes}
                  onChange={(e) => setFormData({...formData, documentos_pendentes: e.target.value})}
                  placeholder="Descreva os documentos pendentes..."
                  required
                />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="text-sm font-medium">Data Solicitação</label>
                  <Input
                    type="date"
                    value={formData.data_solicitacao}
                    onChange={(e) => setFormData({...formData, data_solicitacao: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Prazo Entrega</label>
                  <Input
                    type="date"
                    value={formData.prazo_entrega}
                    onChange={(e) => setFormData({...formData, prazo_entrega: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Aguardando">Aguardando</SelectItem>
                      <SelectItem value="Recebido Parcialmente">Recebido Parcialmente</SelectItem>
                      <SelectItem value="Recebido">Recebido</SelectItem>
                      <SelectItem value="Cancelado">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Responsável</label>
                <Select value={formData.responsavel_id} onValueChange={(value) => setFormData({...formData, responsavel_id: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {pessoas.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Observações</label>
                <Textarea
                  value={formData.observacoes}
                  onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
                  placeholder="Observações adicionais..."
                />
              </div>

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={closeDialog}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="bg-[#378ADD] hover:bg-[#185FA5] text-white"
                >
                  {editingItem ? 'Atualizar' : 'Criar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
}