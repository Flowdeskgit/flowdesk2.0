import React from 'react';
import { motion } from 'framer-motion';
import { Users, TrendingUp, UserCheck, CheckCircle, XCircle, BarChart3, MapPin } from 'lucide-react';

const statusColors = {
  'Leads Novos': 'from-blue-500 to-blue-600',
  'Em Atendimento': 'from-purple-500 to-purple-600',
  'Qualificados': 'from-amber-500 to-orange-500',
  'Convertidos': 'from-emerald-500 to-green-600',
  'Perdidos': 'from-red-500 to-red-600',
  'Taxa de Conversão': 'from-indigo-500 to-indigo-600',
  'Total de Leads': 'from-slate-500 to-slate-600',
  'Melhor Origem': 'from-pink-500 to-pink-600',
};

const statusIcons = {
  'Leads Novos': Users,
  'Em Atendimento': UserCheck,
  'Qualificados': TrendingUp,
  'Convertidos': CheckCircle,
  'Perdidos': XCircle,
  'Taxa de Conversão': BarChart3,
  'Total de Leads': BarChart3,
  'Melhor Origem': MapPin,
};

export default function CRMIndicadores({ leads, onCardClick }) {
  const novos = leads.filter((l) => l.status === 'Novo').length;
  const emContato = leads.filter((l) => l.status === 'Em Contato').length;
  const qualificados = leads.filter((l) => l.status === 'Qualificado').length;
  const convertidos = leads.filter((l) => l.status === 'Convertido').length;
  const perdidos = leads.filter((l) => l.status === 'Perdido').length;
  const taxa = leads.length > 0 ? ((convertidos / leads.length) * 100).toFixed(1) : '0.0';

  // melhor origem
  const origemMap = {};
  leads.forEach((l) => { if (l.origem) origemMap[l.origem] = (origemMap[l.origem] || 0) + 1; });
  const melhorOrigem = Object.entries(origemMap).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';

  const cards = [
    { label: 'Leads Novos', value: novos, filter: 'Novo' },
    { label: 'Em Atendimento', value: emContato, filter: 'Em Contato' },
    { label: 'Qualificados', value: qualificados, filter: 'Qualificado' },
    { label: 'Convertidos', value: convertidos, filter: 'Convertido' },
    { label: 'Perdidos', value: perdidos, filter: 'Perdido' },
    { label: 'Taxa de Conversão', value: `${taxa}%`, filter: null },
    { label: 'Total de Leads', value: leads.length, filter: null },
    { label: 'Melhor Origem', value: melhorOrigem, filter: null },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-8">
      {cards.map((card, i) => {
        const Icon = statusIcons[card.label];
        const gradient = statusColors[card.label];
        return (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => card.filter && onCardClick(card.filter)}
            className={`rounded-2xl bg-white border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow ${card.filter ? 'cursor-pointer hover:border-slate-300' : ''}`}
          >
            <div className={`inline-flex rounded-xl bg-gradient-to-br ${gradient} p-2 mb-2`}>
              <Icon className="h-4 w-4 text-white" />
            </div>
            <p className="text-2xl font-bold text-slate-800 leading-tight">{card.value}</p>
            <p className="text-xs text-slate-500 mt-0.5 leading-tight">{card.label}</p>
          </motion.div>
        );
      })}
    </div>
  );
}