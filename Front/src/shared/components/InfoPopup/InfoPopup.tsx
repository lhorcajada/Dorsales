import styles from './InfoPopup.module.css';

interface InfoPopupProps {
  open: boolean;
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}

export function InfoPopup({ open, title, description, actionLabel, onAction }: InfoPopupProps) {
  if (!open) {
    return null;
  }

  return (
    <div className={styles['info-popup']} role="presentation" onClick={onAction}>
      <div
        className={styles['info-popup__dialog']}
        role="dialog"
        aria-modal="true"
        aria-labelledby="info-popup-title"
        aria-describedby="info-popup-description"
        onClick={(event) => event.stopPropagation()}
      >
        <p className={styles['info-popup__eyebrow']}>Información</p>
        <h3 id="info-popup-title" className={styles['info-popup__title']}>
          {title}
        </h3>
        <p id="info-popup-description" className={styles['info-popup__description']}>
          {description}
        </p>

        <div className={styles['info-popup__actions']}>
          <button type="button" className={styles['info-popup__button']} onClick={onAction}>
            {actionLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
