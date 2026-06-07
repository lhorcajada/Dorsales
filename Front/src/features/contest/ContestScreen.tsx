import { useEffect, useState } from 'react';

import { useNavigate } from 'react-router-dom';

import { ConfirmationPopup } from '../../shared/components/ConfirmationPopup/ConfirmationPopup';
import { InfoPopup } from '../../shared/components/InfoPopup/InfoPopup';
import { PageHeader } from '../../shared/components/PageHeader/PageHeader';
import { useNotifications } from '../../shared/context/useNotifications';
import { useAuth } from '../../shared/hooks/useAuth';
import { appPaths } from '../../router/paths';
import {
  claimDorsal,
  fetchContestCatalog,
  fetchContestOverview,
  type ContestCatalogRow,
  type ContestOverview,
} from '../../shared/services/contest-service';

import styles from './ContestScreen.module.css';
import { ContestCatalogGrid } from './ContestCatalogGrid';

const CONFIRMATION_TIMEOUT_SECONDS = 12;

function formatDorsalNumber(number: number) {
  return number.toString().padStart(2, '0');
}

interface InfoDialogState {
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}

interface ConfirmationDialogState {
  title: string;
  description: string;
  confirmLabel: string;
}

function getContestBlockedMessage(contestOverview: ContestOverview | null) {
  if (contestOverview?.isPaused) {
    return 'La administración ha pausado la asignación. No puedes elegir dorsales hasta que se reanude.';
  }

  if (contestOverview?.isEnabled === false) {
    return 'La ventana está cerrada. No puedes elegir dorsales hasta que se abra de nuevo.';
  }

  return 'La asignación no está disponible en este momento.';
}

function getCurrentUserDorsal(catalog: ContestCatalogRow[], childIds: string[]) {
  return catalog.find((item) => item.assignedChildId !== null && childIds.includes(item.assignedChildId));
}

function buildConfirmationDialog(
  selectedDorsalNumber: number,
  currentUserDorsal: ContestCatalogRow | undefined,
): ConfirmationDialogState {
  if (!currentUserDorsal) {
    return {
      title: 'Confirma el dorsal',
      description: `Vas a reservar el dorsal ${formatDorsalNumber(selectedDorsalNumber)}. Tienes unos segundos para confirmarlo antes de que se libere.`,
      confirmLabel: 'Confirmar dorsal',
    };
  }

  return {
    title: 'Ya tienes un dorsal asignado',
    description:
      `Ya tienes el dorsal ${formatDorsalNumber(currentUserDorsal.number)} asignado. `
      + `Si quieres seguir con el ${formatDorsalNumber(selectedDorsalNumber)}, confírmalo antes de que se libere.`,
    confirmLabel: 'Seguir',
  };
}

