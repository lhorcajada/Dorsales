import { getSupabaseClient, hasSupabaseConfig } from './supabase';

import type { IncidentRecord, IncidentSeverity, IncidentStatus, IncidentSummary } from '../types/incident';

interface IncidentRow {
  id: string;
  kind: string;
  title: string;
  description: string;
  status: IncidentStatus;
  severity: IncidentSeverity;
  user_email: string;
  dorsal_number: number | null;
  source: string;
  created_at: string;
  updated_at: string;
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
    .select('id, kind, title, description, status, severity, user_email, dorsal_number, source, created_at, updated_at')
    .order('created_at', { ascending: false })
    .returns<IncidentRow[]>();

  if (error) {
    throw error;
  }

  return (data ?? []).map<IncidentRecord>((row) => ({
    id: row.id,
    kind: row.kind,
    title: row.title,
    description: row.description,
    status: row.status,
    severity: row.severity,
    userEmail: row.user_email,
    dorsalNumber: row.dorsal_number,
    source: row.source,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
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