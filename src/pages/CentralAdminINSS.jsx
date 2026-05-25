import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { flowdesk } from '@/api/flowdeskClient';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Building2, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import AbaVisaoGeral from '@/components/inss/AbaVisaoGeral';
import AbaAgendamentos from '@/components/inss/AbaAgendamentos';
import AbaProtocolos from '@/components/inss/AbaProtocolos';
import AbaExigencias from '@/components/inss/AbaExigencias';
import AbaDeferidos from '@/components/inss/AbaDeferidos';
import AbaIndeferidos from '@/components/inss/AbaIndeferidos';
import AbaConcluidos from '@/components/inss/AbaConcluidos';
import AbaCredenciais from '@/components/inss/AbaCredenciais';
import AbaTarefasINSS from '@/components/inss/AbaTarefasINSS';

export default function CentralAdminINSS() {
  const urlParams = new URLSearchParams(window.location.search);
  const processoId = urlParams.get('processo_id');
  const user = useCurrentUser();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('visao-geral');
  const [search, setSearch] = useState('');
  const [selectedProcessoId, setSelectedProcessoId] = useState(null);

  const resolvedProcessoId = processoId || selectedProcessoId;

  const { data: todosProcessos = [] } = useQuery({
    queryKey: ['processos-selector'],
    queryFn: () => flowdesk.entities.Processo.list('-created_date', 500),
    enabled: !processoId,
  });

  const { data: todosClientes = [] } = useQuery({
    queryKey: ['clientes-selector'],
    queryFn: () => flowdesk.entities.Cliente.list('-created_date', 500),
    enabled: !processoId,
  });

  const { data: processo } = useQuery({
    queryKey: ['processo', resolvedProcessoId],
    queryFn: () => flowdesk.entities.Processo.filter({ id: resolvedProcessoId }),
    enabled: !!resolvedProcessoId,
    select: (data) => data?.[0],
  });

  const { data: cliente } = useQuery({
    queryKey: ['cliente', processo?.cliente_id],
    queryFn: () => flowdesk.entities.Cliente.filter({ id: processo?.cliente_id }),
    enabled: !!processo?.cliente_id,
    select: (data) => data?.[0],
  });

  const { data: central, isLoading: loadingCentral } = useQuery({
    queryKey: ['central-inss', resolvedProcessoId],
    queryFn: () => flowdesk.entities.CentralAdminINSS.filter({ processo_id: resolvedProcessoId }),
    enabled: !!resolvedProcessoId,
    select: (data) => data?.[0],
  });

  const criarCentralMutation = useMutation({
    mutationFn: (data) => flowdesk.entities.CentralAdminINSS.create(data),
    onSuccess: () => queryClient.invalidateQueries(['central-inss', resolvedProcessoId]),
  });

  useEffect(() => {
    if (!loadingCentral && !central && resolvedProcessoId && processo) {
      criarCentralMutation.mutate({
        processo_id: resolvedProcessoId,
        cliente_id: processo.cliente_id,
        status_administrativo_geral: 'Não iniciado',
        prioridade: 'Média',
        criado_por: user?.email || '',
        atualizado_por: user?.email || '',
      });
    }
  }, [loadingCentral, central, processoId, processo]);

  if (!resolvedProcessoId) {
    const getClienteNome = (id) => todosClientes.find(c => c.id === id)?.nome_completo || '—';
    const filtered = todosProcessos.filter(p =>
      [p.numero_processo, getClienteNome(p.cliente_id), p.tipo_processo].some(v =>
        (v || '').toLowerCase().includes(search.toLowerCase())
      )
    );

    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50/30 via-white to-pink-50/20 p-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <Building2 className="h-6 w-6 text-rose-600" />
            <h1 className="text-xl font-bold text-slate-800">Central Administrativa INSS</h1>
          </div>
          <p className="text-slate-500 mb-4 text-sm">Selecione um processo para abrir a Central Administrativa INSS:</p>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar por número, cliente, tipo..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="space-y-2">
            {filtered.length === 0 ? (
              <p className="text-center text-slate-400 py-10">Nenhum processo encontrado.</p>
            ) : filtered.map(p => (
              <button
                key={p.id}
                onClick={() => setSelectedProcessoId(p.id)}
                className="w-full text-left bg-white border border-slate-200 rounded-xl px-4 py-3 hover:border-rose-300 hover:bg-rose-50/40 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-800 text-sm">{p.numero_processo}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{getClienteNome(p.cliente_id)} · {p.tipo_processo}</p>
                  </div>
                  <Badge className="text-xs bg-slate-100 text-slate-600">{p.status}</Badge>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'visao-geral', label: 'Visão Geral' },
    { id: 'agendamentos', label: 'Agendamentos' },
    { id: 'protocolos', label: 'Protocolos' },
    { id: 'exigencias', label: 'Exigências' },
    { id: 'deferidos', label: 'Deferidos' },
    { id: 'indeferidos', label: 'Indeferidos' },
    { id: 'concluidos', label: 'Concluídos' },
    { id: 'credenciais', label: 'Credenciais' },
    { id: 'tarefas', label: 'Tarefas' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50/30 via-white to-pink-50/20 p-4 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Link to={`/Processos`}>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <Building2 className="h-6 w-6 text-rose-600" />
          <div>
            <h1 className="text-xl font-bold text-slate-800">Central Administrativa INSS</h1>
            {processo && (
              <p className="text-sm text-slate-500">
                Processo: <span className="font-medium text-slate-700">{processo.numero_processo}</span>
                {cliente && <> · Cliente: <span className="font-medium text-slate-700">{cliente.nome_completo}</span></>}
              </p>
            )}
          </div>
          {!processoId && selectedProcessoId && (
            <Button size="sm" variant="outline" className="ml-auto mr-2" onClick={() => setSelectedProcessoId(null)}>
              ← Trocar processo
            </Button>
          )}
          {central && (
            <Badge className={`${processoId ? 'ml-auto' : ''} ${
              central.prioridade === 'Urgente' ? 'bg-red-100 text-red-700' :
              central.prioridade === 'Alta' ? 'bg-orange-100 text-orange-700' :
              central.prioridade === 'Média' ? 'bg-yellow-100 text-yellow-700' :
              'bg-green-100 text-green-700'
            }`}>
              {central.prioridade}
            </Badge>
          )}

        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap h-auto gap-1 bg-white border border-rose-100 p-1 rounded-xl mb-6">
          {tabs.map(tab => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="text-xs data-[state=active]:bg-rose-600 data-[state=active]:text-white rounded-lg"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="visao-geral">
          <AbaVisaoGeral central={central} processoId={resolvedProcessoId} clienteId={processo?.cliente_id} user={user} />
        </TabsContent>
        <TabsContent value="agendamentos">
          <AbaAgendamentos processoId={resolvedProcessoId} centralId={central?.id} user={user} onTarefaCriada={() => setActiveTab('tarefas')} />
        </TabsContent>
        <TabsContent value="protocolos">
          <AbaProtocolos processoId={resolvedProcessoId} centralId={central?.id} user={user} />
        </TabsContent>
        <TabsContent value="exigencias">
          <AbaExigencias processoId={resolvedProcessoId} centralId={central?.id} user={user} onTarefaCriada={() => setActiveTab('tarefas')} />
        </TabsContent>
        <TabsContent value="deferidos">
          <AbaDeferidos processoId={resolvedProcessoId} centralId={central?.id} user={user} />
        </TabsContent>
        <TabsContent value="indeferidos">
          <AbaIndeferidos processoId={resolvedProcessoId} centralId={central?.id} user={user} onTarefaCriada={() => setActiveTab('tarefas')} />
        </TabsContent>
        <TabsContent value="concluidos">
          <AbaConcluidos processoId={resolvedProcessoId} centralId={central?.id} user={user} />
        </TabsContent>
        <TabsContent value="credenciais">
          <AbaCredenciais processoId={resolvedProcessoId} centralId={central?.id} user={user} />
        </TabsContent>
        <TabsContent value="tarefas">
          <AbaTarefasINSS processoId={resolvedProcessoId} centralId={central?.id} user={user} />
        </TabsContent>
      </Tabs>
    </div>
  );
}