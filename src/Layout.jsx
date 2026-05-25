import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from './utils';
import { flowdesk } from '@/api/flowdeskClient';
import FoundersCard from '@/components/sidebar/FoundersCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/AuthContext';
import { useTheme } from '@/lib/ThemeContext';
import { getVisibleNavItems } from '@/lib/navigation';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BellRing,
  BookOpen,
  ChevronRight,
  LogOut,
  Menu,
  Moon,
  MoreHorizontal,
  Settings,
  Sun,
  User,
  X,
} from 'lucide-react';

function FlowDeskLogo({ tone = 'dark' }) {
  const dark = tone === 'dark';
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-[#1a2f4a] to-[#0d1e31] shadow-lg">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="3" fill="#378ADD" />
          <circle cx="20" cy="4" r="2" fill="#5BA3E0" opacity="0.9" />
          <line x1="14.1" y1="9.9" x2="18.4" y2="5.6" stroke="#378ADD" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="20" cy="20" r="2" fill="#5BA3E0" opacity="0.9" />
          <line x1="14.1" y1="14.1" x2="18.4" y2="18.4" stroke="#378ADD" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="4" cy="12" r="2" fill="#5BA3E0" opacity="0.6" />
          <line x1="9" y1="12" x2="6" y2="12" stroke="#378ADD" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="5" cy="5" r="1.5" fill="#5BA3E0" opacity="0.4" />
          <line x1="10.4" y1="10.4" x2="6.1" y2="6.1" stroke="#378ADD" strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />
        </svg>
      </div>
      <div className="min-w-0 leading-tight">
        <div className={cn('text-[15px] font-bold tracking-tight', dark ? 'text-white' : 'text-foreground')}>
          FlowDesk <span className="font-semibold text-brand-sky">ADV</span>
        </div>
        <div className={cn('text-[9px] font-medium uppercase tracking-[0.14em]', dark ? 'text-brand-sky/60' : 'text-brand-electric/70')}>
          SaaS · Intelligent Operations
        </div>
      </div>
    </div>
  );
}

function UserAvatar({ user }) {
  const avatar = user?.avatar_url || user?.foto_perfil;
  if (avatar) {
    return (
      <img
        src={avatar}
        alt={user?.full_name || 'Usuário'}
        className="h-7 w-7 flex-shrink-0 rounded-full border border-white/10 object-cover"
      />
    );
  }

  const letter = (user?.full_name || user?.email || 'U').charAt(0).toUpperCase();
  return (
    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-brand-electric text-xs font-semibold text-white">
      {letter}
    </div>
  );
}

function NavItem({ item, isActive, onClick }) {
  return (
    <Link
      to={createPageUrl(item.page)}
      onClick={onClick}
      className={cn(
        'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
        isActive
          ? 'bg-brand-electric text-white shadow-sm'
          : 'text-[hsl(var(--sidebar-foreground))] hover:bg-white/[0.04] hover:text-white'
      )}
    >
      <item.icon className={cn('h-4 w-4 flex-shrink-0', isActive ? 'text-white' : 'opacity-70 group-hover:opacity-100')} />
      <span className="flex-1 truncate">{item.name}</span>
      {isActive && <ChevronRight className="h-3.5 w-3.5 opacity-70" />}
    </Link>
  );
}

