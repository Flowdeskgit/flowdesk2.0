import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { ThemeProvider } from '@/lib/ThemeContext';
import Login from '@/pages/Login';
import { supabase } from '@/api/supabaseClient';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

// Derive the current page name from the URL so Layout can highlight the active nav item
function useCurrentPageName() {
  const { pathname } = useLocation();
  if (pathname === '/') return mainPageKey;
  // Strip leading slash: "/Clientes" → "Clientes"
  return pathname.slice(1);
}

const AppRoutes = () => {
  const { isLoadingAuth, isAuthenticated, authError } = useAuth();
  const currentPageName = useCurrentPageName();

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-rose-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  if (authError?.type === 'no_profile') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
        <div className="max-w-md text-center space-y-4">
          <h2 className="text-xl font-semibold text-slate-800">Perfil não encontrado</h2>
          <p className="text-slate-600">{authError.message}</p>
          <button
            onClick={() => supabase.auth.signOut()}
            className="text-rose-600 underline text-sm"
          >
            Sair e tentar novamente
          </button>
        </div>
      </div>
    );
  }

  // Layout is rendered ONCE here and persists across navigation.
  // Only the inner <Routes> content swaps — sidebar scroll position is preserved.
  const content = (
    <Routes>
      <Route path="/" element={<MainPage />} />
      {Object.entries(Pages).map(([path, Page]) => (
        <Route key={path} path={`/${path}`} element={<Page />} />
      ))}
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );

  return Layout
    ? <Layout currentPageName={currentPageName}>{content}</Layout>
    : content;
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <NavigationTracker />
            <AppRoutes />
          </Router>
          <Toaster />
        </QueryClientProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
