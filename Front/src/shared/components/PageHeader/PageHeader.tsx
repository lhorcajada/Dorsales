import type { ReactNode } from 'react';

import styles from './PageHeader.module.css';

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <header className={styles['page-header']}>
      <div>
        {eyebrow ? <p className={styles['page-header__eyebrow']}>{eyebrow}</p> : null}
        <h2 className={styles['page-header__title']}>{title}</h2>
        {description ? <p className={styles['page-header__description']}>{description}</p> : null}
      </div>
      {actions ? <div className={styles['page-header__actions']}>{actions}</div> : null}
    </header>
  );
}