export default function ContestScreen() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { pushNotification } = useNotifications();
  const [catalog, setCatalog] = useState<ContestCatalogRow[]>([]);
  const [contestOverview, setContestOverview] = useState<ContestOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingDorsal, setPendingDorsal] = useState<ContestCatalogRow | null>(null);
  const [lockedDorsalNumber, setLockedDorsalNumber] = useState<number | null>(null);
  const [confirmationDialog, setConfirmationDialog] = useState<ConfirmationDialogState | null>(null);
  const [infoDialog, setInfoDialog] = useState<InfoDialogState | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadCatalog = async () => {
      try {
        const [nextCatalog, nextOverview] = await Promise.all([fetchContestCatalog(), fetchContestOverview()]);

        if (mounted) {
          setCatalog(nextCatalog);
          setContestOverview(nextOverview);
        }
      } catch (catalogError) {
        if (mounted) {
          setError(catalogError instanceof Error ? catalogError.message : 'No se pudo cargar el catálogo.');
        }
      }
    };

    void loadCatalog();

    const refreshInterval = window.setInterval(() => {
      void fetchContestOverview()
        .then((nextOverview) => {
          if (mounted) {
            setContestOverview(nextOverview);
          }
        })
        .catch(() => undefined);
    }, 10000);

    return () => {
      mounted = false;
      window.clearInterval(refreshInterval);
    };
  }, []);

  const clearPendingSelection = () => {
    setPendingDorsal(null);
    setLockedDorsalNumber(null);
    setConfirmationDialog(null);
  };

  const handleSelectDorsal = (dorsal: ContestCatalogRow) => {
    if (!contestOverview?.isEnabled || contestOverview.isPaused) {
      clearPendingSelection();
      const blockedMessage = getContestBlockedMessage(contestOverview);

      pushNotification({
        tone: 'warning',
        title: 'Asignación bloqueada',
        description: blockedMessage,
        durationMs: 6500,
      });

      setInfoDialog({
        title: 'Asignación bloqueada',
        description: blockedMessage,
        actionLabel: 'Entendido',
        onAction: () => setInfoDialog(null),
      });
      return;
    }

    const currentUserDorsal = currentUser?.childIds.length ? getCurrentUserDorsal(catalog, currentUser.childIds) : undefined;

    setLockedDorsalNumber(dorsal.number);
    setPendingDorsal(dorsal);
    setConfirmationDialog(buildConfirmationDialog(dorsal.number, currentUserDorsal));
  };

  const handleConfirmDorsal = async () => {
    if (!pendingDorsal || isConfirming) {
      return;
    }

    if (!contestOverview?.isEnabled || contestOverview.isPaused) {
      clearPendingSelection();
      const pausedMessage = getContestBlockedMessage(contestOverview);

      pushNotification({
        tone: 'warning',
        title: 'Asignación bloqueada',
        description: pausedMessage,
        durationMs: 6500,
      });

      setInfoDialog({
        title: 'Asignación bloqueada',
        description: pausedMessage,
        actionLabel: 'Entendido',
        onAction: () => setInfoDialog(null),
      });
      return;
    }

    const childId = currentUser?.childIds[0];

    if (!childId) {
      clearPendingSelection();
      setInfoDialog({
        title: 'Falta un hijo asociado',
        description: 'Debes registrar al menos un hijo en tu cuenta para poder confirmar un dorsal.',
        actionLabel: 'Entendido',
        onAction: () => setInfoDialog(null),
      });
      return;
    }

    const dorsalNumber = pendingDorsal.number;

    setIsConfirming(true);

    try {
      await claimDorsal(childId, dorsalNumber);
      const nextCatalog = await fetchContestCatalog();
      const nextOverview = await fetchContestOverview();
      setCatalog(nextCatalog);
      setContestOverview(nextOverview);
      clearPendingSelection();
      setInfoDialog({
        title: 'Dorsal confirmado',
        description: `El dorsal ${formatDorsalNumber(dorsalNumber)} se ha guardado correctamente en la base de datos.`,
        actionLabel: 'Ir a la home',
        onAction: () => navigate(appPaths.home),
      });
    } catch (saveError) {
      clearPendingSelection();

      const errorMessage = saveError instanceof Error ? saveError.message : '';
      const alreadyHasDorsal = errorMessage.includes('Child already has a dorsal');

      setInfoDialog({
        title: alreadyHasDorsal ? 'Ya tienes un dorsal asignado' : 'No se pudo guardar',
        description:
          alreadyHasDorsal
            ? 'Ese hijo ya tiene un dorsal asignado. Si necesitas cambiarlo, contacta con administración.'
            : saveError instanceof Error
              ? saveError.message
              : `No se pudo guardar el dorsal ${formatDorsalNumber(dorsalNumber)}.`,
        actionLabel: 'Entendido',
        onAction: () => setInfoDialog(null),
      });
    } finally {
      setIsConfirming(false);
    }
  };

  const handleTimeout = () => {
    if (!pendingDorsal) {
      return;
    }

    const dorsalNumber = pendingDorsal.number;
    clearPendingSelection();
    setInfoDialog({
      title: 'Tiempo agotado',
      description: `Se acabó el tiempo para confirmar el dorsal ${formatDorsalNumber(dorsalNumber)}. Ya está disponible de nuevo.`,
      actionLabel: 'Entendido',
      onAction: () => setInfoDialog(null),
    });
  };

  const handleBack = () => {
    navigate(appPaths.home);
  };

  return (
    <section className={styles['contest-screen']}>
      <PageHeader
        eyebrow="Modo concurso"
        title="Selecciona un dorsal"
        description=""
        actions={(
          <button type="button" className={styles['contest-screen__back-button']} onClick={handleBack}>
            Volver
          </button>
        )}
      />

      <div className={styles['contest-screen__panel']}>
        {error ? <p className={styles['contest-screen__state']}>{error}</p> : null}

        {contestOverview?.isPaused ? (
          <div className={styles['contest-screen__notice']}>
            <strong className={styles['contest-screen__notice-title']}>Tiempo detenido</strong>
            <p className={styles['contest-screen__notice-copy']}>
              La administración ha pausado la asignación. No puedes elegir dorsales hasta que se reanude.
            </p>
          </div>
        ) : null}

        <div className={styles['contest-screen__legend']}>
          <span className={styles['contest-screen__legend-item']}>Disponible</span>
          <span className={styles['contest-screen__legend-item--assigned']}>Asignado</span>
          <span className={styles['contest-screen__legend-item--locked']}>Bloqueado</span>
        </div>

        <ContestCatalogGrid
          catalog={catalog}
          lockedDorsalNumber={lockedDorsalNumber}
          onSelectDorsal={handleSelectDorsal}
        />
      </div>

      <ConfirmationPopup
        open={pendingDorsal !== null}
        title={confirmationDialog?.title ?? 'Confirma el dorsal'}
        description={confirmationDialog?.description ?? ''}
        countdownSeconds={CONFIRMATION_TIMEOUT_SECONDS}
        confirmLabel={isConfirming ? 'Guardando...' : confirmationDialog?.confirmLabel ?? 'Confirmar dorsal'}
        cancelLabel="Cancelar"
        onConfirm={handleConfirmDorsal}
        onCancel={clearPendingSelection}
        onTimeout={handleTimeout}
        confirmDisabled={isConfirming}
      />

      <InfoPopup
        open={infoDialog !== null}
        title={infoDialog?.title ?? ''}
        description={infoDialog?.description ?? ''}
        actionLabel={infoDialog?.actionLabel ?? 'Aceptar'}
        onAction={() => {
          if (!infoDialog) {
            return;
          }

          infoDialog.onAction();

          if (infoDialog.title === 'Tiempo agotado') {
            setInfoDialog(null);
          }
        }}
      />
    </section>
  );
}