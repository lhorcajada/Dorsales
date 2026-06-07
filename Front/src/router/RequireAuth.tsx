import type { ReactNode } from 'react';

import { Navigate } from 'react-router-dom';

import { LoadingState } from '../shared/components/LoadingState/LoadingState';
import { useAuth } from '../shared/hooks/useAuth';
import type { UserRole } from '../shared/types/auth';

import { appPaths } from './paths';

interface RequireAuthProps {
  children: ReactNode;
  requiredRole?: UserRole;
}

export function RequireAuth({ children, requiredRole }: RequireAuthProps) {
  const { currentUser, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingState label="Comprobando tu sesión..." />;
  }

  if (!isAuthenticated) {
    return <Navigate replace to={appPaths.login} />;
  }

  if (requiredRole && currentUser?.role !== requiredRole) {
    return <Navigate replace to={appPaths.home} />;
  }

  return children;
}