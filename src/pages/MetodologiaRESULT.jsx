import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { flowdesk } from '@/api/flowdeskClient';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, BookOpen, FileText, Edit, Trash2, MoreVertical, Paperclip, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';

export default function MetodologiaRESULT() {
  const [searchTerm, setSearchTerm] = useState('');
  const [moduloFilter, setModuloFilter] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    modulo: 'Fundamentos',
    etapa: '',
    tema: '',
    arquivos: [],
    anotacoes: '',
    tags: [],
  });

  const queryClient = useQueryClient();

  const { data: materiais = [], isLoading } = useQuery({
    queryKey: ['metodo-result'],
    queryFn: () => flowdesk.entities.MetodoRESULT.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => flowdesk.entities.MetodoRESULT.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metodo-result'] });
      closeDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => flowdesk.entities.MetodoRESULT.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metodo-result'] });
      closeDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => flowdesk.entities.MetodoRESULT.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metodo-result'] });
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
      arquivos: [...(formData.arquivos || []), ...uploadedUrls]
    });
    setUploadingFiles(false);
  };

  const removeArquivo = (url) => {
    setFormData({
      ...formData,
      arquivos: formData.arquivos.filter(a => a !== url)
    });
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingItem(null);
    setFormData({
      titulo: '',
      descricao: '',
      modulo: 'Fundamentos',
      etapa: '',
      tema: '',
      arquivos: [],
      anotacoes: '',
      tags: [],
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

  const filteredMateriais = materiais.filter(m => {
    const matchesSearch = m.titulo?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesModulo = moduloFilter === 'all' || m.modulo === moduloFilter;
    return matchesSearch && matchesModulo;
  });

  const moduloColors = {
    'Fundamentos': 'bg-blue-100 text-blue-700',
    'Scripts de Atendimento': 'bg-purple-100 text-purple-700',
    'Funil Comercial': 'bg-emerald-100 text-emerald-700',
    'Padronização de Abordagem': 'bg-amber-100 text-amber-700',
    'Indicadores de Performance': 'bg-pink-100 text-pink-700',
    'Outro': 'bg-slate-100 text-slate-700',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 md:text-3xl flex items-center gap-2">
              <BookOpen className="h-8 w-8 text-indigo-600" />
              Mentoria - Método RESULT
            </h1>
            <p className="text-slate-500">Cofre estratégico do escritório</p>
          </div>
          <Button 
            onClick={() => setIsDialogOpen(true)}
            className="bg-gradient-to-r from-indigo-600 to-purple-600"
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo Material
          </Button>
        </div>

        <div className="flex flex-col gap-4 md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Buscar materiais..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={moduloFilter} onValueChange={setModuloFilter}>
            <SelectTrigger className="w-full md:w-64">
              <SelectValue placeholder="Módulo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Módulos</SelectItem>
              <SelectItem value="Fundamentos">Fundamentos</SelectItem>
              <SelectItem value="Scripts de Atendimento">Scripts de Atendimento</SelectItem>
              <SelectItem value="Funil Comercial">Funil Comercial</SelectItem>
              <SelectItem value="Padronização de Abordagem">Padronização de Abordagem</SelectItem>
              <SelectItem value="Indicadores de Performance">Indicadores de Performance</SelectItem>
              <SelectItem value="Outro">Outro</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence>
            {filteredMateriais.map((material, index) => (
              <motion.div
                key={material.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: index * 0.05 }}
                className="rounded-2xl border-2 border-slate-200 bg-white p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <Badge className={moduloColors[material.modulo]}>{material.modulo}</Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEditDialog(material)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => deleteMutation.mutate(material.id)} className="text-red-600">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <h3 className="font-semibold text-slate-800 mb-2">{material.titulo}</h3>
                {material.descricao && <p className="text-sm text-slate-600 mb-3 line-clamp-2">{material.descricao}</p>}
                {material.arquivos && material.arquivos.length > 0 && (
                  <div className="flex items-center gap-1 text-xs text-slate-500">
                    <Paperclip className="h-3 w-3" />
                    <span>{material.arquivos.length} arquivo(s)</span>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Editar Material' : 'Novo Material'}</DialogTitle>
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
                <Label>Descrição</Label>
                <Textarea
                  value={formData.descricao}
                  onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                  rows={3}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Módulo *</Label>
                  <Select value={formData.modulo} onValueChange={(value) => setFormData({...formData, modulo: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Fundamentos">Fundamentos</SelectItem>
                      <SelectItem value="Scripts de Atendimento">Scripts de Atendimento</SelectItem>
                      <SelectItem value="Funil Comercial">Funil Comercial</SelectItem>
                      <SelectItem value="Padronização de Abordagem">Padronização de Abordagem</SelectItem>
                      <SelectItem value="Indicadores de Performance">Indicadores de Performance</SelectItem>
                      <SelectItem value="Outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Etapa</Label>
                  <Input
                    value={formData.etapa}
                    onChange={(e) => setFormData({...formData, etapa: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <Label>Tema</Label>
                <Input
                  value={formData.tema}
                  onChange={(e) => setFormData({...formData, tema: e.target.value})}
                />
              </div>
              <div>
                <Label>Arquivos (PDF, Word, Excel, PPT)</Label>
                <div className="flex flex-col gap-2">
                  <Input
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                    onChange={handleFileUpload}
                    disabled={uploadingFiles}
                  />
                  {formData.arquivos && formData.arquivos.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.arquivos.map((url, idx) => (
                        <Badge key={idx} variant="outline" className="pr-1">
                          <FileText className="h-3 w-3 mr-1" />
                          Arquivo {idx + 1}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-4 w-4 ml-1"
                            onClick={() => removeArquivo(url)}
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
                <Label>Anotações Estratégicas</Label>
                <Textarea
                  value={formData.anotacoes}
                  onChange={(e) => setFormData({...formData, anotacoes: e.target.value})}
                  rows={4}
                  placeholder="Anote informações importantes, insights, estratégias..."
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={closeDialog}>Cancelar</Button>
                <Button type="submit" className="bg-indigo-600">
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