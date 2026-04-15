import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);         // auth.users row
  const [profile, setProfile] = useState(null);   // profiles row
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);

  // Fetch profile record from DB for a given auth user
  const fetchProfile = async (authUser) => {
    if (!authUser) {
      setProfile(null);
      setUser(null);
      setIsAuthenticated(false);
      return;
    }
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .single();

    if (error || !data) {
      setAuthError({ type: 'no_profile', message: 'Perfil não encontrado. Contate o administrador.' });
      setIsAuthenticated(false);
    } else {
      setUser({ ...data, email: authUser.email });
      setProfile(data);
      setIsAuthenticated(true);
      setAuthError(null);
    }
  };

  useEffect(() => {
    // Check existing session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      fetchProfile(session?.user ?? null).finally(() => setIsLoadingAuth(false));
    });

    // Listen for auth state changes (login / logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      fetchProfile(session?.user ?? null).finally(() => setIsLoadingAuth(false));
    });

    return () => subscription.unsubscribe();
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setIsAuthenticated(false);
  };

  const navigateToLogin = () => {
    // Handled by App.jsx routing — just clear state
    logout();
  };

  const isAdmin = profile?.role === 'admin';

  // allowed_tabs: admin sees everything (null = no restriction), others see their list
  const allowedTabs = isAdmin ? null : (profile?.allowed_tabs ?? []);

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings: null,
      isAdmin,
      allowedTabs,
      logout,
      navigateToLogin,
      refetchProfile: () => supabase.auth.getUser().then(({ data: { user: u } }) => fetchProfile(u)),
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
