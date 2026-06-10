import { getSupabaseClient, hasSupabaseConfig } from './supabase';

import type { LoginHistoryGroupedByDay, LoginRecord } from '../types/login';

interface LoginRow {
  id: string;
  user_id: string;
  email: string;
  display_name: string | null;
  role: string | null;
  child_name: string | null;
  logged_in_at: string;
}

export async function fetchLoginHistory(): Promise<LoginHistoryGroupedByDay[]> {
  if (!hasSupabaseConfig()) {
    return [];
  }

  const supabase = getSupabaseClient();

  try {
    const { data, error } = await supabase
      .from('login_history')
      .select('id, user_id, email, display_name, role, child_name, logged_in_at')
      .order('logged_in_at', { ascending: false })
      .limit(500);

    if (error) {
      console.error('Error fetching login history:', error);
      return [];
    }

    if (!data) {
      return [];
    }

    // Transform rows to records
    const records: LoginRecord[] = (data as LoginRow[]).map((row) => ({
      id: row.id,
      userId: row.user_id,
      email: row.email,
      displayName: row.display_name,
      role: row.role,
      childName: row.child_name,
      loggedInAt: row.logged_in_at,
    }));

    // Group by day
    const groupedByDay = new Map<string, LoginRecord[]>();

    records.forEach((record) => {
      const date = new Date(record.loggedInAt);
      // Get date in YYYY-MM-DD format (using local timezone)
      const dateStr = date.toISOString().split('T')[0];

      if (!groupedByDay.has(dateStr)) {
        groupedByDay.set(dateStr, []);
      }

      const group = groupedByDay.get(dateStr);
      if (group) {
        group.push(record);
      }
    });

    // Convert to sorted array
    const result: LoginHistoryGroupedByDay[] = Array.from(groupedByDay.entries())
      .sort(([dateA], [dateB]) => dateB.localeCompare(dateA))
      .map(([date, logins]) => ({
        date,
        logins,
      }));

    return result;
  } catch (err) {
    console.error('Error fetching login history:', err);
    return [];
  }
}
