import React from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Badge } from '@/components/ui/badge';
import { Phone, MessageCircle, Edit, User, Calendar, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const ETAPAS = [
  { id: 'Novo', label: 'Novo Lead', color: 'bg-blue-100 border-blue-300 text-blue-800' },
  { id: 'Em Contato', label: 'Primeiro Contato', color: 'bg-purple-100 border-purple-300 text-purple-800' },
  { id: 'Qualificado', label: 'Qualificado', color: 'bg-amber-100 border-amber-300 text-amber-800' },
  { id: 'Convertido', label: 'Convertido', color: 'bg-emerald-100 border-emerald-300 text-emerald-800' },
  { id: 'Perdido', label: 'Perdido', color: 'bg-red-100 border-red-300 text-red-800' },
  { id: 'Desqualificado', label: 'Desqualificado', color: 'bg-slate-100 border-slate-300 text-slate-600' },
];

const etapaColors = {
  Novo: 'bg-blue-500',
  'Em Contato': 'bg-purple-500',
  Qualificado: 'bg-amber-500',
  Convertido: 'bg-emerald-500',
  Perdido: 'bg-red-500',
  Desqualificado: 'bg-slate-400',
};

export default function LeadKanban({ leads, pessoas, onUpdateLead, onEditLead }) {
  const getPessoaNome = (id) => pessoas.find((p) => p.id === id)?.nome || '—';

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const { draggableId, destination } = result;
    const lead = leads.find((l) => l.id === draggableId);
    if (!lead || lead.status === destination.droppableId) return;
    onUpdateLead(lead.id, { status: destination.droppableId });
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {ETAPAS.map((etapa) => {
          const etapaLeads = leads.filter((l) => l.status === etapa.id);
          return (
            <div key={etapa.id} className="flex-shrink-0 w-64">
              <div className={`flex items-center justify-between rounded-t-xl border px-3 py-2 ${etapa.color}`}>
                <span className="text-sm font-semibold">{etapa.label}</span>
                <Badge className={`${etapaColors[etapa.id]} text-white border-0 text-xs`}>{etapaLeads.length}</Badge>
              </div>

              <Droppable droppableId={etapa.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`min-h-32 rounded-b-xl border-x border-b border-slate-200 p-2 space-y-2 transition-colors ${
                      snapshot.isDraggingOver ? 'bg-slate-50' : 'bg-white'
                    }`}
                  >
                    {etapaLeads.map((lead, index) => (
                      <Draggable key={lead.id} draggableId={lead.id} index={index}>
                        {(prov, snap) => (
                          <div
                            ref={prov.innerRef}
                            {...prov.draggableProps}
                            {...prov.dragHandleProps}
                            className={`rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition-shadow ${
                              snap.isDragging ? 'shadow-lg rotate-1' : 'hover:shadow-md'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-1">
                              <p className="font-semibold text-slate-800 text-sm leading-tight">{lead.nome}</p>
                              <button
                                onClick={() => onEditLead(lead)}
                                className="text-slate-400 hover:text-slate-600 flex-shrink-0"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </button>
                            </div>

                            {lead.contato && (
                              <p className="text-xs text-slate-500 mt-1">{lead.contato}</p>
                            )}

                            {lead.interesse && (
                              <Badge variant="outline" className="text-xs mt-1 h-5">{lead.interesse}</Badge>
                            )}

                            {lead.origem && (
                              <p className="text-xs text-slate-400 mt-1">📍 {lead.origem}</p>
                            )}

                            {lead.responsavel_id && (
                              <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {getPessoaNome(lead.responsavel_id)}
                              </p>
                            )}

                            {lead.created_date && (
                              <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {format(new Date(lead.created_date), 'dd/MM', { locale: ptBR })}
                              </p>
                            )}

                            <div className="flex gap-1 mt-2">
                              {lead.contato && (
                                <>
                                  <a
                                    href={`tel:${lead.contato}`}
                                    className="flex-1 flex items-center justify-center gap-1 rounded-lg border border-slate-200 py-1 text-xs text-slate-600 hover:bg-slate-50"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Phone className="h-3 w-3" />
                                  </a>
                                  <a
                                    href={`https://wa.me/55${lead.contato.replace(/\D/g, '')}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex-1 flex items-center justify-center gap-1 rounded-lg border border-green-200 bg-green-50 py-1 text-xs text-green-700 hover:bg-green-100"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <MessageCircle className="h-3 w-3" />
                                  </a>
                                </>
                              )}
                              <button
                                onClick={() => onEditLead(lead)}
                                className="flex-1 flex items-center justify-center gap-1 rounded-lg border border-slate-200 py-1 text-xs text-slate-600 hover:bg-slate-50"
                              >
                                <ChevronRight className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}