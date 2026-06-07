import { DorsalAvatar } from '../../shared/components/DorsalAvatar/DorsalAvatar';
import type { ContestCatalogRow } from '../../shared/services/contest-service';

import styles from './AssignedDorsalsList.module.css';

interface AssignedDorsalsListProps {
  catalog: ContestCatalogRow[];
}

export function AssignedDorsalsList({ catalog }: AssignedDorsalsListProps) {
  const assignedDorsals = catalog
    .filter((item) => item.status === 'assigned')
    .sort((left, right) => left.number - right.number);

  return (
    <article className={styles['assigned-dorsals']}>
      <div className={styles['assigned-dorsals__header']}>
        <div>
          <p className={styles['assigned-dorsals__eyebrow']}>Dorsales asignados</p>
          <h2 className={styles['assigned-dorsals__title']}>Listado de dorsales asignados</h2>
        </div>
        <p className={styles['assigned-dorsals__count']}>{assignedDorsals.length} asignados</p>
      </div>

      {assignedDorsals.length > 0 ? (
        <ul className={styles['assigned-dorsals__list']}>
          {assignedDorsals.map((item) => (
            <li key={item.number} className={styles['assigned-dorsals__item']}>
              <DorsalAvatar
                number={item.number}
                status="assigned"
                label={item.assignedChildName ?? 'Asignado'}
              />
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles['assigned-dorsals__empty']}>
          Todavía no hay dorsales asignados. Cuando empiece el reparto, aquí verás a quién se le ha asignado cada uno.
        </p>
      )}
    </article>
  );
}