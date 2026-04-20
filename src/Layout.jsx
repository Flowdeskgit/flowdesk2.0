import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from './utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useTheme } from '@/lib/ThemeContext';
import {
  LayoutDashboard,
  Briefcase,
  CheckSquare,
  Bell,
  Users,
  Building2,
  History,
  Clock,
  Menu,
  X,
  ChevronRight,
  TrendingUp,
  BarChart3,
  LogOut,
  Calendar,
  Scale,
  MoreHorizontal,
  User,
  Settings,
  BookOpen,
  BellRing,
  FileText,
  UserCog,
  Sun,
  Moon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// All navigable tabs. 'adminOnly: true' means only admin role sees it.
const ALL_NAV_ITEMS = [
  { name: 'Dashboard',               icon: LayoutDashboard, page: 'Dashboard' },
  { name: 'Atendimentos',            icon: Briefcase,       page: 'Atendimentos' },
  { name: 'Tarefas',                 icon: CheckSquare,     page: 'Tarefas' },
  { name: 'Administrativo INSS',     icon: Building2,       page: 'AdministrativoINSS' },
  { name: 'Agenda',                  icon: Calendar,        page: 'Agenda' },
  { name: 'Aguardando Docs',         icon: History,         page: 'AguardandoDocumentos' },
  { name: 'Clientes',                icon: Users,           page: 'Clientes' },
  { name: 'Comercial',               icon: TrendingUp,      page: 'ComercialDashboard' },
  { name: 'Controle de Execução',    icon: History,         page: 'ControleExecucao' },
  { name: 'Financeiro',              icon: TrendingUp,      page: 'Financeiro' },
  { name: 'Gerador de Documentos',   icon: FileText,        page: 'GeradorDocumentos' },
  { name: 'Livro, Mentoria & Clube', icon: BookOpen,        page: 'ProdutosEducacionais' },
  { name: 'Manual do Escritório',    icon: History,         page: 'ManualEscritorio' },
  { name: 'Marketing',               icon: TrendingUp,      page: 'Marketing' },
  { name: 'Metodologia RESULT',      icon: History,         page: 'MetodologiaRESULT' },
  { name: 'Monitoramento Processual',icon: Scale,           page: 'MonitoramentoProcessual' },
  { name: 'Painel de Ação da CEO',   icon: Bell,            page: 'PainelAcaoCEO' },
  { name: 'Pessoas',                 icon: Users,           page: 'Pessoas' },
  { name: 'Processos',               icon: Scale,           page: 'Processos' },
  { name: 'Produtividade',           icon: BarChart3,       page: 'Produtividade' },
  { name: 'Retorno ao Cliente',      icon: History,         page: 'RetornoCliente' },
  { name: 'Setores',                 icon: Building2,       page: 'Setores' },
  { name: 'Folha de Ponto',          icon: Clock,           page: 'FolhaDePonto' },
  { name: 'Histórico',               icon: History,         page: 'Historico' },
  // Admin-only — always visible to admin, never to regular users
  { name: 'Perfis',                  icon: UserCog,         page: 'Perfis', adminOnly: true },
];

function UserAvatar({ user, size = 'sm' }) {
  const cls = size === 'sm' ? 'h-7 w-7 text-xs' : 'h-9 w-9 text-sm';
  if (user?.avatar_url) {
    return (
      <img
        src={user.avatar_url}
        alt={user.full_name}
        className={`${cls} rounded-full object-cover border border-rose-200 flex-shrink-0`}
      />
    );
  }
  const letter = (user?.full_name || user?.email || 'U').charAt(0).toUpperCase();
  return (
    <div className={`${cls} rounded-full bg-gradient-to-br from-rose-500 to-pink-600 text-white font-semibold flex items-center justify-center flex-shrink-0`}>
      {letter}
    </div>
  );
}

export default function Layout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, isAdmin, allowedTabs, logout } = useAuth();

  const { data: notificacoes = [] } = useQuery({
    queryKey: ['notificacoes-nao-lidas'],
    queryFn: async () => {
      const all = await base44.entities.Notificacao.list('-created_date', 100);
      return all.filter(n => !n.lida);
    },
    refetchInterval: 30000,
  });

  // Filter nav items:
  // - adminOnly items → only for admin
  // - allowedTabs === null → admin, sees everything (except adminOnly on regular nav)
  // - allowedTabs === [] → user with no tabs configured → show nothing except what was assigned
  const visibleNavItems = ALL_NAV_ITEMS.filter(item => {
    if (item.adminOnly) return isAdmin;
    if (isAdmin) return true;               // admin sees all non-adminOnly items
    return (allowedTabs ?? []).includes(item.page);
  });

  const NavLink = ({ item, onClick }) => {
    const isActive = currentPageName === item.page;
    return (
      <Link
        to={createPageUrl(item.page)}
        onClick={onClick}
        className={cn(
          'group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200',
          isActive
            ? 'bg-rose-600 text-white shadow-sm'
            : 'text-slate-700 hover:bg-slate-100'
        )}
      >
        <item.icon className={cn('h-5 w-5', isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-700')} />
        <span className="flex-1">{item.name}</span>
        {isActive && <ChevronRight className="h-4 w-4" />}
      </Link>
    );
  };

  const { modo_exibicao, savePreferences } = useTheme() || {};
  const isDark = modo_exibicao === 'escuro';
  const toggleDark = () => savePreferences?.(undefined, isDark ? 'claro' : 'escuro');

  const UserMenu = ({ side = 'top', onItemClick }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-full justify-start text-foreground hover:bg-rose-50 dark:hover:bg-rose-950/30 border-border gap-2">
          <UserAvatar user={user} size="sm" />
          <span className="flex-1 text-left truncate">{user?.full_name?.split(' ')[0] || 'Usuário'}</span>
          <MoreHorizontal className="h-4 w-4 flex-shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side={side} align="start" className="w-56">
        <div className="px-2 py-2 border-b border-border mb-1">
          <p className="text-xs font-semibold text-foreground">{user?.full_name || 'Usuário'}</p>
          <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          {isAdmin && <Badge className="mt-1 bg-rose-100 text-rose-700 border-rose-200 text-[10px]">Admin</Badge>}
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
              <Badge className="ml-auto bg-red-500 text-white border-0 h-4 min-w-4 flex items-center justify-center p-0 text-[10px]">
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
          {isDark
            ? <><Sun  className="mr-2 h-4 w-4 text-amber-500" />Modo Claro</>
            : <><Moon className="mr-2 h-4 w-4 text-indigo-400" />Modo Escuro</>
          }
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logout} className="text-red-600">
          <LogOut className="mr-2 h-4 w-4" />Sair do Sistema
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const SidebarContent = ({ onLinkClick }) => (
    <div className="flex h-full flex-col">
      <div className="flex h-20 items-center justify-between border-b border-slate-200 px-6">
        <img
          src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695e55f5aacb579357377cf5/0a9116bf7_LOGOFUNDOBRANCO1.jpg"
          alt="MCRA Logo"
          className="h-14"
        />
        {onLinkClick && (
          <Button variant="ghost" size="icon" onClick={onLinkClick}>
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>
      <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
        {visibleNavItems.map(item => (
          <NavLink key={item.page} item={item} onClick={onLinkClick} />
        ))}
      </nav>
      <div className="border-t border-slate-200 p-4 flex-shrink-0">
        <div className="rounded-xl bg-slate-50 p-3 border border-slate-200 mb-3">
          <p className="text-xs text-slate-500">Sistema de Gestão</p>
          <p className="text-sm font-semibold text-slate-800">MCR ADVOCACIA</p>
          <p className="text-xs text-slate-400 mt-1">Criado por Larissa Silvério</p>
        </div>
        <UserMenu side="top" onItemClick={onLinkClick} />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile Header */}
      <header className="fixed top-0 left-0 right-0 z-50 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 lg:hidden">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)} className="lg:hidden">
            <Menu className="h-5 w-5" />
          </Button>
          <img
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695e55f5aacb579357377cf5/0a9116bf7_LOGOFUNDOBRANCO1.jpg"
            alt="MCRA Logo"
            className="h-12"
          />
        </div>
      </header>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/50 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: -288 }} animate={{ x: 0 }} exit={{ x: -288 }}
              transition={{ type: 'spring', damping: 25 }}
              className="fixed left-0 top-0 z-50 h-full w-72 border-r border-slate-200 bg-white lg:hidden"
            >
              <SidebarContent onLinkClick={() => setSidebarOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <aside className="fixed left-0 top-0 z-40 h-full w-72 border-r border-slate-200 bg-white lg:block hidden">
        <SidebarContent onLinkClick={null} />
      </aside>

      {/* Main Content */}
      <main className="pt-16 lg:pl-72 lg:pt-0">
        {children}
      </main>
    </div>
  );
}
