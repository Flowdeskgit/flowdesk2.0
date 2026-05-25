import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { flowdesk } from '@/api/flowdeskClient';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Download, Trash2, FileText, User, Calendar } from 'lucide-react';

export default function DocumentosGeradosTab() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');

  const { data: documentos = [], isLoading } = useQuery({
    queryKey: ['documentos-gerados'],
    queryFn: () => flowdesk.entities.DocumentoGerado.list('-created_date', 200),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => flowdesk.entities.DocumentoGerado.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['documentos-gerados'] }),
  });

  const filtered = documentos.filter((d) => {
    const q = search.toLowerCase();
    return !q || [d.titulo, d.cliente_nome, d.nome_modelo].some((v) => (v || '').toLowerCase().includes(q));
  });

  if (isLoading) {
    return <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-slate-200 border-t-rose-600 rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Buscar documentos gerados..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <FileText className="h-12 w-12 opacity-20 mb-3" />
          <p className="text-sm">Nenhum documento gerado ainda.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((doc) => (
            <div key={doc.id} className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="h-10 w-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center flex-shrink-0">
                  <FileText className="h-5 w-5 text-rose-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800 text-sm truncate">{doc.titulo}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    {doc.cliente_nome && (
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <User className="h-3 w-3" />{doc.cliente_nome}
                      </span>
                    )}
                    {doc.nome_modelo && (
                      <Badge variant="outline" className="text-[10px] border-slate-200 text-slate-500">
                        {doc.nome_modelo}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-shrink-0">
                {doc.created_date && (
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(doc.created_date), "dd/MM/yyyy", { locale: ptBR })}
                  </span>
                )}
                <Badge variant="outline" className={`text-[10px] ${doc.status === 'finalizado' ? 'border-green-200 text-green-700' : 'border-slate-200 text-slate-500'}`}>
                  {doc.status}
                </Badge>

                <a href={doc.arquivo_url} target="_blank" rel="noopener noreferrer">
                  <Button size="icon" variant="outline" className="h-8 w-8 border-slate-200">
                    <Download className="h-3.5 w-3.5 text-slate-500" />
                  </Button>
                </a>

                <Button
                  size="icon"
                  variant="outline"
                  className="h-8 w-8 border-red-100"
                  onClick={() => {
                    if (window.confirm('Excluir este registro?')) deleteMutation.mutate(doc.id);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5 text-red-400" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}