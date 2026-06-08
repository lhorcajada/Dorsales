import type { AdminOverview } from '../../shared/services/contest-service';

type AdminSettings = NonNullable<AdminOverview['settings']>;

export interface ContestScheduleFormProps {
  settings: AdminSettings | null;
  onSaved: (settings: AdminSettings) => void;
  onContestRestarted: () => Promise<void> | void;
}

export interface ContestScheduleFormState {
  isEnabled: boolean;
  startAt: string;
  durationMinutes: string;
}

export function formatDateLabel(value: string | null) {
  if (!value) {
    return 'sin fecha';
  }

  return new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export function toDateTimeLocalValue(value: string | null) {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  const offsetMinutes = date.getTimezoneOffset();
  return new Date(date.getTime() - offsetMinutes * 60000).toISOString().slice(0, 16);
}

export function buildContestScheduleFormState(settings: AdminSettings | null): ContestScheduleFormState {
  if (!settings?.opensAt || !settings.closesAt) {
    return { isEnabled: settings?.isEnabled ?? false, startAt: '', durationMinutes: '60' };
  }

  const durationMinutes = Math.max(1, Math.round((Date.parse(settings.closesAt) - Date.parse(settings.opensAt)) / 60000));

  return {
    isEnabled: settings.isEnabled,
    startAt: toDateTimeLocalValue(settings.opensAt),
    durationMinutes: String(durationMinutes),
  };
}