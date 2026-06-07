import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { NotificationsContext } from './notificationsContext';
import {
  DEFAULT_NOTIFICATION_DURATION_MS,
  type NotificationInput,
  type NotificationItem,
} from './notifications.types';

function createNotificationId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Date.now());
}

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const timersRef = useRef(new Map<string, number>());

  const dismissNotification = useMemo(
    () => (id: string) => {
      const timerId = timersRef.current.get(id);

      if (timerId !== undefined) {
        window.clearTimeout(timerId);
        timersRef.current.delete(id);
      }

      setNotifications((current) => current.filter((notification) => notification.id !== id));
    },
    [],
  );

  const pushNotification = useMemo(
    () => (input: NotificationInput) => {
      const id = createNotificationId();
      const notification: NotificationItem = {
        id,
        tone: input.tone ?? 'info',
        durationMs: input.durationMs ?? DEFAULT_NOTIFICATION_DURATION_MS,
        title: input.title,
        description: input.description,
      };

      setNotifications((current) => [...current, notification]);

      const timerId = window.setTimeout(() => dismissNotification(id), notification.durationMs);
      timersRef.current.set(id, timerId);

      return id;
    },
    [dismissNotification],
  );

  useEffect(
    () => () => {
      timersRef.current.forEach((timerId) => window.clearTimeout(timerId));
      timersRef.current.clear();
    },
    [],
  );

  const value = useMemo(
    () => ({ notifications, pushNotification, dismissNotification }),
    [notifications, pushNotification, dismissNotification],
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}
