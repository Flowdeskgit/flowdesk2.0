import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { flowdesk } from '@/api/flowdeskClient';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Target, Edit, Trash2, MoreVertical, Users, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function LandingPages() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLPDialogOpen, setIsLPDialogOpen] = useState(false);
  const [isLeadDialogOpen, setIsLeadDialogOpen] = useState(false);
  const [editingLP, setEditingLP] = useState(null);
  const [editingLead, setEditingLead] = useState(null);
  const [selectedLP, setSelectedLP] = useState(null);
  
  const [lpFormData, setLpFormData] = useState({
    nome: '',
    objetivo: 'BPC',
    url: '',
    leads_gerados: 0,
    taxa_conversao: 0,
    observacoes: '',
    status: 'Ativa',
    data_criacao: new Date().toISOString().split('T')[0],
    responsavel_id: '',
  });

  const [leadFormData, setLeadFormData] = useState({
    nome: '',
    contato: '',
    origem: '',
    landing_page_id: '',
    interesse: 'BPC',
    status: 'Novo',
    proxima_acao: '',
    data_proxima_acao: '',
    responsavel_id: '',
    observacoes: '',
    historico: [],
    valor_potencial: 0,
  });

  const queryClient = useQueryClient();

  const { data: landingPages = [] } = useQuery({
    queryKey: ['landing-pages'],
    queryFn: () => flowdesk.entities.LandingPage.list('-created_date'),
  });

  const { data: leads = [] } = useQuery({
    queryKey: ['leads-comercial'],
    queryFn: () => flowdesk.entities.LeadComercial.list('-created_date'),
  });

  const { data: pessoas = [] } = useQuery({
    queryKey: ['pessoas'],
    queryFn: () => flowdesk.entities.Pessoa.list(),
  });

  const createLPMutation = useMutation({
    mutationFn: (data) => flowdesk.entities.LandingPage.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['landing-pages'] });
      closeLPDialog();
    },
  });

  const updateLPMutation = useMutation({
    mutationFn: ({ id, data }) => flowdesk.entities.LandingPage.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['landing-pages'] });
      closeLPDialog();
    },
  });

  const deleteLPMutation = useMutation({
    mutationFn: (id) => flowdesk.entities.LandingPage.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['landing-pages'] });
    },
  });

  const createLeadMutation = useMutation({
    mutationFn: (data) => flowdesk.entities.LeadComercial.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads-comercial'] });
      closeLeadDialog();
    },
  });

  const updateLeadMutation = useMutation({
    mutationFn: ({ id, data }) => flowdesk.entities.LeadComercial.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads-comercial'] });
      closeLeadDialog();
    },
  });

  const deleteLeadMutation = useMutation({
    mutationFn: (id) => flowdesk.entities.LeadComercial.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads-comercial'] });
    },
  });

  const closeLPDialog = () => {
    setIsLPDialogOpen(false);
    setEditingLP(null);
    setLpFormData({
      nome: '',
      objetivo: 'BPC',
      url: '',
      leads_gerados: 0,
      taxa_conversao: 0,
      observacoes: '',
      status: 'Ativa',
      data_criacao: new Date().toISOString().split('T')[0],
      responsavel_id: '',
    });
  };

  const closeLeadDialog = () => {
    setIsLeadDialogOpen(false);
    setEditingLead(null);
    setLeadFormData({
      nome: '',
      contato: '',
      origem: '',
      landing_page_id: '',
      interesse: 'BPC',
      status: 'Novo',
      proxima_acao: '',
      data_proxima_acao: '',
      responsavel_id: '',
      observacoes: '',
      historico: [],
      valor_potencial: 0,
    });
  };

  const openEditLPDialog = (lp) => {
    setEditingLP(lp);
    setLpFormData(lp);
    setIsLPDialogOpen(true);
  };

  const openEditLeadDialog = (lead) => {
    setEditingLead(lead);
    setLeadFormData(lead);
    setIsLeadDialogOpen(true);
  };

  const handleLPSubmit = (e) => {
    e.preventDefault();
    if (editingLP) {
      updateLPMutation.mutate({ id: editingLP.id, data: lpFormData });
    } else {
      createLPMutation.mutate(lpFormData);
    }
  };

  const handleLeadSubmit = (e) => {
    e.preventDefault();
    if (editingLead) {
      updateLeadMutation.mutate({ id: editingLead.id, data: leadFormData });
    } else {
      createLeadMutation.mutate(leadFormData);
    }
  };

  const filteredLPs = landingPages.filter(lp => {
    const matchesSearch = lp.nome?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || lp.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusColors = {
    'Ativa': 'bg-emerald-100 text-emerald-700',
    'Pausada': 'bg-amber-100 text-amber-700',
    'Em Teste': 'bg-blue-100 text-blue-700',
    'Desativada': 'bg-slate-100 text-slate-700',
  };

  const leadStatusColors = {
    'Novo': 'bg-blue-100 text-blue-700',
    'Em Contato': 'bg-amber-100 text-amber-700',
    'Qualificado': 'bg-purple-100 text-purple-700',
    'Convertido': 'bg-emerald-100 text-emerald-700',
    'Perdido': 'bg-red-100 text-red-700',
    'Desqualificado': 'bg-slate-100 text-slate-700',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <Tabs defaultValue="landing-pages" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="landing-pages">Landing Pages</TabsTrigger>
            <TabsTrigger value="leads">Leads</TabsTrigger>
          </TabsList>

          <TabsContent value="landing-pages" className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-2xl font-bold text-slate-800 md:text-3xl flex items-center gap-2">
                  <Target className="h-8 w-8 text-purple-600" />
                  Landing Pages & Campanhas
                </h1>
                <p className="text-slate-500">Controle de captação e conversão</p>
              </div>
              <Button 
                onClick={() => setIsLPDialogOpen(true)}
                className="bg-gradient-to-r from-purple-600 to-pink-600"
              >
                <Plus className="mr-2 h-4 w-4" />
                Nova Landing Page
              </Button>
            </div>

            <div className="flex flex-col gap-4 md:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Buscar landing pages..."
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
                  <SelectItem value="Ativa">Ativa</SelectItem>
                  <SelectItem value="Pausada">Pausada</SelectItem>
                  <SelectItem value="Em Teste">Em Teste</SelectItem>
                  <SelectItem value="Desativada">Desativada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <AnimatePresence>
                {filteredLPs.map((lp, index) => (
                  <motion.div
                    key={lp.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: index * 0.05 }}
                    className="rounded-2xl border-2 border-slate-200 bg-white p-6 hover:shadow-lg transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <Badge className={statusColors[lp.status]}>{lp.status}</Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditLPDialog(lp)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => deleteLPMutation.mutate(lp.id)} className="text-red-600">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <h3 className="font-semibold text-slate-800 mb-2">{lp.nome}</h3>
                    <p className="text-xs text-slate-500 mb-3">{lp.objetivo}</p>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4 text-blue-500" />
                        <span className="font-semibold">{lp.leads_gerados || 0}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <TrendingUp className="h-4 w-4 text-emerald-500" />
                        <span className="font-semibold">{lp.taxa_conversao || 0}%</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </TabsContent>

          <TabsContent value="leads" className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-2xl font-bold text-slate-800 md:text-3xl flex items-center gap-2">
                  <Users className="h-8 w-8 text-indigo-600" />
                  Leads Comerciais
                </h1>
                <p className="text-slate-500">Funil de captação e conversão</p>
              </div>
              <Button 
                onClick={() => setIsLeadDialogOpen(true)}
                className="bg-gradient-to-r from-indigo-600 to-purple-600"
              >
                <Plus className="mr-2 h-4 w-4" />
                Novo Lead
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <AnimatePresence>
                {leads.map((lead, index) => (
                  <motion.div
                    key={lead.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: index * 0.05 }}
                    className="rounded-2xl border-2 border-slate-200 bg-white p-6 hover:shadow-lg transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <Badge className={leadStatusColors[lead.status]}>{lead.status}</Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditLeadDialog(lead)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => deleteLeadMutation.mutate(lead.id)} className="text-red-600">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <h3 className="font-semibold text-slate-800 mb-2">{lead.nome}</h3>
                    <p className="text-sm text-slate-600 mb-1">{lead.contato}</p>
                    <p className="text-xs text-slate-500 mb-3">{lead.interesse}</p>
                    {lead.proxima_acao && (
                      <p className="text-xs text-amber-600">📌 {lead.proxima_acao}</p>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </TabsContent>
        </Tabs>

        {/* Dialog Landing Page */}
        <Dialog open={isLPDialogOpen} onOpenChange={setIsLPDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingLP ? 'Editar Landing Page' : 'Nova Landing Page'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleLPSubmit} className="space-y-4">
              <div>
                <Label>Nome *</Label>
                <Input
                  value={lpFormData.nome}
                  onChange={(e) => setLpFormData({...lpFormData, nome: e.target.value})}
                  required
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Objetivo *</Label>
                  <Select value={lpFormData.objetivo} onValueChange={(value) => setLpFormData({...lpFormData, objetivo: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BPC">BPC</SelectItem>
                      <SelectItem value="Aposentadoria">Aposentadoria</SelectItem>
                      <SelectItem value="Revisão">Revisão</SelectItem>
                      <SelectItem value="INSS">INSS</SelectItem>
                      <SelectItem value="Família">Família</SelectItem>
                      <SelectItem value="Trabalhista">Trabalhista</SelectItem>
                      <SelectItem value="Outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={lpFormData.status} onValueChange={(value) => setLpFormData({...lpFormData, status: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Ativa">Ativa</SelectItem>
                      <SelectItem value="Pausada">Pausada</SelectItem>
                      <SelectItem value="Em Teste">Em Teste</SelectItem>
                      <SelectItem value="Desativada">Desativada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>URL da Landing Page</Label>
                <Input
                  value={lpFormData.url}
                  onChange={(e) => setLpFormData({...lpFormData, url: e.target.value})}
                  placeholder="https://..."
                />
              </div>
              <div>
                <Label>Observações</Label>
                <Textarea
                  value={lpFormData.observacoes}
                  onChange={(e) => setLpFormData({...lpFormData, observacoes: e.target.value})}
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={closeLPDialog}>Cancelar</Button>
                <Button type="submit" className="bg-purple-600">
                  {editingLP ? 'Salvar' : 'Criar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Dialog Lead */}
        <Dialog open={isLeadDialogOpen} onOpenChange={setIsLeadDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingLead ? 'Editar Lead' : 'Novo Lead'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleLeadSubmit} className="space-y-4">
              <div>
                <Label>Nome *</Label>
                <Input
                  value={leadFormData.nome}
                  onChange={(e) => setLeadFormData({...leadFormData, nome: e.target.value})}
                  required
                />
              </div>
              <div>
                <Label>Contato *</Label>
                <Input
                  value={leadFormData.contato}
                  onChange={(e) => setLeadFormData({...leadFormData, contato: e.target.value})}
                  placeholder="Telefone ou email"
                  required
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Interesse</Label>
                  <Select value={leadFormData.interesse} onValueChange={(value) => setLeadFormData({...leadFormData, interesse: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BPC">BPC</SelectItem>
                      <SelectItem value="Aposentadoria">Aposentadoria</SelectItem>
                      <SelectItem value="Revisão">Revisão</SelectItem>
                      <SelectItem value="INSS">INSS</SelectItem>
                      <SelectItem value="Família">Família</SelectItem>
                      <SelectItem value="Trabalhista">Trabalhista</SelectItem>
                      <SelectItem value="Outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={leadFormData.status} onValueChange={(value) => setLeadFormData({...leadFormData, status: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Novo">Novo</SelectItem>
                      <SelectItem value="Em Contato">Em Contato</SelectItem>
                      <SelectItem value="Qualificado">Qualificado</SelectItem>
                      <SelectItem value="Convertido">Convertido</SelectItem>
                      <SelectItem value="Perdido">Perdido</SelectItem>
                      <SelectItem value="Desqualificado">Desqualificado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Próxima Ação</Label>
                <Input
                  value={leadFormData.proxima_acao}
                  onChange={(e) => setLeadFormData({...leadFormData, proxima_acao: e.target.value})}
                  placeholder="Ex: Ligar para agendar reunião"
                />
              </div>
              <div>
                <Label>Observações</Label>
                <Textarea
                  value={leadFormData.observacoes}
                  onChange={(e) => setLeadFormData({...leadFormData, observacoes: e.target.value})}
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={closeLeadDialog}>Cancelar</Button>
                <Button type="submit" className="bg-indigo-600">
                  {editingLead ? 'Salvar' : 'Criar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}