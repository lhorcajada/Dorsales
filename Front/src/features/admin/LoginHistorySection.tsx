import { useEffect, useState } from 'react';

import { fetchLoginHistory } from '../../shared/services/login-service';
import type { LoginHistoryGroupedByDay } from '../../shared/types/login';

import styles from './LoginHistorySection.module.css';

export function LoginHistorySection() {
  const [loginHistory, setLoginHistory] = useState<LoginHistoryGroupedByDay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadLoginHistory = async (isBackgroundRefresh = false) => {
      try {
        if (!isBackgroundRefresh) {
          setIsLoading(true);
        }

        setError(null);
        const history = await fetchLoginHistory();

        if (mounted) {
          setLoginHistory(history);
        }
      } catch (loadError) {
        if (mounted) {
          setError(loadError instanceof Error ? loadError.message : 'No se pudo cargar el histórico de logins.');
        }
      } finally {
        if (mounted && !isBackgroundRefresh) {
          setIsLoading(false);
        }
      }
    };

    void loadLoginHistory();
    const refreshIntervalId = window.setInterval(() => {
      void loadLoginHistory(true);
    }, 30000);

    return () => {
      window.clearInterval(refreshIntervalId);
    };
  }, []);

  const formatTime = (isoString: string): string => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(`${dateStr}T00:00:00`);
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getTotalLogins = (): number => {
    return loginHistory.reduce((total, day) => total + day.logins.length, 0);
  };

  return (
    <section className={styles['login-history']}>
      <div className={styles['login-history__header']}>
        <h2 className={styles['login-history__title']}>Histórico de logins</h2>
        <p className={styles['login-history__count']}>
          {isLoading ? '...' : `${getTotalLogins()} logins registrados`}
        </p>
      </div>

      {error && <p className={styles['login-history__error']}>{error}</p>}

      {isLoading && <p className={styles['login-history__copy']}>Cargando histórico...</p>}

      {!isLoading && loginHistory.length === 0 && (
        <p className={styles['login-history__copy']}>No hay logins registrados aún.</p>
      )}

      {!isLoading && loginHistory.length > 0 && (
        <div className={styles['login-history__days']}>
          {loginHistory.map((day) => (
            <article key={day.date} className={styles['login-history__day-group']}>
              <h3 className={styles['login-history__day-title']}>
                {formatDate(day.date)}
                <span className={styles['login-history__day-count']}>({day.logins.length})</span>
              </h3>
              <ul className={styles['login-history__logins-list']}>
                {day.logins.map((login) => (
                  <li key={login.id} className={styles['login-history__login-item']}>
                    <div className={styles['login-history__login-info']}>
                      <p className={styles['login-history__user-name']}>
                        {login.displayName || login.email}
                      </p>
                      <p className={styles['login-history__user-email']}>
                        {login.email}
                        {login.role && (
                          <span className={styles['login-history__user-role']}>
                            {' '}
                            • {login.role}
                          </span>
                        )}
                      </p>
                      {login.childName && (
                        <p className={styles['login-history__child-name']}>
                          Jugador: <strong>{login.childName}</strong>
                        </p>
                      )}
                    </div>
                    <div className={styles['login-history__login-time']}>
                      {formatTime(login.loggedInAt)}
                    </div>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
