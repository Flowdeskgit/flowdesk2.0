import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar } from 'lucide-react';

export default function TVDashboard({ tarefas, atendimentos, alertas, pessoas }) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header com Data/Hora - Mais Elegante */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-card backdrop-blur-sm border border-border p-6 shadow-lg"
      >
        <div className="relative">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold text-foreground">FlowDesk Jurídico</h2>
          </div>
          <div className="text-center">
            <div className="mb-3">
              <p className="text-7xl font-light tabular-nums tracking-tight text-rose-600">
                {format(currentTime, 'HH:mm:ss')}
              </p>
            </div>
            <div className="flex items-center justify-center gap-2">
              <Calendar className="h-4 w-4 text-rose-400" />
              <p className="text-lg font-light text-muted-foreground">
                {format(currentTime, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}