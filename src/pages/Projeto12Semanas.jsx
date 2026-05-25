import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { flowdesk } from '@/api/flowdeskClient';
import { format, parseISO } from 'date-fns';
import {
  Plus,
  Target,
  TrendingDown,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Users,
  BarChart3,
  Download,
  Flag
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TabelaMetas from '../components/projeto12semanas/TabelaMetas';

export default function Projeto12Semanas() {
  const [cicloSelecionado, setCicloSelecionado] = useState(null);
  const [dialogCiclo, setDialogCiclo] = useState(false);
  const [dialogIndicador, setDialogIndicador] = useState(false);
  const [dialogAcao, setDialogAcao] = useState(false);
  const [dialogRevisao, setDialogRevisao] = useState(false);
  const [dialogFeedback, setDialogFeedback] = useState(false);
  const [editingCiclo, setEditingCiclo] = useState(null);
  const [editingIndicador, setEditingIndicador] = useState(null);
  const [indicadorParaAcao, setIndicadorParaAcao] = useState(null);

  const [formCiclo, setFormCiclo] = useState({
    nome: '',
    data_inicio: '',
    data_termino: '',
    status: 'Planejamento',
    objetivos_gerais: ''
  });

  const [formIndicador, setFormIndicador] = useState({
    nome: '',
    setor: 'Atendimento',
    responsavel_id: '',
    meta_definida: 0,
    unidade_medida: 'Quantidade',
    resultado_atual: 0,
    calculo_automatico: false,
    fonte_dados: ''
  });

  const [formAcao, setFormAcao] = useState({
    acao_definida: '',
    responsavel_id: '',
    prazo: '',
    status_acao: 'Pendente'
  });

  const [formRevisao, setFormRevisao] = useState({
    setor: 'Atendimento',
    pontos_fortes: '',
    pontos_melhoria: '',
    ajustes_necessarios: '',
    decisoes_estrategicas: '',
    analise_desempenho: ''
  });

  const [formFeedback, setFormFeedback] = useState({
    tipo_feedback: 'Individual',
    usuario_avaliado_id: '',
    setor_avaliado: '',
    observacoes: '',
    pontuacao: 0
  });

  const queryClient = useQueryClient();

  const { data: ciclos = [] } = useQuery({
    queryKey: ['ciclos-12-semanas'],
    queryFn: () => flowdesk.entities.Ciclo12Semanas.list('-created_date'),
  });

  const { data: indicadores = [] } = useQuery({
    queryKey: ['indicadores-12-semanas', cicloSelecionado?.id],
    queryFn: () => cicloSelecionado 
      ? flowdesk.entities.Indicador12Semanas.filter({ ciclo_id: cicloSelecionado.id })
      : Promise.resolve([]),
    enabled: !!cicloSelecionado,
  });

  const { data: acoes = [] } = useQuery({
    queryKey: ['acoes-12-semanas', cicloSelecionado?.id],
    queryFn: () => cicloSelecionado
      ? flowdesk.entities.AcaoCorretiva12Semanas.filter({ ciclo_id: cicloSelecionado.id })
      : Promise.resolve([]),
    enabled: !!cicloSelecionado,
  });

  const { data: revisoes = [] } = useQuery({
    queryKey: ['revisoes-12-semanas', cicloSelecionado?.id],
    queryFn: () => cicloSelecionado
      ? flowdesk.entities.RevisaoEstrategica12Semanas.filter({ ciclo_id: cicloSelecionado.id })
      : Promise.resolve([]),
    enabled: !!cicloSelecionado,
  });

  const { data: pessoas = [] } = useQuery({
    queryKey: ['pessoas'],
    queryFn: () => flowdesk.entities.Pessoa.list(),
  });

  // Buscar dados de outros módulos para alimentar indicadores automáticos
  const { data: atendimentos = [] } = useQuery({
    queryKey: ['atendimentos'],
    queryFn: () => flowdesk.entities.Atendimento.list(),
  });

  const { data: tarefas = [] } = useQuery({
    queryKey: ['tarefas'],
    queryFn: () => flowdesk.entities.Tarefa.list(),
  });

  const { data: eventos = [] } = useQuery({
    queryKey: ['agenda'],
    queryFn: () => flowdesk.entities.Agenda.list(),
  });

  const { data: metas = [] } = useQuery({
    queryKey: ['metas-ciclo', cicloSelecionado?.id],
    queryFn: () => cicloSelecionado
      ? flowdesk.entities.MetaCiclo12Semanas.filter({ ciclo_id: cicloSelecionado.id })
      : Promise.resolve([]),
    enabled: !!cicloSelecionado,
  });

  // Mutations
  const createCicloMutation = useMutation({
    mutationFn: (data) => flowdesk.entities.Ciclo12Semanas.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ciclos-12-semanas'] });
      setDialogCiclo(false);
      resetFormCiclo();
    },
  });

  const updateCicloMutation = useMutation({
    mutationFn: ({ id, data }) => flowdesk.entities.Ciclo12Semanas.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ciclos-12-semanas'] });
      setDialogCiclo(false);
      resetFormCiclo();
    },
  });

  const createIndicadorMutation = useMutation({
    mutationFn: (data) => flowdesk.entities.Indicador12Semanas.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['indicadores-12-semanas'] });
      setDialogIndicador(false);
      resetFormIndicador();
    },
  });

  const updateIndicadorMutation = useMutation({
    mutationFn: ({ id, data }) => flowdesk.entities.Indicador12Semanas.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['indicadores-12-semanas'] });
      setDialogIndicador(false);
      resetFormIndicador();
    },
  });

  const createAcaoMutation = useMutation({
    mutationFn: (data) => flowdesk.entities.AcaoCorretiva12Semanas.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['acoes-12-semanas'] });
      setDialogAcao(false);
      resetFormAcao();
    },
  });

  const createRevisaoMutation = useMutation({
    mutationFn: (data) => flowdesk.entities.RevisaoEstrategica12Semanas.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['revisoes-12-semanas'] });
      setDialogRevisao(false);
      resetFormRevisao();
    },
  });

  const createFeedbackMutation = useMutation({
    mutationFn: (data) => flowdesk.entities.Feedback12Semanas.create(data),
    onSuccess: () => {
      setDialogFeedback(false);
      resetFormFeedback();
    },
  });

  // Calcular resultado automático de indicadores
  useEffect(() => {
    if (cicloSelecionado && indicadores.length > 0) {
      indicadores.forEach(async (ind) => {
        if (ind.calculo_automatico && ind.fonte_dados) {
          let resultado = 0;
          
          if (ind.fonte_dados === 'Atendimento') {
            resultado = atendimentos.filter(a => 
              a.status === 'Concluído' && 
              a.created_date >= cicloSelecionado.data_inicio &&
              a.created_date <= cicloSelecionado.data_termino
            ).length;
          } else if (ind.fonte_dados === 'Tarefa') {
            resultado = tarefas.filter(t => 
              t.status === 'Concluída' &&
              t.created_date >= cicloSelecionado.data_inicio &&
              t.created_date <= cicloSelecionado.data_termino
            ).length;
          } else if (ind.fonte_dados === 'Agenda') {
            resultado = eventos.filter(e => 
              e.status === 'Realizado' &&
              e.data_evento >= cicloSelecionado.data_inicio &&
              e.data_evento <= cicloSelecionado.data_termino
            ).length;
          }

          const percentual = ind.meta_definida > 0 ? (resultado / ind.meta_definida) * 100 : 0;
          let status_indicador = 'Em atenção';
          if (percentual >= 100) status_indicador = 'Dentro da meta';
          else if (percentual < 70) status_indicador = 'Fora da meta';

          if (resultado !== ind.resultado_atual || percentual !== ind.percentual_atingimento) {
            await flowdesk.entities.Indicador12Semanas.update(ind.id, {
              ...ind,
              resultado_atual: resultado,
              percentual_atingimento: Math.round(percentual),
              status_indicador
            });
            queryClient.invalidateQueries({ queryKey: ['indicadores-12-semanas'] });
          }
        }
      });
    }
  }, [cicloSelecionado, indicadores, atendimentos, tarefas, eventos]);

  const resetFormCiclo = () => {
    setFormCiclo({
      nome: '',
      data_inicio: '',
      data_termino: '',
      status: 'Planejamento',
      objetivos_gerais: ''
    });
    setEditingCiclo(null);
  };

  const resetFormIndicador = () => {
    setFormIndicador({
      nome: '',
      setor: 'Atendimento',
      responsavel_id: '',
      meta_definida: 0,
      unidade_medida: 'Quantidade',
      resultado_atual: 0,
      calculo_automatico: false,
      fonte_dados: ''
    });
    setEditingIndicador(null);
  };

  const resetFormAcao = () => {
    setFormAcao({
      acao_definida: '',
      responsavel_id: '',
      prazo: '',
      status_acao: 'Pendente'
    });
    setIndicadorParaAcao(null);
  };

  const resetFormRevisao = () => {
    setFormRevisao({
      setor: 'Atendimento',
      pontos_fortes: '',
      pontos_melhoria: '',
      ajustes_necessarios: '',
      decisoes_estrategicas: '',
      analise_desempenho: ''
    });
  };

  const resetFormFeedback = () => {
    setFormFeedback({
      tipo_feedback: 'Individual',
      usuario_avaliado_id: '',
      setor_avaliado: '',
      observacoes: '',
      pontuacao: 0
    });
  };

  const handleSubmitCiclo = (e) => {
    e.preventDefault();
    if (editingCiclo) {
      updateCicloMutation.mutate({ id: editingCiclo.id, data: formCiclo });
    } else {
      createCicloMutation.mutate(formCiclo);
    }
  };

  const handleSubmitIndicador = (e) => {
    e.preventDefault();
    const data = {
      ...formIndicador,
      ciclo_id: cicloSelecionado.id,
      percentual_atingimento: formIndicador.meta_definida > 0 
        ? Math.round((formIndicador.resultado_atual / formIndicador.meta_definida) * 100)
        : 0
    };

    if (editingIndicador) {
      updateIndicadorMutation.mutate({ id: editingIndicador.id, data });
    } else {
      createIndicadorMutation.mutate(data);
    }
  };

  const handleSubmitAcao = (e) => {
    e.preventDefault();
    const data = {
      ...formAcao,
      indicador_id: indicadorParaAcao.id,
      ciclo_id: cicloSelecionado.id
    };
    createAcaoMutation.mutate(data);
  };

  const handleSubmitRevisao = (e) => {
    e.preventDefault();
    const data = {
      ...formRevisao,
      ciclo_id: cicloSelecionado.id
    };
    createRevisaoMutation.mutate(data);
  };

  const handleSubmitFeedback = (e) => {
    e.preventDefault();
    const data = {
      ...formFeedback,
      ciclo_id: cicloSelecionado.id
    };
    createFeedbackMutation.mutate(data);
  };

  const getPessoaNome = (id) => {
    const pessoa = pessoas.find(p => p.id === id);
    return pessoa?.nome || '-';
  };

  const getCorIndicador = (indicador) => {
    if (indicador.cor_manual) return indicador.cor_manual;
    
    if (indicador.status_indicador === 'Dentro da meta') return 'bg-green-500';
    if (indicador.status_indicador === 'Em atenção') return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const gerarRelatorio = async () => {
    if (!cicloSelecionado) return;

    const { jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    // Título
    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    doc.text('PROJETO 12 SEMANAS', pageWidth / 2, 20, { align: 'center' });
    doc.setFontSize(14);
    doc.text(cicloSelecionado.nome, pageWidth / 2, 30, { align: 'center' });

    // Info do ciclo
    let yPos = 45;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Período: ${format(parseISO(cicloSelecionado.data_inicio), 'dd/MM/yyyy')} - ${format(parseISO(cicloSelecionado.data_termino), 'dd/MM/yyyy')}`, 14, yPos);
    yPos += 6;
    doc.text(`Status: ${cicloSelecionado.status}`, 14, yPos);
    yPos += 6;
    doc.text(`Data do Relatório: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, yPos);

    // Resumo executivo
    yPos += 15;
    doc.setFont(undefined, 'bold');
    doc.setFontSize(12);
    doc.text('RESUMO EXECUTIVO', 14, yPos);
    yPos += 8;

    const totalIndicadores = indicadores.length;
    const dentroDaMeta = indicadores.filter(i => i.status_indicador === 'Dentro da meta').length;
    const emAtencao = indicadores.filter(i => i.status_indicador === 'Em atenção').length;
    const foraDaMeta = indicadores.filter(i => i.status_indicador === 'Fora da meta').length;

    doc.setFont(undefined, 'normal');
    doc.setFontSize(10);
    doc.text(`Total de Indicadores: ${totalIndicadores}`, 14, yPos);
    yPos += 6;
    doc.text(`✓ Dentro da Meta: ${dentroDaMeta}`, 14, yPos);
    yPos += 6;
    doc.text(`⚠ Em Atenção: ${emAtencao}`, 14, yPos);
    yPos += 6;
    doc.text(`✗ Fora da Meta: ${foraDaMeta}`, 14, yPos);

    // Tabela de indicadores
    yPos += 15;
    doc.setFont(undefined, 'bold');
    doc.setFontSize(12);
    doc.text('INDICADORES POR SETOR', 14, yPos);
    yPos += 8;

    const tableData = indicadores.map(ind => [
      ind.setor,
      ind.nome,
      ind.meta_definida.toString(),
      ind.resultado_atual.toString(),
      `${ind.percentual_atingimento}%`,
      ind.status_indicador
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Setor', 'Indicador', 'Meta', 'Resultado', '%', 'Status']],
      body: tableData,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [71, 85, 105], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] }
    });

    // Ações corretivas
    if (acoes.length > 0) {
      doc.addPage();
      yPos = 20;
      doc.setFont(undefined, 'bold');
      doc.setFontSize(12);
      doc.text('AÇÕES CORRETIVAS', 14, yPos);
      yPos += 8;

      const acoesData = acoes.map(acao => [
        acao.acao_definida.substring(0, 50),
        getPessoaNome(acao.responsavel_id),
        format(parseISO(acao.prazo), 'dd/MM/yyyy'),
        acao.status_acao
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [['Ação', 'Responsável', 'Prazo', 'Status']],
        body: acoesData,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [71, 85, 105], fontStyle: 'bold' }
      });
    }

    // Rodapé
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.text(`Página ${i} de ${pageCount}`, pageWidth / 2, doc.internal.pageSize.height - 10, { align: 'center' });
      doc.text('MCR ADVOCACIA - FlowDesk', pageWidth / 2, doc.internal.pageSize.height - 5, { align: 'center' });
    }

    doc.save(`projeto_12_semanas_${cicloSelecionado.nome.replace(/\s/g, '_')}.pdf`);
  };

  // Agrupar indicadores por setor
  const indicadoresPorSetor = indicadores.reduce((acc, ind) => {
    if (!acc[ind.setor]) acc[ind.setor] = [];
    acc[ind.setor].push(ind);
    return acc;
  }, {});

  const setores = ['Atendimento', 'Administrativo', 'Marketing', 'Financeiro', 'Operacional', 'CEO/Estratégico'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50/30 to-purple-50/20 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 md:text-3xl flex items-center gap-2">
              <Target className="h-8 w-8 text-indigo-600" />
              Projeto 12 Semanas
            </h1>
            <p className="text-slate-500">Planejamento estratégico por ciclos de 12 semanas</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setDialogCiclo(true)}
              className="bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800"
            >
              <Plus className="mr-2 h-4 w-4" />
              Novo Ciclo
            </Button>
            {cicloSelecionado && (
              <Button
                onClick={gerarRelatorio}
                variant="outline"
              >
                <Download className="mr-2 h-4 w-4" />
                Relatório PDF
              </Button>
            )}
          </div>
        </div>

        {/* Seletor de Ciclo */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Selecionar Ciclo</CardTitle>
          </CardHeader>
          <CardContent>
            <Select 
              value={cicloSelecionado?.id || ''} 
              onValueChange={(value) => {
                const ciclo = ciclos.find(c => c.id === value);
                setCicloSelecionado(ciclo);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Escolha um ciclo de 12 semanas..." />
              </SelectTrigger>
              <SelectContent>
                {ciclos.map(ciclo => (
                  <SelectItem key={ciclo.id} value={ciclo.id}>
                    {ciclo.nome} ({ciclo.status})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {cicloSelecionado && (
          <>
            {/* Dashboard Visual */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-green-800">Dentro da Meta</CardTitle>
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-700">
                    {indicadores.filter(i => i.status_indicador === 'Dentro da meta').length}
                  </div>
                  <p className="text-xs text-green-600 mt-1">indicadores</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-200">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-yellow-800">Em Atenção</CardTitle>
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-yellow-700">
                    {indicadores.filter(i => i.status_indicador === 'Em atenção').length}
                  </div>
                  <p className="text-xs text-yellow-600 mt-1">indicadores</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-red-50 to-rose-50 border-red-200">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-red-800">Fora da Meta</CardTitle>
                  <TrendingDown className="h-5 w-5 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-red-700">
                    {indicadores.filter(i => i.status_indicador === 'Fora da meta').length}
                  </div>
                  <p className="text-xs text-red-600 mt-1">indicadores</p>
                </CardContent>
              </Card>
            </div>

            {/* Tabela de Metas */}
            <TabelaMetas cicloId={cicloSelecionado.id} metas={metas} />

            {/* Tabs */}
             <Tabs defaultValue="indicadores" className="space-y-4">
               <TabsList className="grid w-full grid-cols-5">
                 <TabsTrigger value="metas">Metas</TabsTrigger>
                 <TabsTrigger value="indicadores">Indicadores</TabsTrigger>
                 <TabsTrigger value="acoes">Ações Corretivas</TabsTrigger>
                 <TabsTrigger value="revisao">Revisão</TabsTrigger>
                 <TabsTrigger value="feedback">Feedback</TabsTrigger>
               </TabsList>

               {/* Metas */}
               <TabsContent value="metas" className="space-y-4">
                 {/* Removido - tabela já está exibida acima */}
               </TabsContent>

               {/* Indicadores por Setor */}
              <TabsContent value="indicadores" className="space-y-4">
                <div className="flex justify-end">
                  <Button
                    onClick={() => setDialogIndicador(true)}
                    size="sm"
                    className="bg-indigo-600 hover:bg-indigo-700"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Novo Indicador
                  </Button>
                </div>

                {setores.map(setor => {
                  const indicadoresSetor = indicadoresPorSetor[setor] || [];
                  if (indicadoresSetor.length === 0) return null;

                  return (
                    <Card key={setor}>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <BarChart3 className="h-5 w-5 text-indigo-600" />
                          {setor}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {indicadoresSetor.map(ind => (
                          <div key={ind.id} className="flex items-center gap-4 p-4 rounded-lg border bg-white">
                            <div className={`w-3 h-12 rounded ${getCorIndicador(ind)}`}></div>
                            <div className="flex-1">
                              <h4 className="font-semibold text-slate-800">{ind.nome}</h4>
                              <p className="text-sm text-slate-500">Responsável: {getPessoaNome(ind.responsavel_id)}</p>
                              <div className="flex items-center gap-4 mt-2 text-sm">
                                <span>Meta: <strong>{ind.meta_definida}</strong></span>
                                <span>Atual: <strong>{ind.resultado_atual}</strong></span>
                                <Badge className={ind.percentual_atingimento >= 100 ? 'bg-green-600' : ind.percentual_atingimento >= 70 ? 'bg-yellow-600' : 'bg-red-600'}>
                                  {ind.percentual_atingimento}%
                                </Badge>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setIndicadorParaAcao(ind);
                                setDialogAcao(true);
                              }}
                            >
                              <Flag className="h-4 w-4 mr-2" />
                              Ação Corretiva
                            </Button>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  );
                })}
              </TabsContent>

              {/* Ações Corretivas */}
              <TabsContent value="acoes" className="space-y-3">
                {acoes.map(acao => {
                  const indicador = indicadores.find(i => i.id === acao.indicador_id);
                  return (
                    <Card key={acao.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold text-slate-800">{acao.acao_definida}</h4>
                            <p className="text-sm text-slate-500 mt-1">Indicador: {indicador?.nome}</p>
                            <div className="flex items-center gap-4 mt-2 text-sm">
                              <span className="flex items-center gap-1">
                                <Users className="h-4 w-4" />
                                {getPessoaNome(acao.responsavel_id)}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                {format(parseISO(acao.prazo), 'dd/MM/yyyy')}
                              </span>
                              <Badge>{acao.status_acao}</Badge>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                {acoes.length === 0 && (
                  <div className="text-center py-12 text-slate-400">
                    <Flag className="h-12 w-12 mx-auto mb-4" />
                    <p>Nenhuma ação corretiva registrada</p>
                  </div>
                )}
              </TabsContent>

              {/* Revisão Estratégica */}
              <TabsContent value="revisao" className="space-y-4">
                <Button
                  onClick={() => setDialogRevisao(true)}
                  size="sm"
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Revisão
                </Button>

                {revisoes.map(rev => (
                  <Card key={rev.id}>
                    <CardHeader>
                      <CardTitle className="text-lg">{rev.setor}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <Label className="text-sm font-semibold text-green-700">Pontos Fortes:</Label>
                        <p className="text-sm text-slate-600 mt-1">{rev.pontos_fortes}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-semibold text-red-700">Pontos de Melhoria:</Label>
                        <p className="text-sm text-slate-600 mt-1">{rev.pontos_melhoria}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-semibold text-blue-700">Ajustes Necessários:</Label>
                        <p className="text-sm text-slate-600 mt-1">{rev.ajustes_necessarios}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-semibold text-purple-700">Decisões Estratégicas:</Label>
                        <p className="text-sm text-slate-600 mt-1">{rev.decisoes_estrategicas}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              {/* Feedback */}
              <TabsContent value="feedback">
                <Button
                  onClick={() => setDialogFeedback(true)}
                  size="sm"
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Feedback
                </Button>
              </TabsContent>
            </Tabs>
          </>
        )}

        {/* Dialog Novo Ciclo */}
        <Dialog open={dialogCiclo} onOpenChange={setDialogCiclo}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Ciclo de 12 Semanas</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmitCiclo} className="space-y-4">
              <div className="space-y-2">
                <Label>Nome do Ciclo *</Label>
                <Input
                  value={formCiclo.nome}
                  onChange={(e) => setFormCiclo({ ...formCiclo, nome: e.target.value })}
                  placeholder="Ex: 12 Semanas – Jan/Mar 2026"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data Início *</Label>
                  <Input
                    type="date"
                    value={formCiclo.data_inicio}
                    onChange={(e) => setFormCiclo({ ...formCiclo, data_inicio: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data Término *</Label>
                  <Input
                    type="date"
                    value={formCiclo.data_termino}
                    onChange={(e) => setFormCiclo({ ...formCiclo, data_termino: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={formCiclo.status}
                  onValueChange={(value) => setFormCiclo({ ...formCiclo, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Planejamento">Planejamento</SelectItem>
                    <SelectItem value="Em execução">Em execução</SelectItem>
                    <SelectItem value="Em revisão">Em revisão</SelectItem>
                    <SelectItem value="Concluído">Concluído</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Objetivos Gerais</Label>
                <Textarea
                  value={formCiclo.objetivos_gerais}
                  onChange={(e) => setFormCiclo({ ...formCiclo, objetivos_gerais: e.target.value })}
                  rows={3}
                  placeholder="Descreva os objetivos gerais deste ciclo..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogCiclo(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">
                  Criar Ciclo
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Dialog Novo Indicador */}
        <Dialog open={dialogIndicador} onOpenChange={setDialogIndicador}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Novo Indicador</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmitIndicador} className="space-y-4">
              <div className="space-y-2">
                <Label>Nome do Indicador *</Label>
                <Input
                  value={formIndicador.nome}
                  onChange={(e) => setFormIndicador({ ...formIndicador, nome: e.target.value })}
                  placeholder="Ex: Atendimentos Concluídos"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Setor *</Label>
                  <Select
                    value={formIndicador.setor}
                    onValueChange={(value) => setFormIndicador({ ...formIndicador, setor: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Atendimento">Atendimento</SelectItem>
                      <SelectItem value="Administrativo">Administrativo</SelectItem>
                      <SelectItem value="Marketing">Marketing</SelectItem>
                      <SelectItem value="Financeiro">Financeiro</SelectItem>
                      <SelectItem value="Operacional">Operacional</SelectItem>
                      <SelectItem value="CEO/Estratégico">CEO/Estratégico</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Responsável *</Label>
                  <Select
                    value={formIndicador.responsavel_id}
                    onValueChange={(value) => setFormIndicador({ ...formIndicador, responsavel_id: value })}
                  >
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
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Meta Definida *</Label>
                  <Input
                    type="number"
                    value={formIndicador.meta_definida}
                    onChange={(e) => setFormIndicador({ ...formIndicador, meta_definida: parseFloat(e.target.value) })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Unidade de Medida</Label>
                  <Select
                    value={formIndicador.unidade_medida}
                    onValueChange={(value) => setFormIndicador({ ...formIndicador, unidade_medida: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Tempo">Tempo</SelectItem>
                      <SelectItem value="Percentual">Percentual</SelectItem>
                      <SelectItem value="Quantidade">Quantidade</SelectItem>
                      <SelectItem value="Valor">Valor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Resultado Atual</Label>
                <Input
                  type="number"
                  value={formIndicador.resultado_atual}
                  onChange={(e) => setFormIndicador({ ...formIndicador, resultado_atual: parseFloat(e.target.value) })}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formIndicador.calculo_automatico}
                  onChange={(e) => setFormIndicador({ ...formIndicador, calculo_automatico: e.target.checked })}
                  className="h-4 w-4"
                />
                <Label>Cálculo Automático (dados do sistema)</Label>
              </div>

              {formIndicador.calculo_automatico && (
                <div className="space-y-2">
                  <Label>Fonte de Dados</Label>
                  <Select
                    value={formIndicador.fonte_dados}
                    onValueChange={(value) => setFormIndicador({ ...formIndicador, fonte_dados: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Atendimento">Atendimentos</SelectItem>
                      <SelectItem value="Tarefa">Tarefas</SelectItem>
                      <SelectItem value="Agenda">Eventos/Agenda</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogIndicador(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">
                  Criar Indicador
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Dialog Ação Corretiva */}
        <Dialog open={dialogAcao} onOpenChange={setDialogAcao}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Ação Corretiva</DialogTitle>
              {indicadorParaAcao && (
                <p className="text-sm text-slate-500 mt-2">
                  Para: {indicadorParaAcao.nome}
                </p>
              )}
            </DialogHeader>
            <form onSubmit={handleSubmitAcao} className="space-y-4">
              <div className="space-y-2">
                <Label>Ação Definida *</Label>
                <Textarea
                  value={formAcao.acao_definida}
                  onChange={(e) => setFormAcao({ ...formAcao, acao_definida: e.target.value })}
                  placeholder="Descreva a ação corretiva..."
                  rows={3}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Responsável *</Label>
                <Select
                  value={formAcao.responsavel_id}
                  onValueChange={(value) => setFormAcao({ ...formAcao, responsavel_id: value })}
                >
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

              <div className="space-y-2">
                <Label>Prazo *</Label>
                <Input
                  type="date"
                  value={formAcao.prazo}
                  onChange={(e) => setFormAcao({ ...formAcao, prazo: e.target.value })}
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogAcao(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">
                  Criar Ação
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Dialog Revisão Estratégica */}
        <Dialog open={dialogRevisao} onOpenChange={setDialogRevisao}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Revisão Estratégica</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmitRevisao} className="space-y-4">
              <div className="space-y-2">
                <Label>Setor *</Label>
                <Select
                  value={formRevisao.setor}
                  onValueChange={(value) => setFormRevisao({ ...formRevisao, setor: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Atendimento">Atendimento</SelectItem>
                    <SelectItem value="Administrativo">Administrativo</SelectItem>
                    <SelectItem value="Marketing">Marketing</SelectItem>
                    <SelectItem value="Financeiro">Financeiro</SelectItem>
                    <SelectItem value="Operacional">Operacional</SelectItem>
                    <SelectItem value="CEO/Estratégico">CEO/Estratégico</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Pontos Fortes</Label>
                <Textarea
                  value={formRevisao.pontos_fortes}
                  onChange={(e) => setFormRevisao({ ...formRevisao, pontos_fortes: e.target.value })}
                  rows={2}
                  placeholder="O que funcionou bem..."
                />
              </div>

              <div className="space-y-2">
                <Label>Pontos de Melhoria</Label>
                <Textarea
                  value={formRevisao.pontos_melhoria}
                  onChange={(e) => setFormRevisao({ ...formRevisao, pontos_melhoria: e.target.value })}
                  rows={2}
                  placeholder="O que precisa melhorar..."
                />
              </div>

              <div className="space-y-2">
                <Label>Ajustes Necessários</Label>
                <Textarea
                  value={formRevisao.ajustes_necessarios}
                  onChange={(e) => setFormRevisao({ ...formRevisao, ajustes_necessarios: e.target.value })}
                  rows={2}
                  placeholder="Ajustes para o próximo ciclo..."
                />
              </div>

              <div className="space-y-2">
                <Label>Decisões Estratégicas</Label>
                <Textarea
                  value={formRevisao.decisoes_estrategicas}
                  onChange={(e) => setFormRevisao({ ...formRevisao, decisoes_estrategicas: e.target.value })}
                  rows={2}
                  placeholder="Decisões tomadas..."
                />
              </div>

              <div className="space-y-2">
                <Label>Análise de Desempenho</Label>
                <Textarea
                  value={formRevisao.analise_desempenho}
                  onChange={(e) => setFormRevisao({ ...formRevisao, analise_desempenho: e.target.value })}
                  rows={3}
                  placeholder="Análise geral do desempenho..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogRevisao(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">
                  Salvar Revisão
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Dialog Feedback */}
        <Dialog open={dialogFeedback} onOpenChange={setDialogFeedback}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Feedback</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmitFeedback} className="space-y-4">
              <div className="space-y-2">
                <Label>Tipo de Feedback</Label>
                <Select
                  value={formFeedback.tipo_feedback}
                  onValueChange={(value) => setFormFeedback({ ...formFeedback, tipo_feedback: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Individual">Individual</SelectItem>
                    <SelectItem value="Coletivo">Coletivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formFeedback.tipo_feedback === 'Individual' && (
                <div className="space-y-2">
                  <Label>Usuário Avaliado</Label>
                  <Select
                    value={formFeedback.usuario_avaliado_id}
                    onValueChange={(value) => setFormFeedback({ ...formFeedback, usuario_avaliado_id: value })}
                  >
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
              )}

              {formFeedback.tipo_feedback === 'Coletivo' && (
                <div className="space-y-2">
                  <Label>Setor Avaliado</Label>
                  <Select
                    value={formFeedback.setor_avaliado}
                    onValueChange={(value) => setFormFeedback({ ...formFeedback, setor_avaliado: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Atendimento">Atendimento</SelectItem>
                      <SelectItem value="Administrativo">Administrativo</SelectItem>
                      <SelectItem value="Marketing">Marketing</SelectItem>
                      <SelectItem value="Financeiro">Financeiro</SelectItem>
                      <SelectItem value="Operacional">Operacional</SelectItem>
                      <SelectItem value="CEO/Estratégico">CEO/Estratégico</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea
                  value={formFeedback.observacoes}
                  onChange={(e) => setFormFeedback({ ...formFeedback, observacoes: e.target.value })}
                  rows={3}
                  placeholder="Feedback detalhado..."
                />
              </div>

              <div className="space-y-2">
                <Label>Pontuação (0-10)</Label>
                <Input
                  type="number"
                  min="0"
                  max="10"
                  value={formFeedback.pontuacao}
                  onChange={(e) => setFormFeedback({ ...formFeedback, pontuacao: parseFloat(e.target.value) })}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogFeedback(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">
                  Salvar Feedback
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
