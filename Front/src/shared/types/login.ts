export interface LoginRecord {
  id: string;
  userId: string;
  email: string;
  displayName: string | null;
  role: string | null;
  childName: string | null;
  loggedInAt: string;
}

export interface LoginHistoryGroupedByDay {
  date: string; // YYYY-MM-DD
  logins: LoginRecord[];
}
