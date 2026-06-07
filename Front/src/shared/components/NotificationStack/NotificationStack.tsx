import type { NotificationItem, NotificationTone } from '../../context/notifications.types';

import styles from './NotificationStack.module.css';

interface NotificationStackProps {
  notifications: NotificationItem[];
  onDismiss: (id: string) => void;
}

const toneLabels: Record<NotificationTone, string> = {
  info: 'Aviso',
  success: 'Correcto',
  warning: 'Atención',
  error: 'Error',
};

export function NotificationStack({ notifications, onDismiss }: NotificationStackProps) {
  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className={styles['notification-stack']} aria-live="polite" aria-relevant="additions removals">
      {notifications.map((notification) => (
        <article key={notification.id} className={styles[`notification-stack__item--${notification.tone ?? 'info'}`]} role="status">
          <div>
            <p className={styles['notification-stack__eyebrow']}>{toneLabels[notification.tone ?? 'info']}</p>
            <h3 className={styles['notification-stack__title']}>{notification.title}</h3>
            <p className={styles['notification-stack__description']}>{notification.description}</p>
          </div>

          <button type="button" className={styles['notification-stack__close']} onClick={() => onDismiss(notification.id)}>
            Cerrar
          </button>
        </article>
      ))}
    </div>
  );
}
