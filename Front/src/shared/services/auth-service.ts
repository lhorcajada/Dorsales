import type { Session, User } from '@supabase/supabase-js';

import type { AuthCredentials, AuthRegisterInput, AuthUser, UserRole } from '../types/auth';
import { appPaths } from '../../router/paths';

import { getSupabaseClient, hasSupabaseConfig } from './supabase';

interface ProfileRow {
  id: string;
  email: string;
  display_name: string;
  role: string;
}

interface ChildRow {
  id: string;
}

interface AuthErrorLike {
  code?: string;
  message?: string;
  status?: number;
}

const DEV_AUTH_MOCK_ENABLED = import.meta.env.DEV && import.meta.env.VITE_DEV_AUTH_MOCK !== 'false';
const DEV_AUTH_MOCK_STORAGE_KEY = 'dorsales-dev-auth-user';
const DEV_ADMIN_EMAIL = (import.meta.env.VITE_DEV_ADMIN_EMAIL ?? 'admin@dorsales.local').trim();
const DEV_ADMIN_PASSWORD = import.meta.env.VITE_DEV_ADMIN_PASSWORD ?? 'admin123';
const DEV_ADMIN_NAME = (import.meta.env.VITE_DEV_ADMIN_NAME ?? 'Administrador de desarrollo').trim();
const DEV_ADMIN_ID = (import.meta.env.VITE_DEV_ADMIN_ID ?? 'dev-admin').trim();

const DEV_ADMIN_USER: AuthUser = {
  id: DEV_ADMIN_ID,
  name: DEV_ADMIN_NAME,
  email: DEV_ADMIN_EMAIL,
  role: 'admin',
  childIds: [],
};

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  email_not_confirmed: 'Debes confirmar tu correo antes de iniciar sesión.',
  invalid_credentials: 'El email o la contraseña no son correctos.',
  invalid_login_credentials: 'El email o la contraseña no son correctos.',
  email_address_invalid: 'El email no tiene un formato válido.',
  weak_password: 'La contraseña debe tener al menos 6 caracteres.',
  over_email_send_rate_limit:
    'Has pedido demasiados correos seguidos. Espera unos minutos e inténtalo de nuevo.',
};

const AUTH_MESSAGE_TRANSLATIONS: Record<string, string> = {
  'Email not confirmed': 'Debes confirmar tu correo antes de iniciar sesión.',
  'Invalid login credentials': 'El email o la contraseña no son correctos.',
  'Email address is invalid': 'El email no tiene un formato válido.',
  'Password should be at least 6 characters': 'La contraseña debe tener al menos 6 caracteres.',
  'New password should be different from the old password':
    'La nueva contraseña debe ser distinta de la anterior.',
  'Email rate limit exceeded':
    'Has pedido demasiados correos seguidos. Espera unos minutos e inténtalo de nuevo.',
};

const DEFAULT_LOGIN_ERROR_MESSAGE = 'No se ha podido iniciar sesión. Inténtalo de nuevo.';
const LOGIN_RETRY_ERROR_MESSAGE = 'No se ha podido iniciar sesión. Revisa tus datos e inténtalo de nuevo.';

function canUseLocalStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function isDevelopmentAdminCredentials(credentials: AuthCredentials) {
  return (
    credentials.email.trim().toLowerCase() === DEV_ADMIN_EMAIL.toLowerCase() &&
    credentials.password === DEV_ADMIN_PASSWORD
  );
}

function readMockAuthUser() {
  if (!DEV_AUTH_MOCK_ENABLED || !canUseLocalStorage()) {
    return null;
  }

  const storedUser = window.localStorage.getItem(DEV_AUTH_MOCK_STORAGE_KEY);

  if (!storedUser) {
    return null;
  }

  try {
    const parsedUser = JSON.parse(storedUser) as Partial<AuthUser>;

    if (typeof parsedUser.email !== 'string' || parsedUser.email.trim() === '') {
      return null;
    }

    return {
      ...DEV_ADMIN_USER,
      ...parsedUser,
      role: 'admin',
      childIds: Array.isArray(parsedUser.childIds) ? parsedUser.childIds : [],
    } satisfies AuthUser;
  } catch {
    return null;
  }
}

function storeMockAuthUser(user: AuthUser) {
  if (!DEV_AUTH_MOCK_ENABLED || !canUseLocalStorage()) {
    return;
  }

  window.localStorage.setItem(DEV_AUTH_MOCK_STORAGE_KEY, JSON.stringify(user));
}

function clearMockAuthUser() {
  if (!canUseLocalStorage()) {
    return;
  }

  window.localStorage.removeItem(DEV_AUTH_MOCK_STORAGE_KEY);
}

export function isDevelopmentAuthMockEnabled() {
  return DEV_AUTH_MOCK_ENABLED;
}

export function getDevelopmentAdminCredentials(): AuthCredentials {
  return {
    email: DEV_ADMIN_EMAIL,
    password: DEV_ADMIN_PASSWORD,
  };
}

