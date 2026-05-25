import {
  BarChart3,
  Bell,
  BookOpen,
  Briefcase,
  Building2,
  Calendar,
  CheckSquare,
  Clock,
  FileText,
  History,
  LayoutDashboard,
  Scale,
  Target,
  TrendingUp,
  UserCog,
  Users,
} from 'lucide-react';

export const ALL_NAV_ITEMS = [
  { name: 'Dashboard', icon: LayoutDashboard, page: 'Dashboard' },
  { name: 'Atendimentos', icon: Briefcase, page: 'Atendimentos' },
  { name: 'Tarefas', icon: CheckSquare, page: 'Tarefas' },
  { name: 'Administrativo INSS', icon: Building2, page: 'AdministrativoINSS' },
  { name: 'Agenda', icon: Calendar, page: 'Agenda' },
  { name: 'Aguardando Docs', icon: History, page: 'AguardandoDocumentos' },
  { name: 'Clientes', icon: Users, page: 'Clientes' },
  { name: 'Comercial', icon: TrendingUp, page: 'ComercialDashboard' },
  { name: 'Controle de Execução', icon: History, page: 'ControleExecucao' },
  { name: 'Financeiro', icon: TrendingUp, page: 'Financeiro' },
  { name: 'Gerador de Documentos', icon: FileText, page: 'GeradorDocumentos' },
  { name: 'Livro, Mentoria & Clube', icon: BookOpen, page: 'ProdutosEducacionais' },
  { name: 'Manual do Escritório', icon: History, page: 'ManualEscritorio' },
  { name: 'Marketing', icon: TrendingUp, page: 'Marketing' },
  { name: 'Metodologia RESULT', icon: History, page: 'MetodologiaRESULT' },
  { name: 'Monitoramento Processual', icon: Scale, page: 'MonitoramentoProcessual' },
  { name: 'Painel da CEO', icon: Target, page: 'PainelAcaoCEO' },
  { name: 'Pessoas', icon: Users, page: 'Pessoas' },
  { name: 'Processos', icon: Scale, page: 'Processos' },
  { name: 'Produtividade', icon: BarChart3, page: 'Produtividade' },
  { name: 'Projeto 12 Semanas', icon: Bell, page: 'Projeto12Semanas' },
  { name: 'Retorno ao Cliente', icon: History, page: 'RetornoCliente' },
  { name: 'Setores', icon: Building2, page: 'Setores' },
  { name: 'Folha de Ponto', icon: Clock, page: 'FolhaDePonto' },
  { name: 'Histórico', icon: History, page: 'Historico' },
  { name: 'Perfis', icon: UserCog, page: 'Perfis', adminOnly: true },
];

export const PROFILE_TAB_ITEMS = ALL_NAV_ITEMS
  .filter((item) => !item.adminOnly)
  .map((item) => ({ page: item.page, label: item.name }));

export const DEFAULT_ALLOWED_TABS = [
  'Dashboard',
  'Atendimentos',
  'Tarefas',
  'AdministrativoINSS',
  'Agenda',
  'AguardandoDocumentos',
  'Clientes',
  'ControleExecucao',
  'Financeiro',
  'Marketing',
  'MonitoramentoProcessual',
  'Pessoas',
  'Processos',
  'RetornoCliente',
  'Setores',
];

export function getVisibleNavItems({ isAdmin, allowedTabs }) {
  return ALL_NAV_ITEMS.filter((item) => {
    if (item.adminOnly) return isAdmin;
    if (isAdmin) return true;
    return (allowedTabs ?? []).includes(item.page);
  });
}
