import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Countdown } from '../../shared/components/Countdown/Countdown';
import { PageHeader } from '../../shared/components/PageHeader/PageHeader';
import {
  fetchContestCatalog,
  fetchContestOverview,
  type ContestCatalogRow,
  type ContestOverview,
} from '../../shared/services/contest-service';
import { AssignedDorsalsList } from './AssignedDorsalsList';
import { getContestHomeState, getContestStateLabel, getCountdownTarget } from './homeScreenHelpers';
import styles from './HomeScreen.module.css';

const DATA_REFRESH_INTERVAL_MS = 10000;

export default function HomeScreen() {
  const [overview, setOverview] = useState<ContestOverview | null>(null);
  const [catalog, setCatalog] = useState<ContestCatalogRow[]>([]);
  const [now, setNow] = useState(() => new Date());
  const [error, setError] = useState<string | null>(null);
  const contestState = getContestHomeState(overview, now);
  const countdownTarget = getCountdownTarget(overview, contestState);

  useEffect(() => {
    let mounted = true;

    const loadHomeData = async () => {
      const [catalogResult, overviewResult] = await Promise.allSettled([fetchContestCatalog(), fetchContestOverview()]);

      if (!mounted) {
        return;
      }

      if (catalogResult.status === 'fulfilled') {
        setCatalog(catalogResult.value);
      } else {
        setCatalog([]);
      }

      if (overviewResult.status === 'fulfilled') {
        setOverview(overviewResult.value);
        setError(null);
      } else {
        setError(overviewResult.reason instanceof Error ? overviewResult.reason.message : 'No se pudo cargar el resumen.');
      }
    };

    void loadHomeData();

    const refreshInterval = window.setInterval(() => {
      void loadHomeData();
    }, DATA_REFRESH_INTERVAL_MS);

    const tickInterval = window.setInterval(() => {
      if (mounted) {
        setNow(new Date());
      }
    }, 1000);

    return () => {
      mounted = false;
      window.clearInterval(refreshInterval);
      window.clearInterval(tickInterval);
    };
  }, []);

  return (
    <section className={styles['home-screen']}>
      <PageHeader
        eyebrow="Bienvenido a Dorsales"
        title="Cuenta atrás para la asignación de dorsales"
        description="En esta sección encontrarás toda la información sobre el proceso de asignación de dorsales."
        actions={contestState !== 'closed' ? <Link className={styles['home-screen__action']} to="/contest">Elegir dorsal</Link> : undefined}
      />

      <div className={styles['home-screen__layout']}>
        <article className={styles['home-screen__hero']}>
          <p className={styles['home-screen__eyebrow']}>Estado del proceso</p>
          <div className={styles['home-screen__status']} aria-live="polite">
            <span className={styles['home-screen__status-label']}>Proceso</span>
            <strong className={styles['home-screen__status-value']}>{getContestStateLabel(contestState)}</strong>
          </div>
          {contestState === 'pending-open' && overview?.opensAt ? (
            <div className={styles['home-screen__opening-info']}>
              <span className={styles['home-screen__opening-info-label']}>Apertura programada</span>
              <p className={styles['home-screen__opening-info-text']}>
                El proceso se abrirá el <time dateTime={overview.opensAt.toISOString()}>{overview.opensAtLabel}</time>.
              </p>
            </div>
          ) : null}
          {contestState !== 'closed' ? (
            <Countdown
              targetDate={countdownTarget}
              label={contestState === 'open' ? 'Tiempo restante para cerrar el proceso de asignación de dorsales' : 'Tiempo restante para iniciar el proceso de asignación de dorsales'}
            />
          ) : null}
          <p
            className={
              contestState === 'closed'
                ? `${styles['home-screen__helper']} ${styles['home-screen__helper--closed']}`
                : styles['home-screen__helper']
            }
          >
            {contestState === 'pending-open'
              ? 'Cuando acabe la cuenta atrás, podrás entrar y elegir un dorsal disponible para tu hijo.'
              : contestState === 'open'
                ? 'El concurso ya ha comenzado. El reloj marca el tiempo que queda para el cierre.'
                : 'La asignación no está disponible en este momento.'}
          </p>
        </article>
        {contestState !== 'pending-open' ? <AssignedDorsalsList catalog={catalog} /> : null}
        {contestState !== 'pending-open' ? (
          <article className={styles['home-screen__stats']}>
            {error ? <p className={styles['home-screen__eyebrow']}>No se pudieron cargar los datos del reparto.</p> : null}
            <div className={styles['home-screen__stat']}>
              <span className={styles['home-screen__stat-label']}>Dorsales disponibles en total</span>
              <strong className={styles['home-screen__stat-value']}>{overview?.totalDorsals ?? 100}</strong>
            </div>
            {contestState === 'open' ? (
              <div className={styles['home-screen__stat']}>
                <span className={styles['home-screen__stat-label']}>Dorsales que todavía puedes elegir</span>
                <strong className={styles['home-screen__stat-value']}>{overview?.availableDorsals ?? 100}</strong>
              </div>
            ) : null}
            <div className={styles['home-screen__stat']}>
              <span className={styles['home-screen__stat-label']}>Dorsales ya asignados</span>
              <strong className={styles['home-screen__stat-value']}>{overview?.assignedDorsals ?? 0}</strong>
            </div>
          </article>
        ) : null}
      </div>

    </section>
  );
}