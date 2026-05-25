import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { flowdesk } from '@/api/flowdeskClient';
import { motion } from 'framer-motion';
import { CheckCircle2, Target, Calendar, User, Zap, Medal } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { isToday } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis } from 'recharts';
import PodiumCard from '@/components/produtividade/PodiumCard';
import ConquistaBadge, { CONQUISTAS } from '@/components/produtividade/ConquistaBadge';

const PERIODO_OPTS = [
  { v: 'hoje', l: 'Hoje' },
  { v: '7dias', l: 'Últimos 7 dias' },
  { v: '30dias', l: 'Últimos 30 dias' },
  { v: 'todos', l: 'Todo o período' },
];

const LEVEL_CONFIG = [
  { min: 0,   label: 'Iniciante',   color: 'text-slate-500',    bg: 'bg-slate-100',    icon: '🌱' },
  { min: 10,  label: 'Aprendiz',    color: 'text-blue-600',     bg: 'bg-blue-100',     icon: '📘' },
  { min: 25,  label: 'Praticante',  color: 'text-green-600',    bg: 'bg-green-100',    icon: '⚡' },
  { min: 50,  label: 'Especialista',color: 'text-purple-600',   bg: 'bg-purple-100',   icon: '🔮' },
  { min: 100, label: 'Expert',      color: 'text-orange-600',   bg: 'bg-orange-100',   icon: '🔥' },
  { min: 200, label: 'Mestre',      color: 'text-[#185FA5]',    bg: 'bg-[#EAF4FF]',   icon: '👑' },
];

function getLevel(pontos) {
  return [...LEVEL_CONFIG].reverse().find(l => pontos >= l.min) || LEVEL_CONFIG[0];
}

function calcularPontos(s) {
  return (
    s.tarefasConcluidas * 10 +
    s.atendimentosConcluidos * 8 +
    s.eventosRealizados * 5 +
    s.processosConcluidos * 12 +
    Math.floor(s.taxaConclusao / 10) * 3
  );
}

function useFiltro(periodo) {
  return (item) => {
    const d = new Date(item.created_date);
    if (periodo === 'hoje') return isToday(d);
    if (periodo === '7dias') return d >= new Date(Date.now() - 7 * 86400000);
    if (periodo === '30dias') return d >= new Date(Date.now() - 30 * 86400000);
    return true;
  };
}

function calcStats(pessoaId, { tarefas, atendimentos, agenda, processosAdmin }, filtro) {
  const isMe = (id) => id === pessoaId;

  const tf = tarefas.filter(t => (isMe(t.created_by) || isMe(t.responsavel_id)) && filtro(t));
  const tarefasConcluidas = tf.filter(t => t.status === 'Concluída').length;
  const tarefasCriadas = tarefas.filter(t => isMe(t.created_by) && filtro(t)).length;
  const tarefasDelegadas = tf.filter(t => !isMe(t.created_by) && isMe(t.responsavel_id)).length;

  const at = atendimentos.filter(a => isMe(a.responsavel_id) && filtro(a));
  const atendimentosCriados = atendimentos.filter(a => isMe(a.created_by) && filtro(a)).length;
  const atendimentosConcluidos = at.filter(a => a.status === 'Concluído').length;

  const ev = agenda.filter(e => e.responsaveis_ids?.includes(pessoaId) && filtro(e));
  const eventosRealizados = ev.filter(e => e.status === 'Realizado').length;
  const eventosAgendados = ev.length;

  const pr = processosAdmin.filter(p => isMe(p.created_by) && filtro(p));
  const processosCriados = pr.length;
  const processosConcluidos = pr.filter(p => p.status === 'Concluído').length;

  const totalAcoes = atendimentosCriados + tarefasCriadas + processosCriados + eventosAgendados;
  const totalConcluidos = atendimentosConcluidos + tarefasConcluidas + processosConcluidos + eventosRealizados;
  const taxaConclusao = totalAcoes > 0 ? Math.round((totalConcluidos / totalAcoes) * 100) : 0;

  return {
    tarefasCriadas, tarefasDelegadas, tarefasConcluidas,
    atendimentosCriados, atendimentosConcluidos,
    eventosAgendados, eventosRealizados,
    processosCriados, processosConcluidos,
    totalAcoes, totalConcluidos, taxaConclusao,
  };
}

