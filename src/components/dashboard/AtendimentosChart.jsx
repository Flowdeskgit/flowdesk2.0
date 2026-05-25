import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { motion } from 'framer-motion';

export default function AtendimentosChart({ atendimentos }) {
  // Agrupar atendimentos por status
  const statusData = [
    { name: 'Aberto', value: atendimentos.filter(a => a.status === 'Aberto').length, fill: '#3b82f6' },
    { name: 'Em andamento', value: atendimentos.filter(a => a.status === 'Em andamento').length, fill: '#8b5cf6' },
    { name: 'Aguardando', value: atendimentos.filter(a => a.status === 'Aguardando resposta').length, fill: '#f59e0b' },
    { name: 'Concluído', value: atendimentos.filter(a => a.status === 'Concluído').length, fill: '#10b981' },
    { name: 'Arquivado', value: atendimentos.filter(a => a.status === 'Arquivado').length, fill: '#64748b' },
  ];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lg">
          <p className="font-medium">{label}</p>
          <p className="text-sm text-slate-600">{payload[0].value} atendimentos</p>
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-2xl border border-slate-200 bg-white p-6"
    >
      <h3 className="mb-4 text-lg font-semibold text-slate-800">Atendimentos por Status</h3>
      {atendimentos.length > 0 ? (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={statusData} layout="vertical" margin={{ left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
            <XAxis type="number" tick={{ fontSize: 12 }} />
            <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={90} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="value" radius={[0, 6, 6, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex h-[280px] items-center justify-center text-slate-400">
          Nenhum atendimento cadastrado
        </div>
      )}
    </motion.div>
  );
}