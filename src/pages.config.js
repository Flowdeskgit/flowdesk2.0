/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import AdministrativoINSS from './pages/AdministrativoINSS';
import GeradorDocumentos from './pages/GeradorDocumentos';
import Agenda from './pages/Agenda';
import AgendaComercial from './pages/AgendaComercial';
import AguardandoDocumentos from './pages/AguardandoDocumentos';
import Alertas from './pages/Alertas';
import AndamentoAdministrativo from './pages/AndamentoAdministrativo';
import Atendimentos from './pages/Atendimentos';
import BlocoDeNotas from './pages/BlocoDeNotas';
import CentralAdminINSS from './pages/CentralAdminINSS';
import ClienteDetalhe from './pages/ClienteDetalhe';
import Clientes from './pages/Clientes';
import ComercialDashboard from './pages/ComercialDashboard';
import Configuracoes from './pages/Configuracoes';
import ConfiguracoesIA from './pages/ConfiguracoesIA';
import ControleExecucao from './pages/ControleExecucao';
import Dashboard from './pages/Dashboard';
import Historico from './pages/Historico';
import LandingPages from './pages/LandingPages';
import ManualEscritorio from './pages/ManualEscritorio';
import MetodologiaRESULT from './pages/MetodologiaRESULT';
import MeuPerfil from './pages/MeuPerfil';
import MonitoramentoProcessual from './pages/MonitoramentoProcessual';
import Notificacoes from './pages/Notificacoes';
import PainelAcaoCEO from './pages/PainelAcaoCEO';
import Pessoas from './pages/Pessoas';
import PostsMarketing from './pages/PostsMarketing';
import Processos from './pages/Processos';
import Produtividade from './pages/Produtividade';
import Projeto12Semanas from './pages/Projeto12Semanas';
import RetornoCliente from './pages/RetornoCliente';
import Setores from './pages/Setores';
import Tarefas from './pages/Tarefas';
import Financeiro from './pages/Financeiro';
import ProdutosEducacionais from './pages/ProdutosEducacionais';
import Marketing from './pages/Marketing';
import FolhaDePonto from './pages/FolhaDePonto';
import Perfis from './pages/Perfis';
import Login from './pages/Login';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AdministrativoINSS": AdministrativoINSS,
    "GeradorDocumentos": GeradorDocumentos,
    "Agenda": Agenda,
    "AgendaComercial": AgendaComercial,
    "AguardandoDocumentos": AguardandoDocumentos,
    "Alertas": Alertas,
    "AndamentoAdministrativo": AndamentoAdministrativo,
    "Atendimentos": Atendimentos,
    "BlocoDeNotas": BlocoDeNotas,
    "CentralAdminINSS": CentralAdminINSS,
    "ClienteDetalhe": ClienteDetalhe,
    "Clientes": Clientes,
    "ComercialDashboard": ComercialDashboard,
    "Configuracoes": Configuracoes,
    "ConfiguracoesIA": ConfiguracoesIA,
    "ControleExecucao": ControleExecucao,
    "Dashboard": Dashboard,
    "Historico": Historico,
    "LandingPages": LandingPages,
    "ManualEscritorio": ManualEscritorio,
    "MetodologiaRESULT": MetodologiaRESULT,
    "MeuPerfil": MeuPerfil,
    "MonitoramentoProcessual": MonitoramentoProcessual,
    "Notificacoes": Notificacoes,
    "PainelAcaoCEO": PainelAcaoCEO,
    "Pessoas": Pessoas,
    "PostsMarketing": PostsMarketing,
    "Processos": Processos,
    "Produtividade": Produtividade,
    "Projeto12Semanas": Projeto12Semanas,
    "RetornoCliente": RetornoCliente,
    "Setores": Setores,
    "Tarefas": Tarefas,
    "Financeiro": Financeiro,
    "ProdutosEducacionais": ProdutosEducacionais,
    "Marketing": Marketing,
    "FolhaDePonto": FolhaDePonto,
    "Perfis": Perfis,
    "Login": Login,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};