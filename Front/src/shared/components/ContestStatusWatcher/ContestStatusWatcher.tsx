import { useEffect, useRef } from 'react';

import { fetchContestOverview } from '../../services/contest-service';
import { useNotifications } from '../../context/useNotifications';

const POLL_INTERVAL_MS = 10000;

export function ContestStatusWatcher() {
  const { pushNotification } = useNotifications();
  const previousPausedRef = useRef<boolean | null>(null);
  const previousOpensAtRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    let mounted = true;

    const pollStatus = async () => {
      try {
        const overview = await fetchContestOverview();

        if (!mounted) {
          return;
        }

        if (previousPausedRef.current !== null && previousPausedRef.current !== overview.isPaused) {
          pushNotification({
            tone: overview.isPaused ? 'warning' : 'success',
            title: overview.isPaused ? 'Tiempo detenido' : 'Tiempo reanudado',
            description: overview.isPaused
              ? 'La administración ha detenido la asignación. No podrás elegir dorsales hasta que vuelva a activarse.'
              : 'La administración ha reanudado la asignación. Ya puedes seguir participando.',
          });
        }

        const opensAtIso = overview.opensAt ? overview.opensAt.toISOString() : null;

        if (previousOpensAtRef.current !== undefined && previousOpensAtRef.current !== opensAtIso) {
          pushNotification({
            tone: 'info',
            title: 'Apertura actualizada',
            description: `El administrador ha modificado el momento de apertura. Nueva fecha: ${overview.opensAtLabel}.`,
          });
        }

        previousPausedRef.current = overview.isPaused;
        previousOpensAtRef.current = opensAtIso;
      } catch {
        // Silent polling failure; the visible screens already handle load errors.
      }
    };

    void pollStatus();
    const intervalId = window.setInterval(() => {
      void pollStatus();
    }, POLL_INTERVAL_MS);

    return () => {
      mounted = false;
      window.clearInterval(intervalId);
    };
  }, [pushNotification]);

  return null;
}
