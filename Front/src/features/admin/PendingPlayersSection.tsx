import { useEffect, useState } from 'react';

import { fetchPendingChildLinks, type PendingChildLinksSummary } from '../../shared/services/admin-users-service';

import styles from './PendingPlayersSection.module.css';

const EMPTY_SUMMARY: PendingChildLinksSummary = {
  pendingPlayers: [],
  totalCatalogPlayers: 0,
  linkedPlayers: 0,
};

export function PendingPlayersSection() {
  const [summary, setSummary] = useState<PendingChildLinksSummary>(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadPendingPlayers = async (isBackgroundRefresh = false) => {
      try {
        if (!isBackgroundRefresh) {
          setLoading(true);
        }

        setError(null);
        const nextSummary = await fetchPendingChildLinks();

        if (mounted) {
          setSummary(nextSummary);
        }
      } catch (loadError) {
        if (mounted) {
          setError(loadError instanceof Error ? loadError.message : 'No se pudo cargar el estado de vinculación.');
        }
      } finally {
        if (mounted && !isBackgroundRefresh) {
          setLoading(false);
        }
      }
    };

    void loadPendingPlayers();
    const refreshIntervalId = window.setInterval(() => {
      void loadPendingPlayers(true);
    }, 30000);

    return () => {
      mounted = false;
      window.clearInterval(refreshIntervalId);
    };
  }, []);

  return (
    <article className={styles['pending-players']}>
      <div className={styles['pending-players__header']}>
        <h3 className={styles['pending-players__title']}>Jugadores por vincular</h3>
        <p className={styles['pending-players__count']}>
          {loading ? 'Cargando...' : `${summary.pendingPlayers.length} pendientes`}
        </p>
      </div>

      <p className={styles['pending-players__copy']}>
        Catálogo activo: {summary.totalCatalogPlayers}. Ya vinculados: {summary.linkedPlayers}.
      </p>

      {error ? <p className={styles['pending-players__error']}>{error}</p> : null}

      {!loading && !error && summary.pendingPlayers.length === 0 ? (
        <p className={styles['pending-players__copy']}>No quedan jugadores pendientes en el catálogo activo.</p>
      ) : null}

      {!loading && !error && summary.pendingPlayers.length > 0 ? (
        <ul className={styles['pending-players__list']}>
          {summary.pendingPlayers.map((player) => (
            <li key={player} className={styles['pending-players__item']}>
              {player}
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}
