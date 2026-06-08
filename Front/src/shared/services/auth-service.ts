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
  full_name: string;
}

interface AuthErrorLike {
  code?: string;
  message?: string;
  status?: number;
}

type ChildLinkedLookupRpcClient = {
  rpc(
    functionName: 'is_child_already_linked',
    args: { p_child_name: string },
  ): Promise<{ data: boolean | null; error: { code?: string; message?: string } | null }>;
};



type IncidentStatus = 'pending' | 'review' | 'resolved';
type IncidentSeverity = 'low' | 'medium' | 'high';

type RegisterIncidentRpcClient = {
  rpc(
    functionName: 'register_incident',
    args: {
      p_user_id: string | null;
      p_dorsal_number: number | null;
      p_kind: string;
      p_title: string;
      p_description: string;
      p_user_email: string | null;
      p_status: IncidentStatus;
      p_severity: IncidentSeverity;
      p_source: string;
      p_details: Record<string, unknown>;
    },
  ): Promise<{ error: { code?: string; message?: string } | null }>;
};

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
  childNames: [],
};

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  email_not_confirmed: 'Debes confirmar tu correo antes de iniciar sesión.',
  invalid_credentials: 'El email o la contraseña no son correctos.',
  invalid_login_credentials: 'El email o la contraseña no son correctos.',
  user_not_registered: 'Usted no está registrado en la aplicación, por favor, regístrese',
  user_without_linked_child: 'Tu cuenta no tiene un jugador vinculado. Contacta con un administrador.',
  email_address_invalid: 'El email no tiene un formato válido.',
  weak_password: 'La contraseña debe tener al menos 6 caracteres.',
  over_email_send_rate_limit:
    'Has pedido demasiados correos seguidos. Espera unos minutos e inténtalo de nuevo.',
  '42501': 'No se pudo preparar tu perfil. Vuelve a intentarlo en unos segundos.',
};

const AUTH_MESSAGE_TRANSLATIONS: Record<string, string> = {
  'Email not confirmed': 'Debes confirmar tu correo antes de iniciar sesión.',
  'Invalid login credentials': 'El email o la contraseña no son correctos.',
  'User not registered': 'Usted no está registrado en la aplicación, por favor, regístrese',
  'User without linked child': 'Tu cuenta no tiene un jugador vinculado. Contacta con un administrador.',
  'User already registered': 'El jugador ya ha sido vinculado con otra cuenta.',
  'User already register': 'El jugador ya ha sido vinculado con otra cuenta.',
  'Email address is invalid': 'El email no tiene un formato válido.',
  'Password should be at least 6 characters': 'La contraseña debe tener al menos 6 caracteres.',
  'New password should be different from the old password':
    'La nueva contraseña debe ser distinta de la anterior.',
  'Email rate limit exceeded':
    'Has pedido demasiados correos seguidos. Espera unos minutos e inténtalo de nuevo.',
  'new row violates row-level security policy for table "profiles"':
    'No se pudo preparar tu perfil. Vuelve a intentarlo en unos segundos.',
};

const AUTH_ERROR_PAGE_MESSAGE = 'Se ha producido un error inesperado al iniciar sesión.';

const DEFAULT_LOGIN_ERROR_MESSAGE = 'No se ha podido iniciar sesión. Inténtalo de nuevo.';
const LOGIN_RETRY_ERROR_MESSAGE = 'No se ha podido iniciar sesión. Revisa tus datos e inténtalo de nuevo.';

function isChildAlreadyAssignedError(error: AuthErrorLike) {
  const message = error.message?.toLowerCase() ?? '';

  return message.includes('children_full_name_unique') || message.includes('key (full_name)=');
}

function isUserAlreadyRegisteredError(error: AuthErrorLike) {
  const normalizedCode = error.code?.trim().toLowerCase() ?? '';
  const normalizedMessage = error.message?.trim().toLowerCase() ?? '';

  return (
    normalizedCode === 'user_already_exists' ||
    normalizedMessage === 'user already registered' ||
    normalizedMessage === 'user already register'
  );
}

function isInvalidCredentialsError(error: AuthErrorLike) {
  const normalizedCode = error.code?.trim().toLowerCase() ?? '';
  const normalizedMessage = error.message?.trim().toLowerCase() ?? '';
  const hasInvalidCredentialsMessage =
    normalizedMessage.includes('invalid login credentials') ||
    normalizedMessage.includes('invalid credentials') ||
    normalizedMessage.includes('email or password') ||
    normalizedMessage.includes('email o la contrase') ||
    normalizedMessage.includes('contrase');

  return (
    normalizedCode === 'invalid_credentials' ||
    normalizedCode === 'invalid_login_credentials' ||
    hasInvalidCredentialsMessage ||
    error.status === 400
  );
}

function buildUserNotRegisteredError() {
  return {
    code: 'user_not_registered',
    status: 400,
    message: 'User not registered',
  } satisfies AuthErrorLike;
}

