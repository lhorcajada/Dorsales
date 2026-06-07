import { useEffect, useRef, useState } from 'react';

import styles from './ConfirmationPopup.module.css';

interface ConfirmationPopupProps {
  open: boolean;
  title: string;
  description: string;
  countdownSeconds: number;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  onTimeout: () => void;
  confirmDisabled?: boolean;
}

export function ConfirmationPopup({
  open,
  title,
  description,
  countdownSeconds,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  onTimeout,
  confirmDisabled = false,
}: ConfirmationPopupProps) {
  const [remainingSeconds, setRemainingSeconds] = useState(countdownSeconds);
  const intervalRef = useRef<number | null>(null);
  const hasTimedOutRef = useRef(false);
  const timeoutRef = useRef(onTimeout);

  useEffect(() => {
    timeoutRef.current = onTimeout;
  }, [onTimeout]);

  useEffect(() => {
    if (!open) {
      setRemainingSeconds(countdownSeconds);
      hasTimedOutRef.current = false;
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    hasTimedOutRef.current = false;
    setRemainingSeconds(countdownSeconds);
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
    }

    intervalRef.current = window.setInterval(() => {
      setRemainingSeconds((currentSeconds) => Math.max(currentSeconds - 1, 0));
    }, 1000);

    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [countdownSeconds, open]);

  useEffect(() => {
    if (!open || remainingSeconds > 0 || hasTimedOutRef.current) {
      return;
    }

    hasTimedOutRef.current = true;

    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    timeoutRef.current();
  }, [open, remainingSeconds]);

  if (!open) {
    return null;
  }

  return (
    <div className={styles['confirmation-popup']} role="presentation" onClick={onCancel}>
      <div
        className={styles['confirmation-popup__dialog']}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirmation-popup-title"
        aria-describedby="confirmation-popup-description"
        onClick={(event) => event.stopPropagation()}
      >
        <p className={styles['confirmation-popup__eyebrow']}>Reserva temporal</p>
        <h3 id="confirmation-popup-title" className={styles['confirmation-popup__title']}>
          {title}
        </h3>
        <p id="confirmation-popup-description" className={styles['confirmation-popup__description']}>
          {description}
        </p>

        <div className={styles['confirmation-popup__timer']}>
          <span className={styles['confirmation-popup__timer-label']}>Tiempo restante</span>
          <strong className={styles['confirmation-popup__timer-value']}>{remainingSeconds}s</strong>
        </div>

        <div className={styles['confirmation-popup__actions']}>
          <button type="button" className={styles['confirmation-popup__button--secondary']} onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={styles['confirmation-popup__button--primary']}
            onClick={onConfirm}
            disabled={remainingSeconds === 0 || confirmDisabled}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
