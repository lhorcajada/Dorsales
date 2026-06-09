import { getSupabaseClient } from './supabase';

type ProfileRow = {
  id: string;
  email: string;
  display_name: string;
  role: 'user' | 'admin';
};

type ChildRow = {
  id: string;
  parent_id: string;
  full_name: string;
};

type ChildCatalogRow = {
  full_name: string;
};

export interface RegisteredUserWithChildren {
  id: string;
  email: string;
  displayName: string;
  children: string[];
}

export interface PendingChildLinksSummary {
  pendingPlayers: string[];
  totalCatalogPlayers: number;
  linkedPlayers: number;
}

function normalizeName(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

export async function fetchRegisteredUsersWithChildren() {
  const supabase = getSupabaseClient();

  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, email, display_name, role')
    .eq('role', 'user')
    .order('display_name', { ascending: true })
    .returns<ProfileRow[]>();

  if (profilesError) {
    throw profilesError;
  }

  if (!profiles || profiles.length === 0) {
    return [] as RegisteredUserWithChildren[];
  }

  const parentIds = profiles.map((profile) => profile.id);
  const { data: children, error: childrenError } = await supabase
    .from('children')
    .select('id, parent_id, full_name')
    .in('parent_id', parentIds)
    .order('full_name', { ascending: true })
    .returns<ChildRow[]>();

  if (childrenError) {
    throw childrenError;
  }

  const childrenByParent = new Map<string, string[]>();

  (children ?? []).forEach((child) => {
    const current = childrenByParent.get(child.parent_id) ?? [];
    current.push(child.full_name);
    childrenByParent.set(child.parent_id, current);
  });

  return profiles.map((profile) => ({
    id: profile.id,
    email: profile.email,
    displayName: profile.display_name,
    children: childrenByParent.get(profile.id) ?? [],
  }));
}

export async function fetchPendingChildLinks() {
  const supabase = getSupabaseClient();

  const [{ data: catalogRows, error: catalogError }, { data: childRows, error: childrenError }] = await Promise.all([
    supabase
      .from('child_name_catalog')
      .select('full_name')
      .eq('is_active', true)
      .order('full_name', { ascending: true })
      .returns<ChildCatalogRow[]>(),
    supabase.from('children').select('full_name').returns<Array<Pick<ChildRow, 'full_name'>>>(),
  ]);

  if (catalogError) {
    throw catalogError;
  }

  if (childrenError) {
    throw childrenError;
  }

  const linkedNames = new Set((childRows ?? []).map((child) => normalizeName(child.full_name)));
  const seenPending = new Set<string>();
  const pendingPlayers = (catalogRows ?? [])
    .filter((player) => {
      const normalized = normalizeName(player.full_name);

      if (linkedNames.has(normalized) || seenPending.has(normalized)) {
        return false;
      }

      seenPending.add(normalized);
      return true;
    })
    .map((player) => player.full_name);

  return {
    pendingPlayers,
    totalCatalogPlayers: catalogRows?.length ?? 0,
    linkedPlayers: linkedNames.size,
  } satisfies PendingChildLinksSummary;
}

export async function deleteRegisteredUser(userId: string) {
  const supabase = getSupabaseClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.rpc as any)('delete_user_by_admin', { p_user_id: userId });

  if (error) {
    throw error;
  }
}