import { useEffect, useState } from 'react';

import { fetchLiveAssignments, subscribeToLiveAssignments, type LiveAssignment } from '../../shared/services/admin-live-assignments-service';

import styles from './LiveAssignmentsSection.module.css';

const MAX_VISIBLE_ASSIGNMENTS = 12;

function formatDorsal(number: number) {
  return number.toString().padStart(2, '0');
}

function sortByLatest(attempts: LiveAssignment[]) {
  return [...attempts].sort((left, right) => Date.parse(right.assignedAt) - Date.parse(left.assignedAt));
}

export function LiveAssignmentsSection() {
  const [liveAssignments, setLiveAssignments] = useState<LiveAssignment[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const refreshAssignments = async () => {
      try {
        const nextAssignments = await fetchLiveAssignments(MAX_VISIBLE_ASSIGNMENTS);

        if (mounted) {
          setLiveAssignments(sortByLatest(nextAssignments).slice(0, MAX_VISIBLE_ASSIGNMENTS));
          setError(null);
        }
      } catch (refreshError) {
        if (mounted) {
          setError(refreshError instanceof Error ? refreshError.message : 'No se pudieron cargar las asignaciones en tiempo real.');
        }
      }
    };

    void refreshAssignments();
    const refreshIntervalId = window.setInterval(() => {
      void refreshAssignments();
    }, 15000);

    const unsubscribe = subscribeToLiveAssignments(() => {
      void refreshAssignments();
    });

    return () => {
      mounted = false;
      window.clearInterval(refreshIntervalId);
      unsubscribe();
    };
  }, []);

  return (
    <article className={styles['live-assignments']}>
      <div className={styles['live-assignments__header']}>
        <h3 className={styles['live-assignments__title']}>Asignaciones en tiempo real</h3>
        <p className={styles['live-assignments__count']}>{liveAssignments.length} recientes</p>
      </div>

      {error ? <p className={styles['live-assignments__copy']}>{error}</p> : null}

      {!error && liveAssignments.length === 0 ? (
        <p className={styles['live-assignments__copy']}>Todavía no hay asignaciones confirmadas en esta sesión.</p>
      ) : null}

      {!error && liveAssignments.length > 0 ? (
        <ul className={styles['live-assignments__list']}>
          {liveAssignments.map((assignment) => (
            <li className={styles['live-assignments__item']} key={assignment.id}>
              <div>
                <p className={styles['live-assignments__dorsal']}>Dorsal {formatDorsal(assignment.dorsalNumber)}</p>
                <p className={styles['live-assignments__meta']}>Jugador: {assignment.childName}</p>
                <p className={styles['live-assignments__meta']}>Asignado por: {assignment.assignedByName}</p>
              </div>
              <p className={styles['live-assignments__time']}>{new Date(assignment.assignedAt).toLocaleTimeString('es-ES')}</p>
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}
