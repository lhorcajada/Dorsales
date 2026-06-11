import { useState } from 'react';

import { useNotifications } from '../../shared/context/useNotifications';
import { fetchContestCatalog } from '../../shared/services/contest-service';

import styles from './LiveAssignmentsSection.module.css';
import { downloadAssignmentsPdf } from './exportAssignmentsPdf';

export function ExportAssignmentsPdfButton() {
  const { pushNotification } = useNotifications();
  const [isGenerating, setIsGenerating] = useState(false);

  const handleExport = async () => {
    if (isGenerating) {
      return;
    }

    setIsGenerating(true);

    try {
      const catalog = await fetchContestCatalog();
      const finalAssignments = catalog
        .filter((row) => row.assignedChildName !== null)
        .map((row) => ({
          dorsalNumber: row.number,
          childName: row.assignedChildName as string,
        }));

      if (finalAssignments.length === 0) {
        pushNotification({
          tone: 'warning',
          title: 'No hay dorsales finales',
          description: 'Todavia no hay asignaciones definitivas para imprimir.',
          durationMs: 5000,
        });
        return;
      }

      downloadAssignmentsPdf(finalAssignments);
      pushNotification({
        tone: 'success',
        title: 'PDF generado',
        description: 'Se descargo el listado final de dorsales asignados.',
        durationMs: 4500,
      });
    } catch {
      pushNotification({
        tone: 'error',
        title: 'No se pudo generar el PDF',
        description: 'Vuelve a intentarlo en unos segundos.',
        durationMs: 6000,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <button
      className={styles['live-assignments__export-button']}
      disabled={isGenerating}
      onClick={handleExport}
      type="button"
    >
      {isGenerating ? 'Generando PDF...' : 'Imprimir finales PDF'}
    </button>
  );
}