import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { flowdesk } from '@/api/flowdeskClient';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, ClipboardList, Edit, Trash2, X, FileText, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function ControleExecucao() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [formData, setFormData] = useState({
    titulo: '',
    atendimento_id: '',
    cliente: '',
    descricao: '',
    observacoes: '',
    tipo_movimentacao: '',
    anexos: [],
    status: 'Em aberto',
    responsavel_id: '',
  });

  const queryClient = useQueryClient();

  const { data: controles = [] } = useQuery({
    queryKey: ['controle-execucao'],
    queryFn: () => flowdesk.entities.ControleProcessoExecucao.list('-created_date'),
  });

  const { data: pessoas = [] } = useQuery({
    queryKey: ['pessoas'],
    queryFn: () => flowdesk.entities.Pessoa.list(),
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const controle = await flowdesk.entities.ControleProcessoExecucao.create(data);
      await flowdesk.entities.Auditoria.create({
        modulo: 'Processo Judicial',
        tipo_acao: 'Criação',
        registro_id: controle.id,
        registro_nome: controle.titulo,
        observacao_sistema: `Controle de Execução criado: ${controle.titulo}`
      });
      return controle;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['controle-execucao'] });
      closeDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const controle = await flowdesk.entities.ControleProcessoExecucao.update(id, data);
      await flowdesk.entities.Auditoria.create({
        modulo: 'Processo Judicial',
        tipo_acao: 'Edição',
        registro_id: controle.id,
        registro_nome: controle.titulo,
        observacao_sistema: `Controle de Execução atualizado: ${controle.titulo}`
      });
      return controle;
    },
    onSuccess: async (controleAtualizado) => {
      queryClient.invalidateQueries({ queryKey: ['controle-execucao'] });
      
      // Se mudou para "Gerar tarefa", verificar e converter
      if (controleAtualizado.status === 'Gerar tarefa') {
        if (controleAtualizado.tarefa_criada_id) {
          alert('Este controle já foi convertido em tarefa anteriormente.');
          closeDialog();
          return;
        }

        const user = await flowdesk.auth.me();
        
        // Criar tarefa
        const novaTarefa = await flowdesk.entities.Tarefa.create({
          titulo: controleAtualizado.titulo || 'Sem título',
          descricao: controleAtualizado.descricao || '',
          responsavel_id: controleAtualizado.responsavel_id || '',
          data_inicio: new Date().toISOString().split('T')[0],
          prioridade: 'Alta',
          status: 'Em aberto',
          status_detalhado: 'Pendente',
          origem: 'Controle de Execução',
          atendimento_id: controleAtualizado.atendimento_id,
          observacoes: controleAtualizado.observacoes || ''
        });
        
        // Atualizar controle
        await flowdesk.entities.ControleProcessoExecucao.update(controleAtualizado.id, {
          tarefa_criada_id: novaTarefa.id,
          status: 'Tarefa gerada',
          data_conversao_tarefa: new Date().toISOString(),
          usuario_conversao_id: user.id
        });
        
        await queryClient.invalidateQueries({ queryKey: ['controle-execucao'] });
        await queryClient.invalidateQueries({ queryKey: ['tarefas'] });
        
        closeDialog();
        alert('✅ Tarefa criada com sucesso!');
        navigate(createPageUrl('Tarefas'));
      } else {
        closeDialog();
      }
    },
  });

  const converterEmTarefaMutation = useMutation({
    mutationFn: async (controle) => {
      if (controle.tarefa_criada_id) {
        throw new Error('Este controle já foi convertido em tarefa.');
      }

      const user = await flowdesk.auth.me();
      
      // Criar tarefa simples
      const novaTarefa = await flowdesk.entities.Tarefa.create({
        titulo: controle.titulo || 'Sem título',
        descricao: controle.descricao || '',
        responsavel_id: controle.responsavel_id || '',
        data_inicio: new Date().toISOString().split('T')[0],
        prioridade: 'Alta',
        status: 'Em aberto',
        status_detalhado: 'Pendente',
        origem: 'Controle de Execução',
        atendimento_id: controle.atendimento_id,
        observacoes: controle.observacoes || ''
      });
      
      // Atualizar controle
      await flowdesk.entities.ControleProcessoExecucao.update(controle.id, {
        tarefa_criada_id: novaTarefa.id,
        status: 'Tarefa gerada',
        data_conversao_tarefa: new Date().toISOString(),
        usuario_conversao_id: user.id
      });

      return novaTarefa;
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['controle-execucao'] });
      queryClient.invalidateQueries({ queryKey: ['tarefas'] });
      alert('✅ Tarefa criada com sucesso!');
      navigate(createPageUrl('Tarefas'));
    },
    onError: (error) => {
      alert('Erro: ' + error.message);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => flowdesk.entities.ControleProcessoExecucao.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['controle-execucao'] });
    },
  });

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    setUploadingFiles(true);
    const uploadedUrls = [];
    
    for (const file of files) {
      try {
        const { file_url } = await flowdesk.integrations.Core.UploadFile({ file });
        uploadedUrls.push(file_url);
      } catch (error) {
        console.error('Erro ao fazer upload:', error);
      }
    }
    
    setFormData({
      ...formData,
      anexos: [...(formData.anexos || []), ...uploadedUrls]
    });
    setUploadingFiles(false);
  };

  const removeAnexo = (url) => {
    setFormData({
      ...formData,
      anexos: formData.anexos.filter(a => a !== url)
    });
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingItem(null);
    setFormData({
      titulo: '',
      atendimento_id: '',
      cliente: '',
      descricao: '',
      observacoes: '',
      tipo_movimentacao: '',
      anexos: [],
      status: 'Em aberto',
      responsavel_id: '',
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

  const filteredControles = controles.filter(c => {
    const matchesSearch = c.titulo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         c.cliente?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const abertos = filteredControles.filter(c => 
    c.status === 'Aberto' || c.status === 'Em aberto' || c.status === 'Gerar tarefa'
  );
  const concluidos = filteredControles.filter(c => 
    c.status === 'Concluído' || c.status === 'Tarefa gerada'
  );

  const getPessoaNome = (id) => {
    const pessoa = pessoas.find(p => p.id === id);
    return pessoa?.nome || '-';
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground md:text-3xl flex items-center gap-2">
              <ClipboardList className="h-8 w-8 text-blue-600" />
              Controle de Processo de Execução
            </h1>
            <p className="text-muted-foreground">Acompanhamento sem natureza de tarefa</p>
          </div>
          <Button 
            onClick={() => setIsDialogOpen(true)}
            className="bg-gradient-to-r from-blue-600 to-indigo-600"
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo Controle
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Buscar controles..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        <Tabs defaultValue="abertos" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="abertos">Em aberto ({abertos.length})</TabsTrigger>
            <TabsTrigger value="concluidos">Concluídos ({concluidos.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="abertos" className="mt-6">
            <div className="grid gap-4 md:grid-cols-2">
              <AnimatePresence>
                {abertos.map((controle, index) => (
                  <motion.div
                    key={controle.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.05 }}
                    className="rounded-2xl border-2 border-border bg-card p-6"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <Badge className={
                        controle.status === 'Tarefa gerada' ? 'bg-indigo-100 text-indigo-700' :
                        controle.status === 'Gerar tarefa' ? 'bg-purple-100 text-purple-700' :
                        'bg-blue-100 text-blue-700'
                      }>
                        {controle.status}
                      </Badge>
                      <div className="flex gap-1">
                        {controle.status !== 'Tarefa gerada' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEditDialog(controle)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        {!controle.tarefa_criada_id && controle.status !== 'Tarefa gerada' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-blue-600"
                            onClick={() => {
                              if (confirm('Deseja converter este controle em tarefa? Esta ação não pode ser desfeita.')) {
                                converterEmTarefaMutation.mutate(controle);
                              }
                            }}
                          >
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        )}
                        {controle.status !== 'Tarefa gerada' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600"
                            onClick={() => deleteMutation.mutate(controle.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">{controle.titulo}</h3>
                    {controle.cliente && (
                      <p className="text-sm text-muted-foreground mb-2">Cliente: {controle.cliente}</p>
                    )}
                    {controle.descricao && (
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{controle.descricao}</p>
                    )}
                    {controle.responsavel_id && (
                      <p className="text-xs text-muted-foreground">Responsável: {getPessoaNome(controle.responsavel_id)}</p>
                    )}
                    {controle.anexos && controle.anexos.length > 0 && (
                      <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                        <FileText className="h-3 w-3" />
                        <span>{controle.anexos.length} anexo(s)</span>
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
              {abertos.length === 0 && (
                <p className="col-span-2 text-center text-muted-foreground py-8">Nenhum controle em aberto</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="concluidos" className="mt-6">
            <div className="grid gap-4 md:grid-cols-2">
              <AnimatePresence>
                {concluidos.map((controle, index) => (
                  <motion.div
                    key={controle.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: index * 0.05 }}
                    className="rounded-2xl border-2 border-border bg-card p-6 opacity-75"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <Badge className={
                        controle.status === 'Tarefa gerada' ? 'bg-indigo-100 text-indigo-700' :
                        'bg-emerald-100 text-emerald-700'
                      }>
                        {controle.status}
                      </Badge>
                      {controle.status !== 'Tarefa gerada' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-600"
                          onClick={() => deleteMutation.mutate(controle.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">{controle.titulo}</h3>
                    {controle.cliente && (
                      <p className="text-sm text-muted-foreground mb-1">Cliente: {controle.cliente}</p>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
              {concluidos.length === 0 && (
                <p className="col-span-2 text-center text-muted-foreground py-8">Nenhum controle concluído</p>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Editar Controle' : 'Novo Controle'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Título *</Label>
                <Input
                  value={formData.titulo}
                  onChange={(e) => setFormData({...formData, titulo: e.target.value})}
                  required
                />
              </div>
              <div>
                <Label>Cliente</Label>
                <Input
                  value={formData.cliente}
                  onChange={(e) => setFormData({...formData, cliente: e.target.value})}
                />
              </div>
              <div>
                <Label>Descrição</Label>
                <Textarea
                  value={formData.descricao}
                  onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                  rows={3}
                />
              </div>
              <div>
                <Label>Observações</Label>
                <Textarea
                  value={formData.observacoes}
                  onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
                  rows={3}
                />
              </div>
              <div>
                <Label>Tipo de Movimentação</Label>
                <Input
                  value={formData.tipo_movimentacao}
                  onChange={(e) => setFormData({...formData, tipo_movimentacao: e.target.value})}
                  placeholder="Ex: Citação, Penhora, Sentença..."
                />
              </div>
              <div>
                <Label>Responsável</Label>
                <Select value={formData.responsavel_id} onValueChange={(value) => setFormData({...formData, responsavel_id: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o responsável..." />
                  </SelectTrigger>
                  <SelectContent>
                    {pessoas.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Anexos</Label>
                <div className="flex flex-col gap-2">
                  <Input
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    disabled={uploadingFiles}
                  />
                  {formData.anexos && formData.anexos.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.anexos.map((url, idx) => (
                        <Badge key={idx} variant="outline" className="pr-1">
                          <FileText className="h-3 w-3 mr-1" />
                          Arquivo {idx + 1}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-4 w-4 ml-1"
                            onClick={() => removeAnexo(url)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Em aberto">Em aberto</SelectItem>
                    <SelectItem value="Gerar tarefa">Gerar tarefa</SelectItem>
                    <SelectItem value="Concluído">Concluído</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={closeDialog}>Cancelar</Button>
                <Button type="submit" className="bg-blue-600">
                  {editingItem ? 'Salvar' : 'Criar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}