import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { flowdesk, supabase } from '@/api/flowdeskClient';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [isLoadingPublicSettings] = useState(false);

  const fetchProfile = async (authUser) => {
    if (!authUser) {
      setUser(null);
      setProfile(null);
      setIsAuthenticated(false);
      setAuthError(null);
      return null;
    }

    try {
      const currentProfile = await flowdesk.auth.me();
      setUser(currentProfile);
      setProfile(currentProfile);
      setIsAuthenticated(true);
      setAuthError(null);
      return currentProfile;
    } catch (error) {
      setUser(null);
      setProfile(null);
      setIsAuthenticated(false);
      setAuthError({
        type: 'no_profile',
        message: error.message || 'Perfil não encontrado. Contate o administrador.',
      });
      return null;
    }
  };

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      fetchProfile(session?.user ?? null).finally(() => {
        if (mounted) setIsLoadingAuth(false);
      });
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setIsLoadingAuth(true);
      fetchProfile(session?.user ?? null).finally(() => {
        if (mounted) setIsLoadingAuth(false);
      });
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const logout = async () => {
    await flowdesk.auth.logout();
    setUser(null);
    setProfile(null);
    setIsAuthenticated(false);
    setAuthError(null);
  };

  const refetchProfile = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    return fetchProfile(authUser);
  };

  const value = useMemo(() => {
    const isAdmin = profile?.role === 'admin';
    return {
      user,
      profile,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings: null,
      isAdmin,
      allowedTabs: isAdmin ? null : (profile?.allowed_tabs ?? []),
      logout,
      navigateToLogin: logout,
      refetchProfile,
      checkAppState: refetchProfile,
    };
  }, [user, profile, isAuthenticated, isLoadingAuth, isLoadingPublicSettings, authError]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
