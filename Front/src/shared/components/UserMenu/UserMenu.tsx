import { useEffect, useId, useRef, useState } from 'react';

import styles from './UserMenu.module.css';

interface UserMenuProps {
  userName: string;
  userRole: string;
  onLogout: () => Promise<void>;
}

function getInitials(userName: string) {
  return userName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
    .slice(0, 2) || 'U';
}

export function UserMenu({ userName, userRole, onLogout }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuId = useId();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleLogout = async () => {
    setIsOpen(false);
    await onLogout();
  };

  return (
    <div ref={containerRef} className={styles['user-menu']}>
      <button
        type="button"
        className={styles['user-menu__avatar-button']}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={menuId}
        onClick={() => setIsOpen((value) => !value)}
      >
        <span className={styles['user-menu__avatar']}>{getInitials(userName)}</span>
        <span className={styles['user-menu__toggle-icon']} aria-hidden="true">
          ▾
        </span>
      </button>

      {isOpen ? (
        <div id={menuId} className={styles['user-menu__panel']} role="menu" aria-label="Opciones de sesión">
          <div className={styles['user-menu__header']}>
            <strong className={styles['user-menu__header-name']}>{userName}</strong>
            <span className={styles['user-menu__header-role']}>{userRole}</span>
          </div>
          <button type="button" className={styles['user-menu__logout']} role="menuitem" onClick={handleLogout}>
            Cerrar sesión
          </button>
        </div>
      ) : null}
    </div>
  );
}