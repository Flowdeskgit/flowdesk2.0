import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { flowdesk } from '@/api/flowdeskClient';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Image, Edit, Trash2, MoreVertical, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';

export default function PostsMarketing() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [formData, setFormData] = useState({
    titulo: '',
    legenda: '',
    midia: [],
    rede_social: 'Instagram',
    tipo_conteudo: 'Feed',
    tags: [],
    campanha: '',
    data_publicacao: '',
    status: 'Rascunho',
    observacoes: '',
  });

  const queryClient = useQueryClient();

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['posts-marketing'],
    queryFn: () => flowdesk.entities.PostMarketing.list('-created_date'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => flowdesk.entities.PostMarketing.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts-marketing'] });
      closeDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => flowdesk.entities.PostMarketing.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts-marketing'] });
      closeDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => flowdesk.entities.PostMarketing.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts-marketing'] });
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
      midia: [...(formData.midia || []), ...uploadedUrls]
    });
    setUploadingFiles(false);
  };

  const removeMidia = (url) => {
    setFormData({
      ...formData,
      midia: formData.midia.filter(m => m !== url)
    });
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingItem(null);
    setFormData({
      titulo: '',
      legenda: '',
      midia: [],
      rede_social: 'Instagram',
      tipo_conteudo: 'Feed',
      tags: [],
      campanha: '',
      data_publicacao: '',
      status: 'Rascunho',
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

  const filteredPosts = posts.filter(p => {
    const matchesSearch = p.titulo?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusColors = {
    'Rascunho': 'bg-slate-100 text-slate-700',
    'Agendado': 'bg-blue-100 text-blue-700',
    'Publicado': 'bg-emerald-100 text-emerald-700',
    'Arquivado': 'bg-amber-100 text-amber-700',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 md:text-3xl flex items-center gap-2">
              <Image className="h-8 w-8 text-purple-600" />
              Posts & Conteúdo
            </h1>
            <p className="text-slate-500">Gerenciador de conteúdo para redes sociais</p>
          </div>
          <Button 
            onClick={() => setIsDialogOpen(true)}
            className="bg-gradient-to-r from-purple-600 to-pink-600"
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo Post
          </Button>
        </div>

        <div className="flex flex-col gap-4 md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Buscar posts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="Rascunho">Rascunho</SelectItem>
              <SelectItem value="Agendado">Agendado</SelectItem>
              <SelectItem value="Publicado">Publicado</SelectItem>
              <SelectItem value="Arquivado">Arquivado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence>
            {filteredPosts.map((post, index) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: index * 0.05 }}
                className="rounded-2xl border-2 border-slate-200 bg-white overflow-hidden hover:shadow-lg transition-shadow"
              >
                {post.midia && post.midia.length > 0 && (
                  <div className="aspect-square bg-slate-100 flex items-center justify-center">
                    <img src={post.midia[0]} alt={post.titulo} className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <Badge className={statusColors[post.status]}>{post.status}</Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditDialog(post)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => deleteMutation.mutate(post.id)} className="text-red-600">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <h3 className="font-semibold text-slate-800 mb-2">{post.titulo}</h3>
                  <p className="text-sm text-slate-600 line-clamp-3 mb-3">{post.legenda}</p>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>{post.rede_social}</span>
                    {post.data_publicacao && <span>{new Date(post.data_publicacao).toLocaleDateString('pt-BR')}</span>}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Editar Post' : 'Novo Post'}</DialogTitle>
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
                <Label>Legenda *</Label>
                <Textarea
                  value={formData.legenda}
                  onChange={(e) => setFormData({...formData, legenda: e.target.value})}
                  rows={6}
                  placeholder="Escreva a legenda do post..."
                  required
                />
              </div>
              <div>
                <Label>Arte/Imagem/Vídeo</Label>
                <div className="flex flex-col gap-2">
                  <Input
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    onChange={handleFileUpload}
                    disabled={uploadingFiles}
                  />
                  {formData.midia && formData.midia.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.midia.map((url, idx) => (
                        <div key={idx} className="relative w-20 h-20 rounded border">
                          <img src={url} alt="" className="w-full h-full object-cover rounded" />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute -top-2 -right-2 h-6 w-6"
                            onClick={() => removeMidia(url)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Rede Social</Label>
                  <Select value={formData.rede_social} onValueChange={(value) => setFormData({...formData, rede_social: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Instagram">Instagram</SelectItem>
                      <SelectItem value="Facebook">Facebook</SelectItem>
                      <SelectItem value="LinkedIn">LinkedIn</SelectItem>
                      <SelectItem value="TikTok">TikTok</SelectItem>
                      <SelectItem value="YouTube">YouTube</SelectItem>
                      <SelectItem value="Todas">Todas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Tipo de Conteúdo</Label>
                  <Select value={formData.tipo_conteudo} onValueChange={(value) => setFormData({...formData, tipo_conteudo: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Carrossel">Carrossel</SelectItem>
                      <SelectItem value="Reels">Reels</SelectItem>
                      <SelectItem value="Stories">Stories</SelectItem>
                      <SelectItem value="Feed">Feed</SelectItem>
                      <SelectItem value="Vídeo">Vídeo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Data de Publicação</Label>
                  <Input
                    type="date"
                    value={formData.data_publicacao}
                    onChange={(e) => setFormData({...formData, data_publicacao: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Rascunho">Rascunho</SelectItem>
                      <SelectItem value="Agendado">Agendado</SelectItem>
                      <SelectItem value="Publicado">Publicado</SelectItem>
                      <SelectItem value="Arquivado">Arquivado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Campanha</Label>
                <Input
                  value={formData.campanha}
                  onChange={(e) => setFormData({...formData, campanha: e.target.value})}
                  placeholder="Nome da campanha"
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={closeDialog}>Cancelar</Button>
                <Button type="submit" className="bg-purple-600">
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