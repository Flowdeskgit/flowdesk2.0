import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function EventoFormDialog({
  isOpen,
  onClose,
  editingItem,
  formData,
  setFormData,
  onSubmit,
  pessoas,
  getPessoaNome,
  isCreating,
  isUpdating,
}) {
  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingItem ? 'Detalhes do Evento' : 'Novo Evento'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Título *</Label>
            <Input
              value={formData.titulo}
              onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              rows={4}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data *</Label>
              <Input
                type="date"
                value={formData.data_evento}
                onChange={(e) => setFormData({ ...formData, data_evento: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo *</Label>
              <Select
                value={formData.tipo_evento}
                onValueChange={(value) => setFormData({ ...formData, tipo_evento: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Atendimento">Atendimento</SelectItem>
                  <SelectItem value="Audiência">Audiência</SelectItem>
                  <SelectItem value="Avaliação Social">Avaliação Social</SelectItem>
                  <SelectItem value="Perícia">Perícia</SelectItem>
                  <SelectItem value="Prazo processual">Prazo processual</SelectItem>
                  <SelectItem value="Reunião interna">Reunião interna</SelectItem>
                  <SelectItem value="Retorno ao cliente">Retorno ao cliente</SelectItem>
                  <SelectItem value="Outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Hora de Início *</Label>
              <Input
                type="time"
                value={formData.hora_inicio}
                onChange={(e) => setFormData({ ...formData, hora_inicio: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Hora de Término</Label>
              <Input
                type="time"
                value={formData.hora_termino}
                onChange={(e) => setFormData({ ...formData, hora_termino: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => setFormData({ ...formData, status: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Agendado">Agendado</SelectItem>
                <SelectItem value="Realizado">Realizado</SelectItem>
                <SelectItem value="Cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Responsável principal</Label>
            <Select
              value={formData.responsaveis_ids?.[0] || ''}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  responsaveis_ids: value ? [value] : [],
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o responsável..." />
              </SelectTrigger>
              <SelectContent>
                {pessoas.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {formData.responsaveis_ids?.length > 0 && (
              <p className="text-xs text-slate-500">
                Responsável atual: {getPessoaNome(formData.responsaveis_ids[0])}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea
              value={formData.observacoes}
              onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Fechar
            </Button>
            <Button
              type="submit"
              className="bg-slate-900 hover:bg-slate-800"
              disabled={isCreating || isUpdating}
            >
              {editingItem
                ? isUpdating
                  ? 'Salvando...'
                  : 'Salvar'
                : isCreating
                ? 'Criando...'
                : 'Criar Evento'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}