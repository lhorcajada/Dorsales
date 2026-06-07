import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';

import { AuthContext, type AuthContextValue } from './auth-context';
import {
  getSignedInUser,
  isDevelopmentAuthMockEnabled,
  signIn,
  signOut,
  signUp,
} from '../services/auth-service';
import type { AuthCredentials, AuthRegisterInput, AuthUser } from '../types/auth';
import { getSupabaseClient, hasSupabaseConfig } from '../services/supabase';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    if (!hasSupabaseConfig() && !isDevelopmentAuthMockEnabled()) {
      setError('Configura VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY para usar autenticación real.');
      setIsLoading(false);
      return undefined;
    }

    const syncSession = async (session: Session | null) => {
      try {
        setSession(session);
        const nextUser = await getSignedInUser();

        if (mounted) {
          setCurrentUser(nextUser);
          setError(null);
        }
      } catch (syncError) {
        if (mounted) {
          setError(syncError instanceof Error ? syncError.message : 'No se pudo leer la sesión de Supabase.');
          setCurrentUser(null);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    const bootstrap = async () => {
      if (!hasSupabaseConfig()) {
        await syncSession(null);
        return;
      }

      const supabase = getSupabaseClient();
      const { data } = await supabase.auth.getSession();
      await syncSession(data.session);
    };

    void bootstrap();

    const supabase = hasSupabaseConfig() ? getSupabaseClient() : null;
    const data = supabase
      ? supabase.auth.onAuthStateChange((_event, session) => {
          void syncSession(session);
        })
      : null;

    return () => {
      mounted = false;
      data?.data.subscription.unsubscribe();
    };
  }, []);

  const handleLogin = async (credentials: AuthCredentials) => {
    setError(null);
    const nextUser = await signIn(credentials);
    setCurrentUser(nextUser);
  };

  const handleRegister = async (input: AuthRegisterInput) => {
    setError(null);
    const nextUser = await signUp(input);

    if (nextUser) {
      setCurrentUser(nextUser);
      return { authenticated: true };
    }

    return { authenticated: false };
  };

  const handleLogout = async () => {
    setError(null);
    await signOut();
    setCurrentUser(null);
    setSession(null);
  };

  const refreshProfile = async () => {
    if (!session?.user) {
      return;
    }

    setCurrentUser(await getSignedInUser());
  };

  const clearError = () => setError(null);

  const value: AuthContextValue = {
    currentUser,
    session,
    isAuthenticated: Boolean(currentUser),
    isLoading,
    error,
    login: handleLogin,
    register: handleRegister,
    logout: handleLogout,
    refreshProfile,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}