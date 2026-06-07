import { DorsalAvatar } from '../../shared/components/DorsalAvatar/DorsalAvatar';
import type { ContestCatalogRow } from '../../shared/services/contest-service';

import styles from './ContestScreen.module.css';

interface ContestCatalogGridProps {
  catalog: ContestCatalogRow[];
  lockedDorsalNumber: number | null;
  onSelectDorsal: (dorsal: ContestCatalogRow) => void;
}

function formatDorsalNumber(number: number) {
  return number.toString().padStart(2, '0');
}

export function ContestCatalogGrid({ catalog, lockedDorsalNumber, onSelectDorsal }: ContestCatalogGridProps) {
  return (
    <div className={styles['contest-screen__grid']}>
      {catalog.map((dorsal) => {
        const assignedChild = dorsal.assignedChildName;
        const isLocked = dorsal.status === 'locked' || lockedDorsalNumber === dorsal.number;
        const isAssigned = Boolean(assignedChild);
        const status = isAssigned ? 'assigned' : isLocked ? 'locked' : 'available';
        const label = assignedChild ?? (isLocked ? 'Bloqueado' : 'Disponible');

        return (
          <button
            key={dorsal.number}
            type="button"
            onClick={() => onSelectDorsal(dorsal)}
            className={
              isAssigned
                ? styles['contest-screen__card--assigned']
                : isLocked
                  ? styles['contest-screen__card--locked']
                  : styles['contest-screen__card']
            }
            disabled={isAssigned || isLocked}
            aria-label={`Dorsal ${formatDorsalNumber(dorsal.number)}: ${label}`}
          >
            <DorsalAvatar number={dorsal.number} status={status} label={label} />
          </button>
        );
      })}
    </div>
  );
}