function buildUserAlreadyRegisteredError() {
  return {
    code: 'user_already_exists',
    status: 400,
    message: 'User already registered',
  } satisfies AuthErrorLike;
}

function buildUserWithoutLinkedChildError() {
  return {
    code: 'user_without_linked_child',
    status: 400,
    message: 'User without linked child',
  } satisfies AuthErrorLike;
}

function hasLinkedChild(user: AuthUser) {
  return user.role === 'admin' || user.childIds.length > 0;
}

async function isRegisteredUserEmail(email: string) {
  if (!hasSupabaseConfig()) {
    return true;
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('email')
    .ilike('email', email.trim())
    .limit(1)
    .maybeSingle();

  if (error) {
    // Si falla la consulta (ej. sin política anon) asumimos que el usuario podría existir
    // para no bloquear el flujo de login con el mensaje incorrecto.
    return true;
  }

  return data !== null;
}

async function isChildAlreadyLinked(childName: string) {
  if (!hasSupabaseConfig()) {
    return false;
  }

  const normalizedChildName = childName.trim();

  if (!normalizedChildName) {
    return false;
  }

  const supabase = getSupabaseClient();
  const rpcClient = supabase as unknown as ChildLinkedLookupRpcClient;
  const { data, error } = await rpcClient.rpc('is_child_already_linked', {
    p_child_name: normalizedChildName,
  });

  if (error) {
    return false;
  }

  return data === true;
}

async function createChildAlreadyLinkedIncident(
  userId: string | null,
  userEmail: string,
  childName: string,
  cause: string,
) {
  await registerIncident({
    userId,
    userEmail,
    kind: 'child_already_linked',
    title: 'child_already_linked',
    description: 'Se intento registrar una cuenta con un jugador ya vinculado a otra cuenta.',
    status: 'review',
    severity: 'high',
    source: 'sign_up',
    details: {
      child_name: childName.trim(),
      error: cause,
    },
  });
}

function getErrorDetails(error: unknown) {
  if (error instanceof Error) {
    const errorWithCode = error as Error & AuthErrorLike;

    return {
      message: error.message,
      code: errorWithCode.code ?? null,
      status: errorWithCode.status ?? null,
    };
  }

  if (error && typeof error === 'object') {
    const authError = error as AuthErrorLike;

    return {
      message: authError.message ?? 'Error desconocido de autenticacion.',
      code: authError.code ?? null,
      status: authError.status ?? null,
    };
  }

  return {
    message: 'Error desconocido de autenticacion.',
    code: null,
    status: null,
  };
}

async function registerIncident({
  userId,
  userEmail,
  kind,
  title,
  description,
  status,
  severity,
  source,
  details,
}: {
  userId: string | null;
  userEmail: string | null;
  kind: string;
  title: string;
  description: string;
  status: IncidentStatus;
  severity: IncidentSeverity;
  source: string;
  details: Record<string, unknown>;
}) {
  const supabase = getSupabaseClient();
  const rpcClient = supabase as unknown as RegisterIncidentRpcClient;
  const { error } = await rpcClient.rpc('register_incident', {
    p_user_id: userId,
    p_dorsal_number: null,
    p_kind: kind,
    p_title: title,
    p_description: description,
    p_user_email: userEmail,
    p_status: status,
    p_severity: severity,
    p_source: source,
    p_details: details,
  });

  if (error) {
    throw error;
  }
}

async function createAuthErrorIncident({
  source,
  userEmail,
  userId,
  error,
}: {
  source: string;
  userEmail?: string;
  userId?: string | null;
  error: unknown;
}) {
  if (!hasSupabaseConfig()) {
    return;
  }

  const { message, code, status } = getErrorDetails(error);

  try {
    await registerIncident({
      userId: userId ?? null,
      userEmail: userEmail ?? null,
      kind: 'auth_error',
      title: 'auth_error',
      description: 'Se ha producido un error en el flujo de autenticacion.',
      status: 'pending',
      severity: 'medium',
      source,
      details: {
        code,
        status,
        message,
      },
    });
  } catch {
    // Keep auth as the source of truth even if incident logging fails.
  }
}

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
      childNames: Array.isArray(parsedUser.childNames) ? parsedUser.childNames : [],
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

  if (isChildAlreadyAssignedError(authError)) {
    return 'El jugador ya ha sido vinculado con otra cuenta.';
  }

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

export function shouldRedirectAuthErrorToErrorPage(error: unknown) {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const authError = error as AuthErrorLike;

  return typeof authError.status === 'number' && authError.status >= 500;
}

export function getAuthErrorPageMessage(error: unknown) {
  return getLocalizedAuthErrorMessage(error, AUTH_ERROR_PAGE_MESSAGE);
}

export async function requestPasswordReset(email: string) {
  const supabase = getSupabaseClient();
  const redirectTo = new URL(appPaths.resetPassword, window.location.origin).toString();
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

  if (error) {
    await createAuthErrorIncident({ source: 'request_password_reset', userEmail: email, error });
    throw error;
  }
}

export async function updatePassword(password: string) {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    await createAuthErrorIncident({ source: 'update_password', error });
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
    .select('id, full_name')
    .eq('parent_id', parentId)
    .returns<ChildRow[]>();

  if (error) {
    throw error;
  }

  return data ?? [];
}

async function createChildForParent(parentId: string, childName: string) {
  const trimmedName = childName.trim();

  if (!trimmedName) {
    return;
  }

  const supabase = getSupabaseClient();
  const { error } = await supabase.from('children').insert(
    {
      parent_id: parentId,
      full_name: trimmedName,
    } as never,
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
  const children = await loadChildren(session.user.id);
  const childIds = children.map((child) => child.id);
  const childNames = children
    .map((child) => child.full_name?.trim())
    .filter((name): name is string => Boolean(name));

  return {
    id: profile.id,
    name: profile.display_name,
    email: profile.email,
    role: normalizeRole(profile.role),
    childIds,
    childNames,
  } satisfies AuthUser;
}

export async function getSignedInUser() {
  if (!hasSupabaseConfig()) {
    return readMockAuthUser();
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    await createAuthErrorIncident({ source: 'get_signed_in_user', error });
    throw error;
  }

  try {
    return await loadCurrentUser(data.session);
  } catch (loadError) {
    await createAuthErrorIncident({ source: 'get_signed_in_user_load_user', error: loadError });
    throw loadError;
  }
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
    if (isInvalidCredentialsError(error as AuthErrorLike)) {
      try {
        const isRegistered = await isRegisteredUserEmail(credentials.email);

        if (!isRegistered) {
          throw buildUserNotRegisteredError();
        }
      } catch (lookupError) {
        if (
          lookupError &&
          typeof lookupError === 'object' &&
          (lookupError as AuthErrorLike).code === 'user_not_registered'
        ) {
          throw lookupError;
        }
      }
    }

    await createAuthErrorIncident({ source: 'sign_in', userEmail: credentials.email, error });
    throw error;
  }

  clearMockAuthUser();

  try {
    const nextUser = await loadCurrentUser(data.session);

    if (nextUser && !hasLinkedChild(nextUser)) {
      await supabase.auth.signOut();
      throw buildUserWithoutLinkedChildError();
    }

    return nextUser;
  } catch (loadError) {
    await createAuthErrorIncident({
      source: 'sign_in_load_user',
      userEmail: credentials.email,
      error: loadError,
    });
    throw loadError;
  }
}

export async function signUp(input: AuthRegisterInput) {
  const normalizedChildName = input.childName.trim();

  if (normalizedChildName) {
    const childAlreadyLinked = await isChildAlreadyLinked(normalizedChildName);

    if (childAlreadyLinked) {
      try {
        await createChildAlreadyLinkedIncident(
          null,
          input.email,
          normalizedChildName,
          'Child already linked before sign up',
        );
      } catch {
        // Keep the signup validation error as the source of truth.
      }

      throw buildUserAlreadyRegisteredError();
    }
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: {
        display_name: input.name,
        full_name: input.name,
        child_name: normalizedChildName,
      },
    },
  });

  if (error) {
    if (isUserAlreadyRegisteredError(error as AuthErrorLike)) {
      try {
        await createChildAlreadyLinkedIncident(
          null,
          input.email,
          input.childName,
          error instanceof Error ? error.message : 'User already registered',
        );
      } catch {
        // Keep the signup error as the main response even if incident logging fails.
      }
    } else {
      await createAuthErrorIncident({ source: 'sign_up', userEmail: input.email, error });
    }

    throw error;
  }

  if (data.session) {
    try {
      let nextUser = await loadCurrentUser(data.session);

      if (!nextUser || !hasLinkedChild(nextUser)) {
        await createChildForParent(data.session.user.id, normalizedChildName);
        nextUser = await loadCurrentUser(data.session);
      }

      if (!nextUser || !hasLinkedChild(nextUser)) {
        await supabase.auth.signOut();
        throw buildUserWithoutLinkedChildError();
      }

      return nextUser;
    } catch (loadOrCreateError) {
      if (isChildAlreadyAssignedError(loadOrCreateError as AuthErrorLike)) {
        try {
          await createChildAlreadyLinkedIncident(
            data.session.user.id,
            input.email,
            normalizedChildName,
            loadOrCreateError instanceof Error
              ? loadOrCreateError.message
              : 'Child already linked to another account',
          );
        } catch {
          // Keep the original signup validation error as the source of truth.
        }
      } else {
        await createAuthErrorIncident({
          source: 'sign_up_load_user',
          userEmail: input.email,
          userId: data.session.user.id,
          error: loadOrCreateError,
        });
      }

      throw loadOrCreateError;
    }
  }

  try {
    await createAuthErrorIncident({
      source: 'sign_up_no_session',
      userEmail: input.email,
      error: new Error('Sign up completed without session.'),
    });
  } catch {
    // Keep auth flow as source of truth if incident logging fails.
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
    await createAuthErrorIncident({ source: 'sign_out', error });
    throw error;
  }

  clearMockAuthUser();
}
