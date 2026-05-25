import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { flowdesk } from '@/api/flowdeskClient';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Printer, Save, Clock, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { getDaysInMonth, getDay } from 'date-fns';

const ADMINS = ['larissa', 'marcia', 'dra.marcia', 'dra márcia', 'larissa silvério'];

const DIAS_SEMANA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

const MESES = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'
];

const PRINT_STYLE = `
  @media print {
    aside, header, nav { display: none !important; }
    main { padding-left: 0 !important; padding-top: 0 !important; }
    body { margin: 0; background: white; }
    #folha-controls { display: none !important; }
    .min-h-screen { padding: 0 !important; background: white !important; }
    table { width: 100%; border-collapse: collapse; }
    th { background-color: #1e293b !important; color: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    th, td { border: 1px solid #cbd5e1 !important; padding: 4px 6px; font-size: 10px; }
    input { border: none !important; outline: none !important; box-shadow: none !important; background: transparent !important; }
    .rounded-2xl { border-radius: 0 !important; box-shadow: none !important; border: none !important; }
    .bg-slate-100 { background-color: #f1f5f9 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
`;

function isAdmin(user) {
  if (!user) return false;
  const name = (user.full_name || '').toLowerCase();
  const email = (user.email || '').toLowerCase();
  return ADMINS.some(a => name.includes(a) || email.includes(a)) || user.role === 'admin';
}

