import { useEffect, useState } from 'react';

import { ConfirmationPopup } from '../../shared/components/ConfirmationPopup/ConfirmationPopup';
import {
  deleteRegisteredUser,
  fetchRegisteredUsersWithChildren,
  type RegisteredUserWithChildren,
} from '../../shared/services/admin-users-service';

import styles from './RegisteredUsersSection.module.css';

export function RegisteredUsersSection() {
  const [registeredUsers, setRegisteredUsers] = useState<RegisteredUserWithChildren[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [pendingDeleteUser, setPendingDeleteUser] = useState<RegisteredUserWithChildren | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const handleDeleteConfirm = async () => {
    if (!pendingDeleteUser) return;

    setIsDeleting(true);

    try {
      await deleteRegisteredUser(pendingDeleteUser.id);
      setRegisteredUsers((current) => current.filter((u) => u.id !== pendingDeleteUser.id));
      setPendingDeleteUser(null);
    } catch (deleteError) {
      setUsersError(deleteError instanceof Error ? deleteError.message : 'No se pudo eliminar el usuario.');
      setPendingDeleteUser(null);
    } finally {
      setIsDeleting(false);
    }
  };

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
          {registeredUsers.map((user) => {
            const isUnlinked = user.children.length === 0;

            return (
              <li
                className={`${styles['registered-users__item']} ${isUnlinked ? styles['registered-users__item--unlinked'] : ''}`}
                key={user.id}
              >
                <div className={styles['registered-users__info']}>
                  <p className={styles['registered-users__name']}>{user.displayName}</p>
                  <p className={styles['registered-users__email']}>{user.email}</p>
                </div>
                <p className={styles['registered-users__children']}>
                  {user.children.length > 0 ? user.children.join(', ') : 'Sin niños vinculados'}
                </p>
                {isUnlinked ? (
                  <button
                    className={styles['registered-users__delete-btn']}
                    type="button"
                    onClick={() => setPendingDeleteUser(user)}
                  >
                    Eliminar
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}

      <ConfirmationPopup
        cancelLabel="Cancelar"
        confirmDisabled={isDeleting}
        confirmLabel={isDeleting ? 'Eliminando...' : 'Sí, eliminar'}
        description={
          pendingDeleteUser
            ? `Se eliminará permanentemente la cuenta de ${pendingDeleteUser.displayName} (${pendingDeleteUser.email}). Esta acción no se puede deshacer.`
            : ''
        }
        open={pendingDeleteUser !== null}
        title="¿Eliminar usuario?"
        onCancel={() => setPendingDeleteUser(null)}
        onConfirm={() => void handleDeleteConfirm()}
      />
    </article>
  );
}
