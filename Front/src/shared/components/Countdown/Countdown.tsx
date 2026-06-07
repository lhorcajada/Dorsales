import { useEffect, useState } from 'react';

import styles from './Countdown.module.css';

interface CountdownProps {
  targetDate: Date;
  label?: string;
}

function formatRemaining(targetDate: Date) {
  const totalSeconds = Math.max(0, Math.floor((targetDate.getTime() - Date.now()) / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { days, hours, minutes, seconds };
}

export function Countdown({ targetDate, label = 'La asignación empieza en' }: CountdownProps) {
  const [remaining, setRemaining] = useState(() => formatRemaining(targetDate));

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setRemaining(formatRemaining(targetDate));
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [targetDate]);

  return (
    <section className={styles['countdown']} aria-label={label}>
      <p className={styles['countdown__label']}>{label}</p>
      <div className={styles['countdown__grid']}>
        <TimeUnit value={remaining.days} label="Días" />
        <TimeUnit value={remaining.hours} label="Horas" />
        <TimeUnit value={remaining.minutes} label="Min" />
        <TimeUnit value={remaining.seconds} label="Seg" />
      </div>
    </section>
  );
}

function TimeUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className={styles['countdown__unit']}>
      <strong className={styles['countdown__value']}>{value.toString().padStart(2, '0')}</strong>
      <span className={styles['countdown__unit-label']}>{label}</span>
    </div>
  );
}