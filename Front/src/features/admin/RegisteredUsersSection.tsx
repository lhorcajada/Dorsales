import { useEffect, useState } from 'react';

import {
  fetchRegisteredUsersWithChildren,
  type RegisteredUserWithChildren,
} from '../../shared/services/admin-users-service';

import styles from './RegisteredUsersSection.module.css';

export function RegisteredUsersSection() {
  const [registeredUsers, setRegisteredUsers] = useState<RegisteredUserWithChildren[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadRegisteredUsers = async (isBackgroundRefresh = false) => {
      try {
        if (!isBackgroundRefresh) {
          setUsersLoading(true);
        }

        setUsersError(null);
        const users = await fetchRegisteredUsersWithChildren();

        if (mounted) {
          setRegisteredUsers(users);
        }
      } catch (loadUsersError) {
        if (mounted) {
          setUsersError(loadUsersError instanceof Error ? loadUsersError.message : 'No se pudo cargar la lista de usuarios.');
        }
      } finally {
        if (mounted && !isBackgroundRefresh) {
          setUsersLoading(false);
        }
      }
    };

    void loadRegisteredUsers();
    const refreshIntervalId = window.setInterval(() => {
      void loadRegisteredUsers(true);
    }, 30000);

    return () => {
      mounted = false;
      window.clearInterval(refreshIntervalId);
    };
  }, []);

  return (
    <article className={styles['registered-users']}>
      <div className={styles['registered-users__header']}>
        <h3 className={styles['registered-users__title']}>Usuarios registrados</h3>
        <p className={styles['registered-users__count']}>
          {usersLoading ? 'Cargando...' : `${registeredUsers.length} registrados`}
        </p>
      </div>

      {usersError ? <p className={styles['registered-users__copy']}>{usersError}</p> : null}

      {!usersLoading && !usersError && registeredUsers.length === 0 ? (
        <p className={styles['registered-users__copy']}>Todavía no hay usuarios registrados con niños vinculados.</p>
      ) : null}

      {!usersLoading && !usersError && registeredUsers.length > 0 ? (
        <ul className={styles['registered-users__list']}>
          {registeredUsers.map((user) => (
            <li className={styles['registered-users__item']} key={user.id}>
              <div>
                <p className={styles['registered-users__name']}>{user.displayName}</p>
                <p className={styles['registered-users__email']}>{user.email}</p>
              </div>
              <p className={styles['registered-users__children']}>
                {user.children.length > 0 ? user.children.join(', ') : 'Sin niños vinculados'}
              </p>
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}
