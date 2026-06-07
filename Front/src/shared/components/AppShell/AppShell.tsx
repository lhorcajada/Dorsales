import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ContestStatusWatcher } from '../ContestStatusWatcher/ContestStatusWatcher';
import { UserMenu } from '../UserMenu/UserMenu';

import styles from './AppShell.module.css';

export function AppShell() {
  const { currentUser, logout } = useAuth();
  const userName = currentUser?.name ?? 'Invitado';
  const userRole = currentUser?.role === 'admin' ? 'Administrador' : 'Usuario';
  const canAccessAdmin = currentUser?.role === 'admin';

  return (
    <div className={styles['app-shell']}>
      <ContestStatusWatcher />

      <header className={styles['app-shell__header']}>
        <div className={styles['app-shell__brand']}>
          <span className={styles['app-shell__brand-mark']}>D</span>
          <div className={styles['app-shell__brand-content']}>
            <p className={styles['app-shell__eyebrow']}>Información para familias</p>
            <h1 className={styles['app-shell__title']}>Dorsales del equipo</h1>
          </div>
        </div>

        <nav className={styles['app-shell__nav']} aria-label="Navegación principal">
          {canAccessAdmin ? (
            <NavLink
              to="/home"
              className={({ isActive }) =>
                isActive
                  ? `${styles['app-shell__nav-link']} ${styles['app-shell__nav-link--active']}`
                  : styles['app-shell__nav-link']
              }
            >
              Resumen
            </NavLink>
          ) : null}
          {canAccessAdmin ? (
            <>
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  isActive
                    ? `${styles['app-shell__nav-link']} ${styles['app-shell__nav-link--active']}`
                    : styles['app-shell__nav-link']
                }
              >
                Gestión
              </NavLink>
            </>
          ) : null}
        </nav>

      </header>

      <UserMenu userName={userName} userRole={userRole} onLogout={logout} />

      <main className={styles['app-shell__main']}>
        <Outlet />
      </main>

      <footer className={styles['app-shell__footer']}>
        <p className={styles['app-shell__footer-copy']}>
          © 2026 Dorsales. Lucio Horcajada González. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}