import { getSupabaseClient, hasSupabaseConfig } from './supabase';

interface DorsalAssignmentRow {
  id: string;
  dorsal_number: number;
  child_id: string;
  assigned_by: string;
  assigned_at: string;
}

export interface LiveAssignment {
  id: string;
  dorsalNumber: number;
  childName: string;
  assignedByName: string;
  assignedAt: string;
}

interface ChildRow {
  id: string;
  full_name: string;
}

interface ProfileRow {
  id: string;
  display_name: string;
}

function buildNameMap<T extends { id: string }>(rows: T[] | null | undefined, getName: (row: T) => string) {
  const map = new Map<string, string>();

  (rows ?? []).forEach((row) => {
    map.set(row.id, getName(row));
  });

  return map;
}

function mapLiveAssignment(
  row: DorsalAssignmentRow,
  childNames: Map<string, string>,
  assignerNames: Map<string, string>,
): LiveAssignment {
  const childName = childNames.get(row.child_id) ?? 'Jugador sin nombre';
  const assignedByName = assignerNames.get(row.assigned_by) ?? 'Usuario desconocido';

  return {
    id: row.id,
    dorsalNumber: row.dorsal_number,
    childName,
    assignedByName,
    assignedAt: row.assigned_at,
  };
}

export async function fetchLiveAssignments(limit = 12) {
  if (!hasSupabaseConfig()) {
    return [] satisfies LiveAssignment[];
  }

  const supabase = getSupabaseClient();
  const { data: assignmentData, error: assignmentError } = await supabase
    .from('dorsal_assignments')
    .select('id, dorsal_number, child_id, assigned_by, assigned_at')
    .order('assigned_at', { ascending: false })
    .limit(limit)
    .returns<DorsalAssignmentRow[]>();

  if (assignmentError) {
    throw assignmentError;
  }

  const assignments = (assignmentData ?? []) as DorsalAssignmentRow[];
  const childIds = Array.from(new Set(assignments.map((assignment) => assignment.child_id)));
  const assignerIds = Array.from(new Set(assignments.map((assignment) => assignment.assigned_by)));

  const [{ data: childrenData, error: childrenError }, { data: profilesData, error: profilesError }] = await Promise.all([
    childIds.length > 0
      ? supabase
        .from('children')
        .select('id, full_name')
        .in('id', childIds)
        .returns<ChildRow[]>()
      : Promise.resolve({ data: [] as ChildRow[], error: null }),
    assignerIds.length > 0
      ? supabase
        .from('profiles')
        .select('id, display_name')
        .in('id', assignerIds)
        .returns<ProfileRow[]>()
      : Promise.resolve({ data: [] as ProfileRow[], error: null }),
  ]);

  if (childrenError) {
    throw childrenError;
  }

  if (profilesError) {
    throw profilesError;
  }

  const childNames = buildNameMap(childrenData, (row) => row.full_name);
  const assignerNames = buildNameMap(profilesData, (row) => row.display_name);

  return assignments.map((assignment) => mapLiveAssignment(assignment, childNames, assignerNames));
}

export function subscribeToLiveAssignments(onChange: () => void) {
  if (!hasSupabaseConfig()) {
    return () => {};
  }

  const supabase = getSupabaseClient();
  const channel = supabase
    .channel('admin-live-dorsal-assignments')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'dorsal_assignments',
      },
      () => {
        onChange();
      },
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
