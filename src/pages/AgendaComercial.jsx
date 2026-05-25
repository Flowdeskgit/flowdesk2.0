import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { flowdesk } from '@/api/flowdeskClient';
import { Calendar } from '@/components/ui/calendar';
import { ptBR } from 'date-fns/locale';
import { format, isSameDay } from 'date-fns';
import { motion } from 'framer-motion';
import { Plus, Calendar as CalendarIcon, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';

export default function AgendaComercial() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEvento, setEditingEvento] = useState(null);
  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    tipo: 'Post',
    data_hora: '',
    post_id: '',
    lead_id: '',
    landing_page_id: '',
    responsavel_id: '',
    status: 'Pendente',
    observacoes: '',
    cor: '#8B5CF6',
  });

  const queryClient = useQueryClient();

  const { data: eventos = [] } = useQuery({
    queryKey: ['agenda-comercial'],
    queryFn: () => flowdesk.entities.AgendaComercial.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => flowdesk.entities.AgendaComercial.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agenda-comercial'] });
      closeDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => flowdesk.entities.AgendaComercial.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agenda-comercial'] });
      closeDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => flowdesk.entities.AgendaComercial.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agenda-comercial'] });
    },
  });

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingEvento(null);
    setFormData({
      titulo: '',
      descricao: '',
      tipo: 'Post',
      data_hora: '',
      post_id: '',
      lead_id: '',
      landing_page_id: '',
      responsavel_id: '',
      status: 'Pendente',
      observacoes: '',
      cor: '#8B5CF6',
    });
  };

  const openEditDialog = (evento) => {
    setEditingEvento(evento);
    setFormData(evento);
    setIsDialogOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingEvento) {
      updateMutation.mutate({ id: editingEvento.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const eventosDodia = eventos.filter(evento => 
    isSameDay(new Date(evento.data_hora), selectedDate)
  );

  const tipoColors = {
    'Post': 'bg-purple-100 text-purple-700 border-purple-300',
    'Follow-up': 'bg-blue-100 text-blue-700 border-blue-300',
    'Evento': 'bg-emerald-100 text-emerald-700 border-emerald-300',
    'Revisão Estratégica': 'bg-amber-100 text-amber-700 border-amber-300',
    'Campanha': 'bg-pink-100 text-pink-700 border-pink-300',
    'Reunião': 'bg-indigo-100 text-indigo-700 border-indigo-300',
  };

  const statusColors = {
    'Pendente': 'bg-slate-100 text-slate-700',
    'Realizado': 'bg-emerald-100 text-emerald-700',
    'Cancelado': 'bg-red-100 text-red-700',
    'Reagendado': 'bg-amber-100 text-amber-700',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 md:text-3xl flex items-center gap-2">
              <CalendarIcon className="h-8 w-8 text-indigo-600" />
              Agenda Comercial & Marketing
            </h1>
            <p className="text-slate-500">Cronograma de posts, follow-ups e eventos</p>
          </div>
          <Button 
            onClick={() => {
              setFormData({
                ...formData,
                data_hora: selectedDate.toISOString()
              });
              setIsDialogOpen(true);
            }}
            className="bg-gradient-to-r from-indigo-600 to-purple-600"
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo Evento
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="rounded-2xl border-2 border-slate-200 bg-white p-6"
          >
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              locale={ptBR}
              className="w-full"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="rounded-2xl border-2 border-slate-200 bg-white p-6"
          >
            <h2 className="text-xl font-semibold text-slate-800 mb-4">
              {format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </h2>
            <div className="space-y-3">
              {eventosDodia.length === 0 ? (
                <p className="text-center text-slate-400 py-8">Nenhum evento neste dia</p>
              ) : (
                eventosDodia.map(evento => (
                  <div
                    key={evento.id}
                    className={`rounded-xl border-2 p-4 ${tipoColors[evento.tipo]}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={statusColors[evento.status]}>{evento.status}</Badge>
                          <span className="text-xs text-slate-600">
                            {format(new Date(evento.data_hora), 'HH:mm')}
                          </span>
                        </div>
                        <h3 className="font-semibold text-slate-800">{evento.titulo}</h3>
                        <p className="text-sm text-slate-600 mt-1">{evento.descricao}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEditDialog(evento)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-600"
                          onClick={() => deleteMutation.mutate(evento.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingEvento ? 'Editar Evento' : 'Novo Evento'}</DialogTitle>
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
                  <Label>Tipo *</Label>
                  <Select value={formData.tipo} onValueChange={(value) => setFormData({...formData, tipo: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Post">Post</SelectItem>
                      <SelectItem value="Follow-up">Follow-up</SelectItem>
                      <SelectItem value="Evento">Evento</SelectItem>
                      <SelectItem value="Revisão Estratégica">Revisão Estratégica</SelectItem>
                      <SelectItem value="Campanha">Campanha</SelectItem>
                      <SelectItem value="Reunião">Reunião</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pendente">Pendente</SelectItem>
                      <SelectItem value="Realizado">Realizado</SelectItem>
                      <SelectItem value="Cancelado">Cancelado</SelectItem>
                      <SelectItem value="Reagendado">Reagendado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Data e Hora *</Label>
                <Input
                  type="datetime-local"
                  value={formData.data_hora ? format(new Date(formData.data_hora), "yyyy-MM-dd'T'HH:mm") : ''}
                  onChange={(e) => setFormData({...formData, data_hora: new Date(e.target.value).toISOString()})}
                  required
                />
              </div>
              <div>
                <Label>Observações</Label>
                <Textarea
                  value={formData.observacoes}
                  onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
                  rows={2}
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={closeDialog}>Cancelar</Button>
                <Button type="submit" className="bg-indigo-600">
                  {editingEvento ? 'Salvar' : 'Criar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}