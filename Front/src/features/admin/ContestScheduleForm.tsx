import { useEffect, useState, type FormEvent } from 'react';

import { updateContestSchedule } from '../../shared/services/contest-service';
import { useNotifications } from '../../shared/context/useNotifications';

import { buildContestScheduleFormState, formatDateLabel, type ContestScheduleFormState, type ContestScheduleFormProps } from './contestScheduleFormHelpers';
import styles from './ContestScheduleForm.module.css';

export function ContestScheduleForm({ settings, onSaved }: ContestScheduleFormProps) {
  const [formState, setFormState] = useState<ContestScheduleFormState>(() => buildContestScheduleFormState(settings));
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const { pushNotification } = useNotifications();

  useEffect(() => {
    setFormState(buildContestScheduleFormState(settings));
    setStatus('idle');
    setMessage(null);
  }, [settings]);

  const persistSettings = async (nextIsPaused: boolean) => {
    const startDate = new Date(formState.startAt);
    const duration = Number(formState.durationMinutes);

    if (Number.isNaN(startDate.getTime()) || !Number.isFinite(duration) || duration < 1) {
      setStatus('error');
      setMessage('Revisa la fecha de inicio y la duración de apertura.');
      return;
    }

    setStatus('saving');
    setMessage(null);

    try {
      const opensAt = startDate.toISOString();
      const closesAt = new Date(startDate.getTime() + duration * 60000).toISOString();
      const savedSettings = await updateContestSchedule({
        isEnabled: formState.isEnabled,
        isPaused: nextIsPaused,
        opensAt,
        closesAt,
      });

      onSaved({
        contestName: savedSettings.contest_name,
        isEnabled: savedSettings.is_enabled,
        isPaused: savedSettings.is_paused ?? false,
        opensAt: savedSettings.opens_at,
        closesAt: savedSettings.closes_at,
        opensAtLabel: formatDateLabel(savedSettings.opens_at),
        closesAtLabel: formatDateLabel(savedSettings.closes_at),
      });

      setStatus('success');
      setMessage(nextIsPaused ? 'El tiempo se ha detenido correctamente.' : 'La ventana de apertura se ha guardado correctamente.');
      pushNotification({
        tone: nextIsPaused ? 'warning' : 'success',
        title: nextIsPaused ? 'Tiempo detenido' : 'Ventana guardada',
        description: nextIsPaused
          ? 'Los usuarios ya no pueden reservar dorsales hasta que lo reanudes.'
          : 'La programación del concurso se ha actualizado correctamente.',
      });
    } catch (saveError) {
      setStatus('error');
      setMessage(saveError instanceof Error ? saveError.message : 'No se pudo guardar la configuración.');
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void persistSettings(settings?.isPaused ?? false);
  };

  return (
    <article className={styles['contest-schedule-form']}>
      <div className={styles['contest-schedule-form__copy']}>
        <p className={styles['contest-schedule-form__eyebrow']}>Apertura del concurso</p>
        <h3 className={styles['contest-schedule-form__title']}>Configura cuándo empieza y cuánto dura la ventana</h3>
        <p className={styles['contest-schedule-form__description']}>
          El cierre se calcula automáticamente a partir del inicio y la duración que definas.
        </p>
      </div>

      <form className={styles['contest-schedule-form__form']} onSubmit={handleSubmit}>
        <label className={styles['contest-schedule-form__field']}>
          <span>Inicio</span>
          <input
            type="datetime-local"
            value={formState.startAt}
            onChange={(event) => setFormState((current) => ({ ...current, startAt: event.target.value }))}
          />
        </label>

        <label className={styles['contest-schedule-form__field']}>
          <span>Duración de apertura (minutos)</span>
          <input
            type="number"
            min="1"
            step="1"
            value={formState.durationMinutes}
            onChange={(event) => setFormState((current) => ({ ...current, durationMinutes: event.target.value }))}
          />
        </label>

        <label className={styles['contest-schedule-form__toggle']}>
          <input
            type="checkbox"
            checked={formState.isEnabled}
            onChange={(event) => setFormState((current) => ({ ...current, isEnabled: event.target.checked }))}
          />
          <span>Activar programación del concurso</span>
        </label>

        <button type="submit" className={styles['contest-schedule-form__submit']} disabled={status === 'saving'}>
          {status === 'saving' ? 'Guardando...' : 'Guardar ventana de apertura'}
        </button>

        <button
          type="button"
          className={styles['contest-schedule-form__pause']}
          disabled={status === 'saving' || !settings}
          onClick={() => void persistSettings(!(settings?.isPaused ?? false))}
        >
          {settings?.isPaused ? 'Reanudar tiempo' : 'Detener tiempo'}
        </button>

        {message ? (
          <p className={status === 'error' ? styles['contest-schedule-form__message--error'] : styles['contest-schedule-form__message']}>
            {message}
          </p>
        ) : null}
      </form>
    </article>
  );
}