export default function Layout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, isAdmin, allowedTabs, logout } = useAuth();
  const { modo_exibicao, savePreferences } = useTheme() || {};
  const isDark = modo_exibicao === 'escuro';
  const visibleNavItems = getVisibleNavItems({ isAdmin, allowedTabs });

  const { data: notificacoes = [] } = useQuery({
    queryKey: ['notificacoes-nao-lidas'],
    queryFn: async () => {
      const all = await flowdesk.entities.Notificacao.list('-created_date', 100);
      return all.filter((item) => !item.lida);
    },
    enabled: isAuthenticatedUser(user),
    refetchInterval: 30000,
  });

  const toggleDark = () => savePreferences?.(undefined, isDark ? 'claro' : 'escuro');

  const UserMenu = ({ side = 'top', onItemClick }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-auto w-full justify-start gap-2 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2 text-white hover:bg-white/[0.06] hover:text-white"
        >
          <UserAvatar user={user} />
          <span className="flex-1 truncate text-left text-xs font-medium">
            {user?.full_name?.split(' ')[0] || user?.email || 'Usuário'}
          </span>
          <MoreHorizontal className="h-4 w-4 flex-shrink-0 text-white/40" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side={side} align="start" className="w-60">
        <div className="mb-1 border-b border-border px-2 py-2">
          <p className="truncate text-xs font-semibold text-foreground">{user?.full_name || 'Usuário'}</p>
          <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
          {isAdmin && <Badge className="mt-1 border-brand-electric/20 bg-brand-electric/10 text-[10px] text-brand-steel">Admin</Badge>}
        </div>
        <DropdownMenuItem asChild>
          <Link to={createPageUrl('MeuPerfil')} onClick={onItemClick}>
            <User className="mr-2 h-4 w-4" />Meu Perfil
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to={createPageUrl('Notificacoes')} onClick={onItemClick}>
            <BellRing className="mr-2 h-4 w-4" />Notificações
            {notificacoes.length > 0 && (
              <Badge className="ml-auto flex h-4 min-w-4 items-center justify-center border-0 bg-red-500 p-0 text-[10px] text-white">
                {notificacoes.length}
              </Badge>
            )}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to={createPageUrl('BlocoDeNotas')} onClick={onItemClick}>
            <BookOpen className="mr-2 h-4 w-4" />Meu Bloco de Notas
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to={createPageUrl('Configuracoes')} onClick={onItemClick}>
            <Settings className="mr-2 h-4 w-4" />Configurações
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={toggleDark}>
          {isDark ? (
            <>
              <Sun className="mr-2 h-4 w-4 text-amber-500" />Modo Claro
            </>
          ) : (
            <>
              <Moon className="mr-2 h-4 w-4 text-indigo-400" />Modo Escuro
            </>
          )}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logout} className="text-red-600">
          <LogOut className="mr-2 h-4 w-4" />Sair do Sistema
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const SidebarContent = ({ onClose }) => (
    <div className="flex h-full flex-col bg-[hsl(var(--sidebar-background))]">
      <div className="border-b border-white/5 px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <FlowDeskLogo />
            <div className="mt-4 rounded-2xl border border-white/5 bg-white/[0.03] px-3 py-2.5 backdrop-blur-sm">
              <p className="text-[9px] font-medium uppercase tracking-[0.16em] text-brand-sky/45">
                Workspace atual
              </p>
              <p className="mt-1 truncate text-xs font-semibold text-white">
                MCR Advocacia
              </p>
            </div>
          </div>

          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7 flex-shrink-0 text-white/60 hover:bg-white/10 hover:text-white lg:hidden">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {visibleNavItems.map((item) => (
          <NavItem
            key={item.page}
            item={item}
            isActive={currentPageName === item.page}
            onClick={() => onClose?.()}
          />
        ))}
        {visibleNavItems.length === 0 && (
          <p className="px-3 py-4 text-xs text-white/45">
            Nenhuma aba liberada para este perfil.
          </p>
        )}
      </nav>

      <div className="space-y-3 border-t border-white/5 p-3">
        <UserMenu side="top" onItemClick={() => onClose?.()} />
        <FoundersCard />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed left-0 right-0 top-0 z-50 flex h-14 items-center justify-between border-b border-border bg-card/90 px-4 backdrop-blur-md lg:hidden">
        <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)} className="h-8 w-8 text-foreground/70 hover:text-foreground">
          <Menu className="h-5 w-5" />
        </Button>
        <FlowDeskLogo tone="light" />
        <div className="w-8" />
      </header>

      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: -310 }}
              animate={{ x: 0 }}
              exit={{ x: -310 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed left-0 top-0 z-50 h-full w-[310px] shadow-2xl lg:hidden"
            >
              <SidebarContent onClose={() => setSidebarOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <aside className="fixed left-0 top-0 z-40 hidden h-full w-[310px] shadow-xl lg:block">
        <SidebarContent />
      </aside>

      <main className="min-h-screen pt-14 lg:pl-[310px] lg:pt-0">
        {children}
      </main>
    </div>
  );
}

function isAuthenticatedUser(user) {
  return Boolean(user?.id || user?.email);
}
