import type { AdminOverview } from '../../shared/services/contest-service';

type AdminSettings = NonNullable<AdminOverview['settings']>;

function formatDuration(targetTime: Date, now: Date) {
  const totalMinutes = Math.max(0, Math.ceil((targetTime.getTime() - now.getTime()) / 60000));

  if (totalMinutes < 1) {
    return 'menos de 1 minuto';
  }

  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  const parts: string[] = [];

  if (days > 0) {
    parts.push(`${days} día${days === 1 ? '' : 's'}`);
  }

  if (hours > 0) {
    parts.push(`${hours} hora${hours === 1 ? '' : 's'}`);
  }

  if (minutes > 0 && parts.length < 2) {
    parts.push(`${minutes} min`);
  }

  return parts.join(' y ');
}

export function getAssignmentWindowSummary(settings: AdminSettings | null, now: Date) {
  if (!settings) {
    return 'Configura la fecha de apertura, el cierre automático, el estado visible para padres y la pausa manual.';
  }

  const opensAt = settings.opensAt ? new Date(settings.opensAt) : null;
  const closesAt = settings.closesAt ? new Date(settings.closesAt) : null;

  if (!opensAt || !closesAt) {
    return 'Configura la fecha de apertura, el cierre automático, el estado visible para padres y la pausa manual.';
  }

  const pausedPrefix = settings.isPaused ? 'Tiempo detenido. ' : '';

  if (now < opensAt) {
    return `${pausedPrefix}Ventana programada para elegir dorsales. Abre ${settings.opensAtLabel}, cierra ${settings.closesAtLabel} y quedan ${formatDuration(opensAt, now)} para abrir.`;
  }

  if (now < closesAt) {
    return `${pausedPrefix}Ventana abierta para elegir dorsales. Abrió ${settings.opensAtLabel}, cierra ${settings.closesAtLabel} y quedan ${formatDuration(closesAt, now)}.`;
  }

  return `${pausedPrefix}Ventana cerrada. Abrió ${settings.opensAtLabel}, cerró ${settings.closesAtLabel} y terminó hace ${formatDuration(now, closesAt)}.`;
}