export async function signInAsDevelopmentAdmin() {
  if (!DEV_AUTH_MOCK_ENABLED) {
    throw new Error('El mock de autenticación de desarrollo no está activado.');
  }

  storeMockAuthUser(DEV_ADMIN_USER);
  return DEV_ADMIN_USER;
}

function getDisplayName(user: User) {
  const metadataName = user.user_metadata?.display_name ?? user.user_metadata?.full_name;

  if (typeof metadataName === 'string' && metadataName.trim()) {
    return metadataName.trim();
  }

  return user.email?.split('@')[0] ?? 'Usuario';
}

function normalizeRole(role: string | null | undefined): UserRole {
  return role === 'admin' ? 'admin' : 'user';
}

export function getLocalizedAuthErrorMessage(
  error: unknown,
  fallbackMessage = DEFAULT_LOGIN_ERROR_MESSAGE,
) {
  if (!error || typeof error !== 'object') {
    return fallbackMessage;
  }

  const authError = error as AuthErrorLike;
  const normalizedCode = authError.code?.trim().toLowerCase();

  if (normalizedCode && AUTH_ERROR_MESSAGES[normalizedCode]) {
    return AUTH_ERROR_MESSAGES[normalizedCode];
  }

  const normalizedMessage = authError.message?.trim();

  if (normalizedMessage && AUTH_MESSAGE_TRANSLATIONS[normalizedMessage]) {
    return AUTH_MESSAGE_TRANSLATIONS[normalizedMessage];
  }

  if (authError.status === 400) {
    return fallbackMessage === DEFAULT_LOGIN_ERROR_MESSAGE ? LOGIN_RETRY_ERROR_MESSAGE : fallbackMessage;
  }

  return normalizedMessage ?? fallbackMessage;
}

export async function requestPasswordReset(email: string) {
  const supabase = getSupabaseClient();
  const redirectTo = new URL(appPaths.resetPassword, window.location.origin).toString();
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

  if (error) {
    throw error;
  }
}

export async function updatePassword(password: string) {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    throw error;
  }
}

async function ensureProfile(user: User) {
  const supabase = getSupabaseClient();

  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id, email, display_name, role')
    .eq('id', user.id)
    .maybeSingle<ProfileRow>();

  if (existingProfile) {
    return existingProfile;
  }

  const { error: upsertError } = await supabase.from('profiles').upsert(
    {
      id: user.id,
      email: user.email ?? '',
      display_name: getDisplayName(user),
      role: 'user',
    } as never,
    { onConflict: 'id' },
  );

  if (upsertError) {
    throw upsertError;
  }

  const { data: createdProfile, error: profileError } = await supabase
    .from('profiles')
    .select('id, email, display_name, role')
    .eq('id', user.id)
    .single<ProfileRow>();

  if (profileError) {
    throw profileError;
  }

  return createdProfile;
}

async function loadChildren(parentId: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('children')
    .select('id')
    .eq('parent_id', parentId)
    .returns<ChildRow[]>();

  if (error) {
    throw error;
  }

  return (data ?? []).map((child) => child.id);
}

async function upsertChild(parentId: string, childName: string) {
  const trimmedName = childName.trim();

  if (!trimmedName) {
    return;
  }

  const supabase = getSupabaseClient();
  const { error } = await supabase.from('children').upsert(
    {
      parent_id: parentId,
      full_name: trimmedName,
    } as never,
    { onConflict: 'parent_id,full_name' },
  );

  if (error) {
    throw error;
  }
}

async function loadCurrentUser(session: Session | null) {
  if (!session) {
    return null;
  }

  clearMockAuthUser();

  const profile = await ensureProfile(session.user);
  const childIds = await loadChildren(session.user.id);

  return {
    id: profile.id,
    name: profile.display_name,
    email: profile.email,
    role: normalizeRole(profile.role),
    childIds,
  } satisfies AuthUser;
}

export async function getSignedInUser() {
  if (!hasSupabaseConfig()) {
    return readMockAuthUser();
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  return loadCurrentUser(data.session);
}

export async function signIn(credentials: AuthCredentials) {
  if (DEV_AUTH_MOCK_ENABLED && isDevelopmentAdminCredentials(credentials)) {
    storeMockAuthUser(DEV_ADMIN_USER);
    return DEV_ADMIN_USER;
  }

  if (!hasSupabaseConfig()) {
    throw new Error('Configura Supabase o activa el mock de autenticación de desarrollo.');
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword(credentials);

  if (error) {
    throw error;
  }

  clearMockAuthUser();
  return loadCurrentUser(data.session);
}

export async function signUp(input: AuthRegisterInput) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: {
        display_name: input.name,
        full_name: input.name,
        child_name: input.childName,
      },
    },
  });

  if (error) {
    throw error;
  }

  if (data.session) {
    await upsertChild(data.session.user.id, input.childName);
    return loadCurrentUser(data.session);
  }

  return null;
}

export async function signOut() {
  if (DEV_AUTH_MOCK_ENABLED && readMockAuthUser()) {
    clearMockAuthUser();
    return;
  }

  if (!hasSupabaseConfig()) {
    return;
  }

  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }

  clearMockAuthUser();
}
