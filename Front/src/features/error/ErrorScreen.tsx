import { Link, useSearchParams } from 'react-router-dom';

import { appPaths } from '../../router/paths';

import styles from './ErrorScreen.module.css';

function getStatusLabel(status: string | null) {
  if (!status) {
    return 'Error del servicio';
  }

  if (status === 'network') {
    return 'Error de conexión';
  }

  return `Error ${status}`;
}

export default function ErrorScreen() {
  const [searchParams] = useSearchParams();
  const status = searchParams.get('status');
  const message =
    searchParams.get('message') ?? 'No se pudo completar la solicitud. Intenta de nuevo en unos segundos.';

  return (
    <main className={styles['error-screen']}>
      <section className={styles['error-screen__card']}>
        <p className={styles['error-screen__eyebrow']}>{getStatusLabel(status)}</p>
        <h1 className={styles['error-screen__title']}>Algo ha fallado al cargar el servicio.</h1>
        <p className={styles['error-screen__copy']}>{message}</p>

        <div className={styles['error-screen__actions']}>
          <button className={styles['error-screen__button']} type="button" onClick={() => window.location.reload()}>
            Reintentar
          </button>
          <Link className={styles['error-screen__link']} to={appPaths.home}>
            Volver al inicio
          </Link>
        </div>
      </section>
    </main>
  );
}