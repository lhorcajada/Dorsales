import { useEffect, useState } from 'react';

import { Link } from 'react-router-dom';

import { PageHeader } from '../../shared/components/PageHeader/PageHeader';
import { appPaths } from '../../router/paths';
import { fetchIncidentSummary, fetchIncidents } from '../../shared/services/incident-service';
import type { IncidentRecord, IncidentSummary } from '../../shared/types/incident';

import styles from './IncidentsScreen.module.css';

function formatDorsalNumber(number: number | null) {
  if (number === null) {
    return 'Sin dorsal';
  }

  return number.toString().padStart(2, '0');
}

function getStatusLabel(status: IncidentRecord['status']) {
  if (status === 'review') {
    return 'En revisión';
  }

  if (status === 'resolved') {
    return 'Resuelta';
  }

  return 'Pendiente';
}

function getSeverityLabel(severity: IncidentRecord['severity']) {
  if (severity === 'high') {
    return 'Alta';
  }

  if (severity === 'medium') {
    return 'Media';
  }

  return 'Baja';
}

const INCIDENT_TITLE_LABELS: Record<string, string> = {
  auth_error: 'Error de autenticacion',
  child_already_linked: 'Jugador ya vinculado',
};

function getIncidentTitleLabel(title: string) {
  return INCIDENT_TITLE_LABELS[title] ?? title;
}

export default function IncidentsScreen() {
  const [incidents, setIncidents] = useState<IncidentRecord[]>([]);
  const [summary, setSummary] = useState<IncidentSummary>({ total: 0, pending: 0, review: 0, resolved: 0 });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadIncidents = async () => {
      try {
        const [nextIncidents, nextSummary] = await Promise.all([fetchIncidents(), fetchIncidentSummary()]);

        if (mounted) {
          setIncidents(nextIncidents);
          setSummary(nextSummary);
        }
      } catch (incidentError) {
        if (mounted) {
          setError(incidentError instanceof Error ? incidentError.message : 'No se pudieron cargar las incidencias.');
        }
      }
    };

    void loadIncidents();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <section className={styles['incidents-screen']}>
      <PageHeader
        eyebrow="Panel de incidencias"
        title="Ventana de incidencias"
        description="Centraliza los casos que requieren revisión, soporte o intervención manual en el reparto de dorsales."
        actions={
          <Link className={styles['incidents-screen__back-link']} to={appPaths.admin}>
            Volver a gestión
          </Link>
        }
      />

      <div className={styles['incidents-screen__summary']}>
        <article className={styles['incidents-screen__metric']}>
          <span className={styles['incidents-screen__metric-label']}>Pendientes</span>
          <strong className={styles['incidents-screen__metric-value']}>{summary.pending}</strong>
        </article>
        <article className={styles['incidents-screen__metric']}>
          <span className={styles['incidents-screen__metric-label']}>En revisión</span>
          <strong className={styles['incidents-screen__metric-value']}>{summary.review}</strong>
        </article>
        <article className={styles['incidents-screen__metric']}>
          <span className={styles['incidents-screen__metric-label']}>Resueltas hoy</span>
          <strong className={styles['incidents-screen__metric-value']}>{summary.resolved}</strong>
        </article>
      </div>

      {error ? <p className={styles['incidents-screen__error']}>{error}</p> : null}

      <div className={styles['incidents-screen__list']}>
        {incidents.length === 0 ? (
          <article className={styles['incidents-screen__empty']}>
            <h3 className={styles['incidents-screen__title']}>No hay incidencias registradas</h3>
            <p className={styles['incidents-screen__copy']}>
              Las incidencias generadas por el sistema aparecerán aquí con el email del usuario, el dorsal implicado y su estado.
            </p>
          </article>
        ) : null}

        {incidents.map((incident) => (
          <article key={incident.id} className={styles['incidents-screen__card']}>
            <div className={styles['incidents-screen__card-header']}>
              <div>
                <p className={styles['incidents-screen__eyebrow']}>{incident.kind}</p>
                <h3 className={styles['incidents-screen__title']}>{getIncidentTitleLabel(incident.title)}</h3>
              </div>
              <span className={styles[`incidents-screen__badge--${incident.status}`]}>{getStatusLabel(incident.status)}</span>
            </div>
            <p className={styles['incidents-screen__copy']}>{incident.description}</p>
            <div className={styles['incidents-screen__meta']}>
              <span>{incident.userEmail}</span>
              <span>{incident.dorsalNumber === null ? 'Sin dorsal asociado' : `Dorsal ${formatDorsalNumber(incident.dorsalNumber)}`}</span>
            </div>
            <div className={styles['incidents-screen__meta']}>
              <span>{getSeverityLabel(incident.severity)}</span>
              <span>{new Date(incident.updatedAt).toLocaleString('es-ES')}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}