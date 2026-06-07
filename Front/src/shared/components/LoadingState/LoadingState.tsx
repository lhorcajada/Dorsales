import styles from './LoadingState.module.css';

interface LoadingStateProps {
  label?: string;
}

export function LoadingState({ label = 'Cargando pantalla…' }: LoadingStateProps) {
  return (
    <div className={styles['loading-state']} role="status" aria-live="polite">
      <div className={styles['loading-state__spinner']} />
      <p className={styles['loading-state__label']}>{label}</p>
    </div>
  );
}