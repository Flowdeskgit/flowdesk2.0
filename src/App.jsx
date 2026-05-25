import { Toaster } from '@/components/ui/toaster';
import NavigationTracker from '@/lib/NavigationTracker';
import PageNotFound from '@/lib/PageNotFound';
import { queryClientInstance } from '@/lib/query-client';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { ThemeProvider } from '@/lib/ThemeContext';
import Login from '@/pages/Login';
import { pagesConfig } from './pages.config';
import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : () => null;

function useCurrentPageName() {
  const { pathname } = useLocation();
  if (pathname === '/') return mainPageKey;
  return pathname.slice(1);
}

const AppRoutes = () => {
  const { isLoadingAuth, isAuthenticated, authError, logout } = useAuth();
  const currentPageName = useCurrentPageName();

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-brand-electric" />
      </div>
    );
  }

  if (authError?.type === 'no_profile') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="max-w-md space-y-4 text-center">
          <h2 className="text-xl font-semibold text-foreground">Perfil não encontrado</h2>
          <p className="text-muted-foreground">{authError.message}</p>
          <button
            type="button"
            onClick={logout}
            className="text-sm font-medium text-brand-electric underline underline-offset-4"
          >
            Sair e tentar novamente
          </button>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

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