function calcHoras(entrada, saida, intSaida, intRetorno) {
  const toMin = (t) => {
    if (!t || !t.includes(':')) return null;
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };
  const e = toMin(entrada);
  const s = toMin(saida);
  if (e === null || s === null) return '';
  let total = s - e;
  const is = toMin(intSaida);
  const ir = toMin(intRetorno);
  if (is !== null && ir !== null) total -= (ir - is);
  if (total <= 0) return '';
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function emptyRegistros(mes, ano) {
  const days = getDaysInMonth(new Date(ano, mes - 1));
  return Array.from({ length: days }, (_, i) => ({
    dia: i + 1,
    entrada: '',
    intervalo_saida: '',
    intervalo_retorno: '',
    saida: '',
    observacoes: '',
  }));
}

function TimeInput({ value, onChange }) {
  return (
    <input
      type="time"
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      className="w-full border-0 bg-transparent text-center text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[#378ADD] rounded px-0.5"
    />
  );
}

export default function FolhaDePonto() {
  const queryClient = useQueryClient();

  const now = new Date();
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [ano, setAno] = useState(now.getFullYear());
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [localRegistros, setLocalRegistros] = useState(null);

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => flowdesk.auth.me(),
    staleTime: 5 * 60 * 1000,
  });

  const admin = isAdmin(currentUser);
  const userId = selectedUserId || currentUser?.email;

  const { data: allUsers = [] } = useQuery({
    queryKey: ['users-list'],
    queryFn: () => flowdesk.entities.User.list(),
    enabled: admin,
  });

  const { data: folha, isLoading } = useQuery({
    queryKey: ['folha-ponto', userId, mes, ano],
    queryFn: () => flowdesk.entities.FolhaDePonto.filter({ usuario_id: userId, mes, ano }, '-created_date', 1),
    enabled: !!userId,
    select: (data) => data[0] || null,
  });

  const registros = useMemo(() => {
    if (localRegistros) return localRegistros;
    if (folha?.registros?.length) return folha.registros;
    return emptyRegistros(mes, ano);
  }, [folha, localRegistros, mes, ano]);

  const handleMesAno = (newMes, newAno) => {
    setMes(newMes);
    setAno(newAno);
    setLocalRegistros(null);
  };

  const updateRow = (idx, field, value) => {
    setLocalRegistros(prev => {
      const base = prev || registros;
      return base.map((r, i) => i === idx ? { ...r, [field]: value } : r);
    });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        usuario_id: userId,
        usuario_nome: admin && selectedUserId
          ? allUsers.find(u => u.email === selectedUserId)?.full_name || selectedUserId
          : currentUser?.full_name || currentUser?.email,
        mes,
        ano,
        registros,
      };
      if (folha?.id) {
        return flowdesk.entities.FolhaDePonto.update(folha.id, payload);
      } else {
        return flowdesk.entities.FolhaDePonto.create(payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folha-ponto', userId, mes, ano] });
      setLocalRegistros(null);
    },
  });

  const handlePrint = () => window.print();

  const diasNoMes = getDaysInMonth(new Date(ano, mes - 1));

  const nomeUsuario = admin && selectedUserId
    ? allUsers.find(u => u.email === selectedUserId)?.full_name || selectedUserId
    : currentUser?.full_name || currentUser?.email || '';

  const prevMes = () => mes === 1 ? handleMesAno(12, ano - 1) : handleMesAno(mes - 1, ano);
  const nextMes = () => mes === 12 ? handleMesAno(1, ano + 1) : handleMesAno(mes + 1, ano);

  const isDirty = !!localRegistros;

  return (
    <div className="min-h-screen bg-slate-50 p-4 lg:p-8">
      <style dangerouslySetInnerHTML={{ __html: PRINT_STYLE }} />

      {/* Controles */}
      <div id="folha-controls" className="mb-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Clock className="h-6 w-6 text-[#378ADD]" /> Folha de Ponto
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">Registro mensal de jornada</p>
          </div>
          <div className="flex gap-2">
            {isDirty && (
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className="bg-[#378ADD] hover:bg-[#185FA5] text-white"
              >
                {saveMutation.isPending
                  ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  : <Save className="mr-1.5 h-4 w-4" />}
                Salvar
              </Button>
            )}
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="mr-1.5 h-4 w-4" /> Imprimir
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl overflow-hidden">
            <button onClick={prevMes} className="px-3 py-2 hover:bg-slate-50 transition-colors">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-3 py-2 text-sm font-semibold text-slate-700 min-w-[120px] text-center">
              {MESES[mes - 1]} {ano}
            </span>
            <button onClick={nextMes} className="px-3 py-2 hover:bg-slate-50 transition-colors">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <Select value={String(mes)} onValueChange={v => handleMesAno(Number(v), ano)}>
            <SelectTrigger className="w-36 bg-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MESES.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={String(ano)} onValueChange={v => handleMesAno(mes, Number(v))}>
            <SelectTrigger className="w-24 bg-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[2023, 2024, 2025, 2026, 2027].map(y => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {admin && allUsers.length > 0 && (
            <Select
              value={selectedUserId || currentUser?.email || ''}
              onValueChange={v => { setSelectedUserId(v); setLocalRegistros(null); }}
            >
              <SelectTrigger className="w-52 bg-white">
                <SelectValue placeholder="Selecionar colaborador" />
              </SelectTrigger>
              <SelectContent>
                {allUsers.map(u => (
                  <SelectItem key={u.email} value={u.email}>{u.full_name || u.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Folha */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 max-w-5xl mx-auto">

        {/* Cabeçalho do empregador */}
        <div className="border-b border-slate-200 px-6 py-4 text-center">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Empregador</p>
          <p className="font-bold text-slate-800 text-sm leading-snug">MARCIA RIBEIRO SOCIEDADE INDIVIDUAL DE ADVOCACIA</p>
          <p className="text-xs text-slate-600 mt-0.5">CNPJ: 35.142.746/0001-14</p>
          <p className="text-xs text-slate-600">Rua Teófilo David Muzel, 189 – Vila Ophelia – Itapeva-SP</p>
        </div>

        {/* Título e dados do colaborador */}
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-center text-lg font-bold text-slate-800 mb-4 uppercase tracking-wide">
            Folha de Ponto — {MESES[mes - 1]} / {ano}
          </h2>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-slate-500 text-xs font-medium uppercase">Colaborador:</span>{' '}
              <span className="font-semibold text-slate-800">{nomeUsuario}</span>
            </div>
            <div>
              <span className="text-slate-500 text-xs font-medium uppercase">Período:</span>{' '}
              <span className="font-semibold text-slate-800">{MESES[mes - 1]} de {ano}</span>
            </div>
          </div>
        </div>

        {/* Tabela */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-[#378ADD]" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th className="border border-slate-600 px-2 py-2 text-center w-10">Dia</th>
                  <th className="border border-slate-600 px-2 py-2 text-center w-24">Dia da Semana</th>
                  <th className="border border-slate-600 px-2 py-2 text-center w-20">Entrada</th>
                  <th className="border border-slate-600 px-2 py-2 text-center w-20">Int. Saída</th>
                  <th className="border border-slate-600 px-2 py-2 text-center w-20">Int. Retorno</th>
                  <th className="border border-slate-600 px-2 py-2 text-center w-20">Saída</th>
                  <th className="border border-slate-600 px-2 py-2 text-center w-16">Total</th>
                  <th className="border border-slate-600 px-2 py-2 text-center">Observações</th>
                </tr>
              </thead>
              <tbody>
                {registros.slice(0, diasNoMes).map((row, idx) => {
                  const date = new Date(ano, mes - 1, row.dia);
                  const diaSemana = getDay(date);
                  const isDomingo = diaSemana === 0;
                  const isSabado = diaSemana === 6;
                  const isWeekend = isDomingo || isSabado;
                  const horas = calcHoras(row.entrada, row.saida, row.intervalo_saida, row.intervalo_retorno);
                  const incompleto = !isWeekend && (row.entrada || row.saida) && (!row.entrada || !row.saida);

                  const rowClass = isWeekend
                    ? (idx % 2 === 0 ? 'bg-white text-slate-700' : 'bg-slate-50 text-slate-700')
                    : incompleto
                    ? 'bg-amber-50'
                    : idx % 2 === 0 ? 'bg-white' : 'bg-slate-50';

                  return (
                    <tr key={row.dia} className={rowClass}>
                      <td className="border border-slate-200 px-2 py-1 text-center font-bold text-slate-700">
                        {row.dia}
                      </td>
                      <td className={`border border-slate-200 px-2 py-1 text-center font-semibold ${
                        isDomingo ? 'text-red-500' : isSabado ? 'text-blue-500' : 'text-slate-600'
                      }`}>
                        {DIAS_SEMANA[diaSemana]}
                      </td>
                      <td className="border border-slate-200 p-0.5">
                        <TimeInput value={row.entrada} onChange={v => updateRow(idx, 'entrada', v)} />
                      </td>
                      <td className="border border-slate-200 p-0.5">
                        <TimeInput value={row.intervalo_saida} onChange={v => updateRow(idx, 'intervalo_saida', v)} />
                      </td>
                      <td className="border border-slate-200 p-0.5">
                        <TimeInput value={row.intervalo_retorno} onChange={v => updateRow(idx, 'intervalo_retorno', v)} />
                      </td>
                      <td className="border border-slate-200 p-0.5">
                        <TimeInput value={row.saida} onChange={v => updateRow(idx, 'saida', v)} />
                      </td>
                      <td className="border border-slate-200 px-1 py-1 text-center font-mono text-slate-600">
                        {horas || <span className="text-slate-300">—</span>}
                      </td>
                      <td className="border border-slate-200 p-0.5">
                        <input
                          type="text"
                          value={row.observacoes || ''}
                          onChange={e => updateRow(idx, 'observacoes', e.target.value)}
                          placeholder="..."
                          className="w-full border-0 bg-transparent text-xs focus:outline-none focus:ring-1 focus:ring-[#378ADD] rounded px-1"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Rodapé */}
        <div className="px-6 py-6 border-t border-slate-200 mt-2">
          <div className="flex flex-col sm:flex-row justify-between gap-6 items-end">
            <div className="text-xs text-slate-400 space-y-1">
              <p>Itapeva-SP, _______ de ___________________ de {ano}.</p>
            </div>
            <div className="text-center">
              <div className="border-b-2 border-slate-800 w-64 mb-1 mt-8"></div>
              <p className="text-xs font-medium text-slate-700">{nomeUsuario}</p>
              <p className="text-[10px] text-slate-400">Assinatura do Colaborador</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}