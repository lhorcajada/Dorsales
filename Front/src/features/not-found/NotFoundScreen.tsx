import { Link } from 'react-router-dom';

import styles from './NotFoundScreen.module.css';

export default function NotFoundScreen() {
  return (
    <main className={styles['not-found']}>
      <section className={styles['not-found__card']}>
        <p className={styles['not-found__eyebrow']}>404</p>
        <h1 className={styles['not-found__title']}>Esta ruta no existe.</h1>
        <Link className={styles['not-found__link']} to="/home">
          Volver al inicio
        </Link>
      </section>
    </main>
  );
}