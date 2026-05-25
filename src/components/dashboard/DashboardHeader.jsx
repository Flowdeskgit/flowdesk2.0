import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { flowdesk } from '@/api/flowdeskClient';
import { useTheme } from '@/lib/ThemeContext';
import { createPageUrl } from '@/utils';
import { Sun, Moon, Bell } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function getSaudacao() {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'Bom dia';
  if (h >= 12 && h < 18) return 'Boa tarde';
  return 'Boa noite';
}

function UserAvatar({ user }) {
  if (user?.foto_perfil) {
    return (
      <img
        src={user.foto_perfil}
        alt={user.full_name}
        className="h-9 w-9 rounded-full object-cover ring-2 ring-brand-electric/30 flex-shrink-0"
      />
    );
  }
  const initials = (user?.full_name || user?.email || 'U').charAt(0).toUpperCase();
  return (
    <div className="h-9 w-9 rounded-full bg-brand-electric text-white font-semibold text-sm flex items-center justify-center flex-shrink-0 ring-2 ring-brand-electric/20">
      {initials}
    </div>
  );
}

/* FlowDesk node symbol (inline SVG) */
function FlowIcon() {
  return (
    <div className="hidden sm:flex h-11 w-11 rounded-xl bg-brand-electric items-center justify-center shadow-lg shadow-brand-electric/25 flex-shrink-0">
      <svg width="22" height="22" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="10" cy="10" r="2.5" fill="white" />
        <circle cx="16" cy="4" r="1.8" fill="white" opacity="0.85" />
        <line x1="11.7" y1="8.3" x2="14.6" y2="5.4" stroke="white" strokeWidth="1.4" strokeLinecap="round" />
        <circle cx="16" cy="16" r="1.8" fill="white" opacity="0.85" />
        <line x1="11.7" y1="11.7" x2="14.6" y2="14.6" stroke="white" strokeWidth="1.4" strokeLinecap="round" />
        <circle cx="4" cy="10" r="1.8" fill="white" opacity="0.65" />
        <line x1="7.5" y1="10" x2="5.8" y2="10" stroke="white" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    </div>
  );
}

export default function DashboardHeader() {
  const { modo_exibicao, savePreferences } = useTheme();
  const isDark = modo_exibicao === 'escuro';
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1_000);
    return () => clearInterval(t);
  }, []);

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => flowdesk.auth.me(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: notificacoes = [] } = useQuery({
    queryKey: ['notificacoes-nao-lidas'],
    queryFn: async () => {
      const all = await flowdesk.entities.Notificacao.list('-created_date', 100);
      return all.filter(n => !n.lida);
    },
    staleTime: 30_000,
  });

  const formatName = (name) =>
    name ? name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ') : '';

  const resolvedName = currentUser?.email === 'larissa@dramarcia.adv.br'
    ? 'Larissa Silvério'
    : currentUser?.full_name || currentUser?.email?.split('@')[0] || 'Usuário';
  const firstName = formatName(resolvedName).split(' ')[0];
  const saudacao = getSaudacao();
  const dataFormatada = format(now, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });

  return (
    <div className="px-4 md:px-8 pt-6 pb-2">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

        {/* LEFT */}
        <div className="flex items-center gap-4">
          <FlowIcon />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-medium text-foreground tracking-tight">
                {saudacao},{' '}
                <span className="text-brand-electric font-semibold">
                  {firstName}
                </span>
              </h1>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-sm text-muted-foreground capitalize">{dataFormatada}</p>
              <span className="text-border">·</span>
              <span className="text-sm font-mono font-medium text-brand-electric/70 tabular-nums">
                {format(now, 'HH:mm:ss')}
              </span>
            </div>
            <p className="text-xs text-muted-foreground/50 mt-0.5 font-medium tracking-widest uppercase">
              Central Operacional — FlowDesk SaaS
            </p>
          </div>
        </div>

        {/* RIGHT */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => savePreferences(undefined, isDark ? 'claro' : 'escuro')}
            title={isDark ? 'Modo claro' : 'Modo escuro'}
            className="h-9 w-9 rounded-lg border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-150 shadow-sm"
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          <Link
            to={createPageUrl('Notificacoes')}
            className="relative h-9 w-9 rounded-lg border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-150 shadow-sm"
          >
            <Bell className="h-4 w-4" />
            {notificacoes.length > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 bg-brand-electric text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {notificacoes.length > 9 ? '9+' : notificacoes.length}
              </span>
            )}
          </Link>

          <Link to={createPageUrl('MeuPerfil')} className="ml-1">
            <UserAvatar user={currentUser} />
          </Link>
        </div>
      </div>

      <div className="mt-5 h-px bg-gradient-to-r from-transparent via-brand-electric/20 to-transparent" />
    </div>
  );
}