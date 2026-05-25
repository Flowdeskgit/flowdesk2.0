import React from 'react';
import { motion } from 'framer-motion';

const colorConfig = {
  blue:   { bg: 'bg-card', border: 'border-border', text: 'text-brand-electric',  sub: 'text-brand-electric',  icon: 'bg-brand-electric',  dot: 'bg-brand-electric' },
  green:  { bg: 'bg-card', border: 'border-border', text: 'text-emerald-500',     sub: 'text-emerald-500',     icon: 'bg-emerald-500',     dot: 'bg-emerald-500' },
  amber:  { bg: 'bg-card', border: 'border-border', text: 'text-amber-500',       sub: 'text-amber-500',       icon: 'bg-amber-500',       dot: 'bg-amber-500' },
  red:    { bg: 'bg-card', border: 'border-border', text: 'text-destructive',     sub: 'text-destructive',     icon: 'bg-destructive',     dot: 'bg-destructive' },
  purple: { bg: 'bg-card', border: 'border-border', text: 'text-purple-600',      sub: 'text-purple-600',      icon: 'bg-purple-500',      dot: 'bg-purple-500' },
  slate:  { bg: 'bg-card', border: 'border-border', text: 'text-foreground',      sub: 'text-muted-foreground', icon: 'bg-muted',          dot: 'bg-muted-foreground' },
};

export default function StatsCard({ title, value, icon: Icon, color = 'blue', trend, trendLabel }) {
  const c = colorConfig[color] || colorConfig.blue;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2, transition: { duration: 0.15 } }}
      className={`relative overflow-hidden rounded-2xl border ${c.border} ${c.bg} p-5 shadow-sm hover:shadow-md transition-all duration-200 cursor-default dark:shadow-none`}
    >
      <div className={`absolute -right-4 -top-4 h-20 w-20 rounded-full opacity-10 ${c.icon}`} />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{title}</p>
          <p className={`text-4xl font-bold tracking-tight ${c.text} leading-none`}>{value}</p>
          {trend !== undefined && (
            <div className="mt-2 flex items-center gap-1 text-xs">
              <span className={trend >= 0 ? 'text-emerald-600 font-semibold' : 'text-red-500 font-semibold'}>
                {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
              </span>
              <span className={`${c.sub} opacity-80`}>{trendLabel}</span>
            </div>
          )}
        </div>
        <div className={`rounded-xl p-2.5 ${c.icon} shadow-md flex-shrink-0`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>
    </motion.div>
  );
}