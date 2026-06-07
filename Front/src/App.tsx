import { useEffect } from 'react';

import { installApiErrorInterceptor } from './api/client';
import { AppRouter } from './router/AppRouter';
import { NotificationStack } from './shared/components/NotificationStack/NotificationStack';
import { useNotifications } from './shared/context/useNotifications';

import styles from './App.module.css';

export function App() {
  const { notifications, dismissNotification } = useNotifications();

  useEffect(() => installApiErrorInterceptor(), []);

  return (
    <div className={styles['app']}>
      <NotificationStack notifications={notifications} onDismiss={dismissNotification} />
      <AppRouter />
    </div>
  );
}