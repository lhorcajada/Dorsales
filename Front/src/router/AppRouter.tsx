import { lazy, Suspense } from 'react';

import { Navigate, Route, Routes } from 'react-router-dom';

import { AppShell } from '../shared/components/AppShell/AppShell';
import { LoadingState } from '../shared/components/LoadingState/LoadingState';

import { RequireAuth } from './RequireAuth';
import { appPaths } from './paths';

const HomeScreen = lazy(() => import('../features/home/HomeScreen'));
const ContestScreen = lazy(() => import('../features/contest/ContestScreen'));
const AdminScreen = lazy(() => import('../features/admin/AdminScreen'));
const IncidentsScreen = lazy(() => import('../features/admin/IncidentsScreen'));
const LoginScreen = lazy(() => import('../features/auth/LoginScreen'));
const RegisterScreen = lazy(() => import('../features/auth/RegisterScreen'));
const ForgotPasswordScreen = lazy(() => import('../features/auth/ForgotPasswordScreen'));
const ResetPasswordScreen = lazy(() => import('../features/auth/ResetPasswordScreen'));
const NotFoundScreen = lazy(() => import('../features/not-found/NotFoundScreen'));
const ErrorScreen = lazy(() => import('../features/error/ErrorScreen'));

export function AppRouter() {
  return (
    <Suspense fallback={<LoadingState />}>
      <Routes>
        <Route path="/" element={<Navigate replace to={appPaths.home} />} />
        <Route path={appPaths.login} element={<LoginScreen />} />
        <Route path={appPaths.register} element={<RegisterScreen />} />
        <Route path={appPaths.forgotPassword} element={<ForgotPasswordScreen />} />
        <Route path={appPaths.resetPassword} element={<ResetPasswordScreen />} />
        <Route path={appPaths.error} element={<ErrorScreen />} />

        <Route
          element={
            <RequireAuth>
              <AppShell />
            </RequireAuth>
          }
        >
          <Route path={appPaths.home} element={<HomeScreen />} />
          <Route path={appPaths.contest} element={<ContestScreen />} />
          <Route
            path={appPaths.admin}
            element={
              <RequireAuth requiredRole="admin">
                <AdminScreen />
              </RequireAuth>
            }
          />
          <Route
            path={appPaths.incidents}
            element={
              <RequireAuth requiredRole="admin">
                <IncidentsScreen />
              </RequireAuth>
            }
          />
        </Route>

        <Route path="*" element={<NotFoundScreen />} />
      </Routes>
    </Suspense>
  );
}