function Avatar({ nome, foto, size = 'md' }) {
  const cls = size === 'lg' ? 'h-16 w-16 text-2xl' : size === 'sm' ? 'h-8 w-8 text-sm' : 'h-10 w-10 text-base';
  if (foto) return <img src={foto} alt={nome} className={`${cls} rounded-full object-cover border-2 border-white`} />;
  return (
    <div className={`${cls} rounded-full bg-gradient-to-br from-[#378ADD] to-[#185FA5] text-white font-bold flex items-center justify-center border-2 border-white flex-shrink-0`}>
      {nome?.charAt(0).toUpperCase() || '?'}
    </div>
  );
}

function RankBadge({ pos }) {
  if (pos === 1) return <span className="text-2xl">🥇</span>;
  if (pos === 2) return <span className="text-2xl">🥈</span>;
  if (pos === 3) return <span className="text-xl">🥉</span>;
  return <span className="text-sm font-bold text-slate-500 w-7 text-center">{pos}°</span>;
}

function MiniBar({ value, max, color }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-medium text-slate-600 w-6 text-right">{value}</span>
    </div>
  );
}

export default function Produtividade() {
  const [periodo, setPeriodo] = useState('30dias');
  const [selectedPessoa, setSelectedPessoa] = useState(null);

  const { data: pessoas = [] } = useQuery({ queryKey: ['pessoas'], queryFn: () => flowdesk.entities.Pessoa.list() });
  const { data: tarefas = [] } = useQuery({ queryKey: ['tarefas'], queryFn: () => flowdesk.entities.Tarefa.list('-created_date', 500) });
  const { data: atendimentos = [] } = useQuery({ queryKey: ['atendimentos'], queryFn: () => flowdesk.entities.Atendimento.list('-created_date', 500) });
  const { data: agenda = [] } = useQuery({ queryKey: ['agenda'], queryFn: () => flowdesk.entities.Agenda.list('-created_date', 500) });
  const { data: processosAdmin = [] } = useQuery({ queryKey: ['andamento-administrativo'], queryFn: () => flowdesk.entities.AndamentoAdministrativo.list('-created_date', 500) });

  const filtro = useFiltro(periodo);
  const data = { tarefas, atendimentos, agenda, processosAdmin };

  const ranking = useMemo(() => {
    return pessoas
      .map(pessoa => {
        const stats = calcStats(pessoa.id, data, filtro);
        const pontos = calcularPontos(stats);
        const level = getLevel(pontos);
        const conquistas = CONQUISTAS.filter(c => c.req(stats));
        return { pessoa, ...stats, pontos, level, conquistas };
      })
      .sort((a, b) => b.pontos - a.pontos);
  }, [pessoas, tarefas, atendimentos, agenda, processosAdmin, periodo]);

  const detalhe = selectedPessoa ? ranking.find(r => r.pessoa.id === selectedPessoa) : null;
  const maxPontos = ranking[0]?.pontos || 1;

  const radarData = detalhe ? [
    { subject: 'Tarefas', value: Math.min(100, detalhe.tarefasConcluidas * 10) },
    { subject: 'Atendimentos', value: Math.min(100, detalhe.atendimentosConcluidos * 10) },
    { subject: 'Eventos', value: Math.min(100, detalhe.eventosRealizados * 10) },
    { subject: 'Processos', value: Math.min(100, detalhe.processosConcluidos * 10) },
    { subject: 'Taxa %', value: detalhe.taxaConclusao },
  ] : [];

  const barData = ranking.slice(0, 8).map(r => ({
    nome: r.pessoa.nome.split(' ')[0],
    Pontos: r.pontos,
    Tarefas: r.tarefasConcluidas,
    Atendimentos: r.atendimentosConcluidos,
  }));

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Medal className="h-7 w-7 text-yellow-500" />
            Painel de Produtividade
          </h1>
          <p className="text-slate-500 text-sm">Leaderboard gamificada da equipe</p>
        </div>
        <Select value={periodo} onValueChange={setPeriodo}>
          <SelectTrigger className="w-44">
            <Calendar className="mr-2 h-4 w-4" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIODO_OPTS.map(o => <SelectItem key={o.v} value={o.v}>{o.l}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Cards totais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Tarefas Concluídas', val: ranking.reduce((s, r) => s + r.tarefasConcluidas, 0), icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-100' },
          { label: 'Atendimentos', val: ranking.reduce((s, r) => s + r.atendimentosCriados, 0), icon: Target, color: 'text-blue-600', bg: 'bg-blue-100' },
          { label: 'Pontos Totais', val: ranking.reduce((s, r) => s + r.pontos, 0), icon: Zap, color: 'text-yellow-600', bg: 'bg-yellow-100' },
          { label: 'Membros Ativos', val: ranking.filter(r => r.totalAcoes > 0).length, icon: User, color: 'text-purple-600', bg: 'bg-purple-100' },
        ].map(({ label, val, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
            <div className={`h-10 w-10 rounded-full ${bg} flex items-center justify-center flex-shrink-0`}>
              <Icon className={`h-5 w-5 ${color}`} />
            </div>
            <div>
              <p className="text-xs text-slate-500 leading-tight">{label}</p>
              <p className="text-xl font-bold text-slate-800">{val}</p>
            </div>
          </div>
        ))}
      </div>

      <Tabs defaultValue="leaderboard">
        <TabsList>
          <TabsTrigger value="leaderboard">🏆 Leaderboard</TabsTrigger>
          <TabsTrigger value="graficos">📊 Gráficos</TabsTrigger>
          {detalhe && <TabsTrigger value="individual">👤 {detalhe.pessoa.nome.split(' ')[0]}</TabsTrigger>}
        </TabsList>

        {/* Leaderboard */}
        <TabsContent value="leaderboard" className="space-y-4">
          <PodiumCard top3={ranking.slice(0, 3)} />

          <div className="space-y-2">
            {ranking.map((r, i) => {
              const level = r.level;
              const nextLevel = LEVEL_CONFIG[LEVEL_CONFIG.indexOf(level) + 1];
              const progressToNext = nextLevel
                ? Math.min(100, Math.round(((r.pontos - level.min) / (nextLevel.min - level.min)) * 100))
                : 100;

              return (
                <motion.div
                  key={r.pessoa.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className={`bg-white rounded-xl border border-slate-200 p-4 cursor-pointer hover:border-[#BFDDF7] hover:shadow-md transition-all ${
                    selectedPessoa === r.pessoa.id ? 'border-[#378ADD] ring-1 ring-[#BFDDF7]' : ''
                  }`}
                  onClick={() => setSelectedPessoa(selectedPessoa === r.pessoa.id ? null : r.pessoa.id)}
                >
                  <div className="flex items-center gap-3 flex-wrap md:flex-nowrap">
                    <div className="w-8 flex-shrink-0 flex justify-center">
                      <RankBadge pos={i + 1} />
                    </div>
                    <Avatar nome={r.pessoa.nome} foto={r.pessoa.foto} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-slate-800">{r.pessoa.nome}</p>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${level.bg} ${level.color}`}>
                          {level.icon} {level.label}
                        </span>
                        {r.conquistas.slice(0, 3).map(c => (
                          <span key={c.id} title={c.label} className="text-base">{c.icon}</span>
                        ))}
                      </div>
                      <p className="text-xs text-slate-500">{r.pessoa.cargo}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Progress value={progressToNext} className="h-1.5 flex-1" />
                        <span className="text-[10px] text-slate-400">
                          {nextLevel ? `${nextLevel.min - r.pontos}pts para ${nextLevel.label}` : 'Nível máximo!'}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-x-6 gap-y-1 text-xs min-w-[220px]">
                      <div>
                        <p className="text-slate-400 text-[10px]">Tarefas ✓</p>
                        <MiniBar value={r.tarefasConcluidas} max={Math.max(1, Math.max(...ranking.map(x => x.tarefasConcluidas)))} color="bg-green-500" />
                      </div>
                      <div>
                        <p className="text-slate-400 text-[10px]">Atend. ✓</p>
                        <MiniBar value={r.atendimentosConcluidos} max={Math.max(1, Math.max(...ranking.map(x => x.atendimentosConcluidos)))} color="bg-blue-500" />
                      </div>
                      <div>
                        <p className="text-slate-400 text-[10px]">Taxa</p>
                        <MiniBar value={r.taxaConclusao} max={100} color="bg-purple-500" />
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-slate-400">Pontuação</p>
                      <p className="text-xl font-black text-yellow-500">{r.pontos}</p>
                      <p className="text-[10px] text-slate-400">pts</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </TabsContent>

        {/* Gráficos */}
        <TabsContent value="graficos" className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Pontuação por Membro</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="nome" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="Pontos" fill="#378ADD" radius={[4,4,0,0]} />
                <Bar dataKey="Tarefas" fill="#22c55e" radius={[4,4,0,0]} />
                <Bar dataKey="Atendimentos" fill="#3b82f6" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ranking.slice(0, 4).map(r => (
              <div key={r.pessoa.id} className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Avatar nome={r.pessoa.nome} foto={r.pessoa.foto} size="sm" />
                  <div>
                    <p className="text-sm font-semibold text-slate-700">{r.pessoa.nome.split(' ')[0]}</p>
                    <p className="text-xs text-slate-400">{r.level.icon} {r.level.label} · {r.pontos} pts</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {[
                    { label: 'Tarefas concluídas', val: r.tarefasConcluidas, max: 20, color: 'bg-green-500' },
                    { label: 'Atendimentos concluídos', val: r.atendimentosConcluidos, max: 20, color: 'bg-blue-500' },
                    { label: 'Taxa de conclusão %', val: r.taxaConclusao, max: 100, color: 'bg-purple-500' },
                  ].map(m => (
                    <div key={m.label}>
                      <div className="flex justify-between text-xs text-slate-500 mb-0.5">
                        <span>{m.label}</span><span>{m.val}{m.label.includes('%') ? '%' : ''}</span>
                      </div>
                      <Progress value={Math.min(100, (m.val / m.max) * 100)} className="h-1.5" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Individual */}
        {detalhe && (
          <TabsContent value="individual" className="space-y-4">
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 text-white">
              <div className="flex items-center gap-4">
                <Avatar nome={detalhe.pessoa.nome} foto={detalhe.pessoa.foto} size="lg" />
                <div className="flex-1">
                  <h2 className="text-xl font-bold">{detalhe.pessoa.nome}</h2>
                  <p className="text-slate-400 text-sm">{detalhe.pessoa.cargo}</p>
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    <Badge className={`${detalhe.level.bg} ${detalhe.level.color} border-0 font-semibold`}>
                      {detalhe.level.icon} {detalhe.level.label}
                    </Badge>
                    <span className="text-yellow-400 font-black text-2xl">{detalhe.pontos} pts</span>
                    <Badge className="bg-slate-700 text-white border-0">
                      #{ranking.findIndex(r => r.pessoa.id === detalhe.pessoa.id) + 1}° no ranking
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { l: 'Tarefas Concluídas', v: detalhe.tarefasConcluidas, c: 'text-green-600' },
                { l: 'Atend. Concluídos', v: detalhe.atendimentosConcluidos, c: 'text-blue-600' },
                { l: 'Taxa de Conclusão', v: `${detalhe.taxaConclusao}%`, c: detalhe.taxaConclusao >= 80 ? 'text-green-600' : detalhe.taxaConclusao >= 60 ? 'text-yellow-600' : 'text-red-600' },
                { l: 'Eventos Realizados', v: detalhe.eventosRealizados, c: 'text-purple-600' },
              ].map(({ l, v, c }) => (
                <div key={l} className="bg-white rounded-xl border border-slate-200 p-4 text-center">
                  <p className={`text-2xl font-black ${c}`}>{v}</p>
                  <p className="text-xs text-slate-500 mt-1">{l}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Radar de Performance</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
                    <Radar dataKey="value" stroke="#378ADD" fill="#378ADD" fillOpacity={0.3} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">🏅 Conquistas</h3>
                <div className="grid grid-cols-2 gap-2">
                  {CONQUISTAS.map(c => (
                    <ConquistaBadge key={c.id} conquista={c} desbloqueada={c.req(detalhe)} />
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Detalhamento de Atividades</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                {[
                  { label: 'Tarefas criadas', val: detalhe.tarefasCriadas },
                  { label: 'Tarefas delegadas', val: detalhe.tarefasDelegadas },
                  { label: 'Tarefas concluídas', val: detalhe.tarefasConcluidas },
                  { label: 'Atend. criados', val: detalhe.atendimentosCriados },
                  { label: 'Atend. concluídos', val: detalhe.atendimentosConcluidos },
                  { label: 'Processos criados', val: detalhe.processosCriados },
                  { label: 'Processos concluídos', val: detalhe.processosConcluidos },
                  { label: 'Total ações', val: detalhe.totalAcoes },
                ].map(({ label, val }) => (
                  <div key={label} className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xs text-slate-500">{label}</p>
                    <p className="text-lg font-bold text-slate-800">{val}</p>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}