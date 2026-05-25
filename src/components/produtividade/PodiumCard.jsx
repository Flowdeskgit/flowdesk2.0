import { motion } from 'framer-motion';
import { Trophy, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const podiumConfig = [
  { pos: 1, height: 'h-28', bg: 'from-yellow-400 to-amber-500', border: 'border-yellow-400', shadow: 'shadow-yellow-200', icon: '🥇', label: '1º Lugar' },
  { pos: 2, height: 'h-20', bg: 'from-slate-400 to-slate-500', border: 'border-slate-400', shadow: 'shadow-slate-200', icon: '🥈', label: '2º Lugar' },
  { pos: 3, height: 'h-14', bg: 'from-amber-600 to-amber-700', border: 'border-amber-600', shadow: 'shadow-amber-200', icon: '🥉', label: '3º Lugar' },
];

function Avatar({ nome, foto, size = 'md' }) {
  const cls = size === 'lg' ? 'h-16 w-16 text-xl' : 'h-12 w-12 text-base';
  if (foto) return <img src={foto} alt={nome} className={`${cls} rounded-full object-cover ring-2 ring-white`} />;
  return (
    <div className={`${cls} rounded-full bg-gradient-to-br from-rose-500 to-pink-600 text-white font-bold flex items-center justify-center ring-2 ring-white`}>
      {nome?.charAt(0).toUpperCase() || '?'}
    </div>
  );
}

export default function PodiumCard({ top3 }) {
  if (!top3 || top3.length === 0) return null;

  // Reorder: 2nd, 1st, 3rd for podium display
  const order = [top3[1], top3[0], top3[2]].filter(Boolean);
  const configs = [podiumConfig[1], podiumConfig[0], podiumConfig[2]];

  return (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 mb-2">
      <div className="flex items-center gap-2 mb-6">
        <Trophy className="h-5 w-5 text-yellow-400" />
        <h3 className="text-white font-bold text-lg">Pódio do Período</h3>
        <Star className="h-4 w-4 text-yellow-400 ml-auto" />
      </div>

      <div className="flex items-end justify-center gap-4">
        {order.map((userStats, i) => {
          const cfg = configs[i];
          if (!userStats) return <div key={i} className="w-24" />;
          return (
            <motion.div
              key={userStats.pessoa.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="flex flex-col items-center gap-2"
            >
              <div className="text-2xl">{cfg.icon}</div>
              <Avatar nome={userStats.pessoa.nome} foto={userStats.pessoa.foto} size={cfg.pos === 1 ? 'lg' : 'md'} />
              <div className="text-center">
                <p className="text-white font-semibold text-sm leading-tight">{userStats.pessoa.nome.split(' ')[0]}</p>
                <p className="text-slate-400 text-xs">{userStats.pessoa.cargo}</p>
                <Badge className="mt-1 bg-yellow-500 text-slate-900 font-bold border-0 text-xs">
                  {userStats.pontos} pts
                </Badge>
              </div>
              <div className={`${cfg.height} w-20 bg-gradient-to-t ${cfg.bg} rounded-t-xl flex items-center justify-center border-t-2 ${cfg.border} shadow-lg ${cfg.shadow}`}>
                <span className="text-white font-black text-xl">{cfg.pos}°</span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}