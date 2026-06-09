export type IncidentStatus = 'pending' | 'review' | 'resolved';
export type IncidentSeverity = 'low' | 'medium' | 'high';

export interface IncidentDetails {
  childName?: string;
  userName?: string;
  [key: string]: unknown;
}

export interface IncidentRecord {
  id: string;
  kind: string;
  title: string;
  description: string;
  status: IncidentStatus;
  severity: IncidentSeverity;
  userEmail: string;
  userName: string | null;
  dorsalNumber: number | null;
  details: IncidentDetails;
  source: string;
  createdAt: string;
  updatedAt: string;
}

export interface IncidentSummary {
  total: number;
  pending: number;
  review: number;
  resolved: number;
}