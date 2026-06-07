export type NotificationTone = 'info' | 'success' | 'warning' | 'error';

export interface NotificationInput {
  title: string;
  description: string;
  tone?: NotificationTone;
  durationMs?: number;
}

export interface NotificationItem extends NotificationInput {
  id: string;
}

export interface NotificationsContextValue {
  notifications: NotificationItem[];
  pushNotification: (input: NotificationInput) => string;
  dismissNotification: (id: string) => void;
}

export const DEFAULT_NOTIFICATION_DURATION_MS = 5000;