import { ASSIGNED_DORSALS, DORSALS, TOTAL_DORSALS } from '../data/dorsals';
import type { Dorsal } from '../types/dorsal';

import { getSupabaseClient, hasSupabaseConfig } from './supabase';

export interface ContestCatalogRow {
  number: number;
  status: Dorsal['status'];
  assignedChildId: string | null;
  assignedChildName: string | null;
  isLocked: boolean;
  lockedReason: string | null;
}

export interface ContestOverview {
  contestName: string;
  isEnabled: boolean;
  isPaused: boolean;
  opensAt: Date | null;
  closesAt: Date | null;
  opensAtLabel: string;
  closesAtLabel: string;
  totalDorsals: number;
  availableDorsals: number;
  assignedDorsals: number;
  lockedDorsals: number;
}

export interface AdminOverview {
  settings: {
    contestName: string;
    isEnabled: boolean;
    isPaused: boolean;
    opensAt: string | null;
    closesAt: string | null;
    opensAtLabel: string;
    closesAtLabel: string;
  } | null;
  assignedCount: number;
  availableCount: number;
  lockedCount: number;
  recentAttempts: Array<{
    id: string;
    dorsalNumber: number | null;
    success: boolean;
    failureReason: string | null;
    attemptedAt: string;
  }>;
}

interface ContestSettingsRow {
  contest_name: string;
  is_enabled: boolean;
  is_paused: boolean;
  opens_at: string | null;
  closes_at: string | null;
}

export interface ContestScheduleInput {
  isEnabled: boolean;
  isPaused: boolean;
  opensAt: string | null;
  closesAt: string | null;
}

export interface DorsalClaimResult {
  dorsal_number: number;
  child_id: string;
  assigned_by: string;
  assigned_at: string;
  updated_at: string;
}

interface DorsalCatalogRow {
  number: number;
  status: Dorsal['status'];
  assigned_child_id: string | null;
  assigned_child_name: string | null;
  is_locked: boolean;
  locked_reason: string | null;
}

interface AssignmentAttemptRow {
  id: string;
  dorsal_number: number | null;
  success: boolean;
  failure_reason: string | null;
  attempted_at: string;
}

const FALLBACK_LOCKED_DORSALS = new Set([2, 18, 27]);

function formatDateLabel(value: string | null) {
  if (!value) {
    return 'sin fecha';
  }

  return new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function buildFallbackCatalog(): ContestCatalogRow[] {
  return DORSALS.map((number) => {
    const assignedChildName = ASSIGNED_DORSALS.get(number) ?? null;
    const isLocked = FALLBACK_LOCKED_DORSALS.has(number);

    return {
      number,
      status: assignedChildName ? 'assigned' : isLocked ? 'locked' : 'available',
      assignedChildId: assignedChildName ? `child-${number}` : null,
      assignedChildName,
      isLocked,
      lockedReason: isLocked ? 'Bloqueado para pruebas' : null,
    };
  });
}

function getCounts(catalog: ContestCatalogRow[]) {
  return {
    assignedDorsals: catalog.filter((item) => item.status === 'assigned').length,
    lockedDorsals: catalog.filter((item) => item.status === 'locked').length,
    availableDorsals: catalog.filter((item) => item.status === 'available').length,
  };
}

function buildFallbackOverview(catalog: ContestCatalogRow[]): ContestOverview {
  const counts = getCounts(catalog);

  return {
    contestName: 'Asignación de dorsales',
    isEnabled: false,
    isPaused: false,
    opensAt: null,
    closesAt: null,
    opensAtLabel: 'sin fecha',
    closesAtLabel: 'sin fecha',
    totalDorsals: TOTAL_DORSALS,
    availableDorsals: counts.availableDorsals,
    assignedDorsals: counts.assignedDorsals,
    lockedDorsals: counts.lockedDorsals,
  };
}

function buildAdminOverview(
  overview: ContestOverview,
  attempts: AssignmentAttemptRow[],
  settings: ContestSettingsRow | null,
): AdminOverview {
  return {
    settings: {
      contestName: settings?.contest_name ?? overview.contestName,
      isEnabled: settings?.is_enabled ?? overview.isEnabled,
      isPaused: settings?.is_paused ?? overview.isPaused,
      opensAt: settings?.opens_at ?? null,
      closesAt: settings?.closes_at ?? null,
      opensAtLabel: overview.opensAtLabel,
      closesAtLabel: overview.closesAtLabel,
    },
    assignedCount: overview.assignedDorsals,
    availableCount: overview.availableDorsals,
    lockedCount: overview.lockedDorsals,
    recentAttempts: attempts.map((attempt) => ({
      id: attempt.id,
      dorsalNumber: attempt.dorsal_number,
      success: attempt.success,
      failureReason: attempt.failure_reason,
      attemptedAt: attempt.attempted_at,
    })),
  };
}

async function loadContestSettings() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('contest_settings')
    .select('contest_name, is_enabled, opens_at, closes_at')
    .eq('id', 1)
    .maybeSingle<ContestSettingsRow>();

  if (error) {
    throw error;
  }

  return data ?? null;
}

