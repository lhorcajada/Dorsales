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

export interface RegisteredUserWithChildren {
  id: string;
  email: string;
  displayName: string;
  children: string[];
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