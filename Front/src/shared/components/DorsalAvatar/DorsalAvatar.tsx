import styles from './DorsalAvatar.module.css';

type DorsalAvatarStatus = 'available' | 'assigned' | 'locked';

interface DorsalAvatarProps {
  number: number;
  status: DorsalAvatarStatus;
  label: string;
}

export function DorsalAvatar({ number, status, label }: DorsalAvatarProps) {
  return (
    <span className={styles['dorsal-avatar']} data-status={status}>
      <span className={styles['dorsal-avatar__graphic']} aria-hidden="true">
        <svg viewBox="0 0 72 72" role="presentation">
          <path
            className={styles['dorsal-avatar__shirt']}
            d="M22 16 12 24 18 35 24 31v23h24V31l6 4 6-11-10-8-8 4-6-6-6 6z"
          />
          <path
            className={styles['dorsal-avatar__trim']}
            d="M28 16c2.5 3.8 5.3 5.8 8 5.8s5.5-2 8-5.8"
          />
        </svg>
        <span className={styles['dorsal-avatar__number']}>{number.toString().padStart(2, '0')}</span>
      </span>
      <span className={styles['dorsal-avatar__label']}>{label}</span>
    </span>
  );
}