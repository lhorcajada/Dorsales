import { useEffect, useState } from 'react';

import { Link } from 'react-router-dom';

import { PageHeader } from '../../shared/components/PageHeader/PageHeader';
import { appPaths } from '../../router/paths';
import { fetchAdminOverview, type AdminOverview } from '../../shared/services/contest-service';
import { fetchIncidentSummary } from '../../shared/services/incident-service';
import type { IncidentSummary } from '../../shared/types/incident';

import { ContestScheduleForm } from './ContestScheduleForm';
import { LiveAssignmentsSection } from './LiveAssignmentsSection';
import { RegisteredUsersSection } from './RegisteredUsersSection';
import { getAssignmentWindowSummary } from './adminScreenHelpers';
import styles from './AdminScreen.module.css';

export default function AdminScreen() {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [incidentSummary, setIncidentSummary] = useState<IncidentSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let mounted = true;

    const loadOverview = async () => {
      try {
        const nextOverview = await fetchAdminOverview();

        if (mounted) {
          setOverview(nextOverview);
        }
      } catch (overviewError) {
        if (mounted) {
          setError(overviewError instanceof Error ? overviewError.message : 'No se pudo cargar el panel.');
        }
      }
    };

    void loadOverview();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(new Date());
    }, 30000);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadIncidentSummary = async () => {
      try {
        const nextSummary = await fetchIncidentSummary();

        if (mounted) {
          setIncidentSummary(nextSummary);
        }
      } catch {
        if (mounted) {
          setIncidentSummary(null);
        }
      }
    };

    void loadIncidentSummary();

    return () => {
      mounted = false;
    };
  }, []);

  const handleSettingsSaved = (nextSettings: NonNullable<AdminOverview['settings']>) => {
    setOverview((current) => (current ? { ...current, settings: nextSettings } : current));
  };

  const handleContestRestarted = async () => {
    try {
      const nextOverview = await fetchAdminOverview();
      setOverview(nextOverview);
    } catch (overviewError) {
      setError(overviewError instanceof Error ? overviewError.message : 'No se pudo actualizar el panel.');
    }
  };

  return (
    <section className={styles['admin-screen']}>
      <PageHeader
        eyebrow="Panel de administración"
        title="Gestiona dorsales, usuarios y asignaciones desde un único punto."
        description="Apertura y cierre del reparto, gestión de incidencias."
      />

      <ContestScheduleForm
        settings={overview?.settings ?? null}
        onSaved={handleSettingsSaved}
        onContestRestarted={handleContestRestarted}
      />

      <div className={styles['admin-screen__grid']}>
        <article className={styles['admin-screen__card']}>
          <h3 className={styles['admin-screen__card-title']}>Ventana de asignación</h3>
          <p className={styles['admin-screen__card-copy']}>{getAssignmentWindowSummary(overview?.settings ?? null, now)}</p>
        </article>

        <article className={styles['admin-screen__card']}>
          <h3 className={styles['admin-screen__card-title']}>Control de dorsales</h3>
          <p className={styles['admin-screen__card-copy']}>
            {overview
              ? `${overview.assignedCount} asignados, ${overview.lockedCount} bloqueados y ${overview.availableCount} libres.`
              : 'Marca números bloqueados, revisa disponibilidad y reasigna manualmente si hace falta.'}
          </p>
        </article>

        <article className={styles['admin-screen__card']}>
          <h3 className={styles['admin-screen__card-title']}>Incidencias</h3>
          <p className={styles['admin-screen__card-copy']}>
            {incidentSummary
              ? `${incidentSummary.total} incidencias registradas, ${incidentSummary.pending} pendientes y ${incidentSummary.review} en revisión.`
              : error
                ? error
                : 'Revisa intentos repetidos, validaciones pendientes y cualquier caso que requiera soporte.'}
          </p>
          <Link className={styles['admin-screen__card-link']} to={appPaths.incidents}>
            Abrir ventana de incidencias
          </Link>
        </article>
      </div>

      <LiveAssignmentsSection />

      <RegisteredUsersSection />
    </section>
  );
}