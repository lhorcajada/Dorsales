import { getSupabaseClient } from './supabase';

interface ChildCatalogRow {
  full_name: string;
}

export interface ChildCatalogOption {
  value: string;
  label: string;
}

export async function fetchChildCatalogOptions() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('child_name_catalog')
    .select('full_name')
    .eq('is_active', true)
    .order('full_name')
    .returns<ChildCatalogRow[]>();

  if (error) {
    throw error;
  }

  return (data ?? []).map((child) => ({
    value: child.full_name,
    label: child.full_name,
  })) satisfies ChildCatalogOption[];
}