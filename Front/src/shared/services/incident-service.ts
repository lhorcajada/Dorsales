import { getSupabaseClient, hasSupabaseConfig } from './supabase';

import type {
  IncidentDetails,
  IncidentRecord,
  IncidentSeverity,
  IncidentStatus,
  IncidentSummary,
} from '../types/incident';

interface IncidentRow {
  id: string;
  kind: string;
  title: string;
  description: string;
  status: IncidentStatus;
  severity: IncidentSeverity;
  user_id: string | null;
  user_email: string;
  dorsal_number: number | null;
  details: unknown;
  source: string;
  created_at: string;
  updated_at: string;
}

interface ProfileNameRow {
  id: string;
  display_name: string | null;
}

function parseIncidentDetails(value: unknown): IncidentDetails {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  const details = value as Record<string, unknown>;

  return {
    ...details,
    childName: typeof details.child_name === 'string' ? details.child_name : undefined,
    userName: typeof details.user_name === 'string' ? details.user_name : undefined,
  };
}

function buildEmptySummary(): IncidentSummary {
  return {
    total: 0,
    pending: 0,
    review: 0,
    resolved: 0,
  };
}

async function loadIncidentsFromSupabase() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('incidents')
    .select('id, kind, title, description, status, severity, user_id, user_email, dorsal_number, details, source, created_at, updated_at')
    .order('created_at', { ascending: false })
    .returns<IncidentRow[]>();

  if (error) {
    throw error;
  }

  const rows = data ?? [];
  const userIds = Array.from(new Set(rows.map((row) => row.user_id).filter((id): id is string => id !== null)));
  const userNamesById = new Map<string, string>();

  if (userIds.length > 0) {
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, display_name')
      .in('id', userIds)
      .returns<ProfileNameRow[]>();

    if (profilesError) {
      throw profilesError;
    }

    (profilesData ?? []).forEach((profile) => {
      const displayName = profile.display_name?.trim();

      if (displayName) {
        userNamesById.set(profile.id, displayName);
      }
    });
  }

  return rows.map<IncidentRecord>((row) => {
    const details = parseIncidentDetails(row.details);
    const userNameFromProfile = row.user_id ? userNamesById.get(row.user_id) ?? null : null;
    const userName = userNameFromProfile ?? details.userName ?? null;

    return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    description: row.description,
    status: row.status,
    severity: row.severity,
    userEmail: row.user_email,
    userName,
    dorsalNumber: row.dorsal_number,
    details,
    source: row.source,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    };
  });
}

function buildSummary(records: IncidentRecord[]): IncidentSummary {
  return records.reduce<IncidentSummary>(
    (summary, incident) => {
      summary.total += 1;
      summary[incident.status] += 1;
      return summary;
    },
    buildEmptySummary(),
  );
}

export async function fetchIncidents() {
  if (!hasSupabaseConfig()) {
    return [] satisfies IncidentRecord[];
  }

  return loadIncidentsFromSupabase();
}

export async function fetchIncidentSummary() {
  if (!hasSupabaseConfig()) {
    return buildEmptySummary();
  }

  const incidents = await loadIncidentsFromSupabase();
  return buildSummary(incidents);
}

export async function resolveIncident(incidentId: string) {
  if (!hasSupabaseConfig()) {
    return;
  }

  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('incidents')
    .update({ status: 'resolved' } as never)
    .eq('id', incidentId);

  if (error) {
    throw error;
  }
}