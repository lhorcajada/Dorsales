import { createContext } from 'react';
import type { Session } from '@supabase/supabase-js';

import type { AuthCredentials, AuthRegisterInput, AuthUser } from '../types/auth';

export interface AuthContextValue {
  currentUser: AuthUser | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (credentials: AuthCredentials) => Promise<void>;
  register: (input: AuthRegisterInput) => Promise<{ authenticated: boolean }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  clearError: () => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);