async function loadContestCatalogFromSupabase() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('dorsal_catalog')
    .select('number, status, assigned_child_id, assigned_child_name, is_locked, locked_reason')
    .order('number', { ascending: true })
    .returns<DorsalCatalogRow[]>();

  if (error) {
    throw error;
  }

  return (data ?? []).map<ContestCatalogRow>((row) => ({
    number: row.number,
    status: row.status,
    assignedChildId: row.assigned_child_id,
    assignedChildName: row.assigned_child_name,
    isLocked: row.is_locked,
    lockedReason: row.locked_reason,
  }));
}

async function loadRecentAttempts() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('assignment_attempts')
    .select('id, dorsal_number, success, failure_reason, attempted_at')
    .order('attempted_at', { ascending: false })
    .limit(5)
    .returns<AssignmentAttemptRow[]>();

  if (error) {
    throw error;
  }

  return data ?? [];
}

function buildContestOverview(settings: ContestSettingsRow | null, catalog: ContestCatalogRow[]): ContestOverview {
  const counts = getCounts(catalog);

  return {
    contestName: settings?.contest_name ?? 'Asignación de dorsales',
    isEnabled: settings?.is_enabled ?? false,
    isPaused: settings?.is_paused ?? false,
    opensAt: settings?.opens_at ? new Date(settings.opens_at) : null,
    closesAt: settings?.closes_at ? new Date(settings.closes_at) : null,
    opensAtLabel: formatDateLabel(settings?.opens_at ?? null),
    closesAtLabel: formatDateLabel(settings?.closes_at ?? null),
    totalDorsals: catalog.length,
    availableDorsals: counts.availableDorsals,
    assignedDorsals: counts.assignedDorsals,
    lockedDorsals: counts.lockedDorsals,
  };
}

export async function fetchContestCatalog() {
  if (!hasSupabaseConfig()) {
    return buildFallbackCatalog();
  }

  return loadContestCatalogFromSupabase();
}

export async function fetchContestOverview() {
  if (!hasSupabaseConfig()) {
    return buildFallbackOverview(buildFallbackCatalog());
  }

  const [settings, catalog] = await Promise.all([loadContestSettings(), loadContestCatalogFromSupabase()]);
  return buildContestOverview(settings, catalog);
}

export async function fetchAdminOverview() {
  if (!hasSupabaseConfig()) {
    const catalog = buildFallbackCatalog();
    const overview = buildFallbackOverview(catalog);

    return {
      settings: {
        contestName: overview.contestName,
        isEnabled: overview.isEnabled,
        isPaused: overview.isPaused,
        opensAt: null,
        closesAt: null,
        opensAtLabel: overview.opensAtLabel,
        closesAtLabel: overview.closesAtLabel,
      },
      assignedCount: overview.assignedDorsals,
      availableCount: overview.availableDorsals,
      lockedCount: overview.lockedDorsals,
      recentAttempts: [],
    } satisfies AdminOverview;
  }

  const [settings, catalog, attempts] = await Promise.all([
    loadContestSettings(),
    loadContestCatalogFromSupabase(),
    loadRecentAttempts(),
  ]);
  const overview = buildContestOverview(settings, catalog);

  return buildAdminOverview(overview, attempts, settings);
}

export async function updateContestSchedule(input: ContestScheduleInput) {
  if (!hasSupabaseConfig()) {
    throw new Error('La configuración de Supabase no está disponible en este entorno.');
  }

  const supabase = getSupabaseClient();
  const payload = {
    is_enabled: input.isEnabled,
    opens_at: input.opensAt,
    closes_at: input.closesAt,
  };

  const { data, error } = await supabase
    .from('contest_settings')
    .update(payload as never)
    .eq('id', 1)
    .select('contest_name, is_enabled, opens_at, closes_at')
    .maybeSingle<ContestSettingsRow>();

  if (error) {
    throw error;
  }

  if (!data) {
    const { data: inserted, error: insertError } = await supabase
      .from('contest_settings')
      .insert([{ id: 1, contest_name: 'Asignación de dorsales', ...payload }] as never)
      .select('contest_name, is_enabled, opens_at, closes_at')
      .maybeSingle<ContestSettingsRow>();

    if (insertError) {
      throw insertError;
    }

    if (!inserted) {
      throw new Error('No se pudo guardar la configuración del concurso.');
    }

    return inserted;
  }

  return data;
}

export async function claimDorsal(childId: string, dorsalNumber: number) {
  if (!hasSupabaseConfig()) {
    throw new Error('La configuración de Supabase no está disponible en este entorno.');
  }

  const supabase = getSupabaseClient();
  type ClaimDorsalRpcClient = {
    rpc(
      functionName: 'claim_dorsal',
      args: {
        p_child_id: string;
        p_dorsal_number: number;
      },
    ): Promise<{ data: DorsalClaimResult | null; error: { message?: string } | null }>;
  };

  const rpcClient = supabase as unknown as ClaimDorsalRpcClient;
  const { data, error } = await rpcClient.rpc('claim_dorsal', {
    p_child_id: childId,
    p_dorsal_number: dorsalNumber,
  });

  if (error) {
    throw error;
  }

  return data as DorsalClaimResult | null;
}