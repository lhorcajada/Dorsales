import type { ContestOverview } from '../../shared/services/contest-service';

export type ContestHomeState = 'pending-open' | 'open' | 'closed';

export function getContestHomeState(overview: ContestOverview | null, now: Date): ContestHomeState {
  if (!overview) {
    return 'closed';
  }

  if (overview.isPaused || (overview.closesAt && now > overview.closesAt)) {
    return 'closed';
  }

  if (overview.opensAt && now < overview.opensAt) {
    return 'pending-open';
  }

  if (!overview.isEnabled) {
    return 'pending-open';
  }

  return 'open';
}

export function getContestStateLabel(state: ContestHomeState) {
  if (state === 'pending-open') {
    return 'Pendiente de apertura';
  }

  if (state === 'open') {
    return 'Abierto';
  }

  return 'Cerrado';
}

export function getCountdownTarget(overview: ContestOverview | null, state: ContestHomeState) {
  if (state === 'pending-open') {
    return overview?.opensAt ?? new Date(Date.now() + 1000 * 60 * 60 * 12);
  }

  if (state === 'open') {
    return overview?.closesAt ?? new Date(Date.now() + 1000 * 60 * 60 * 12);
  }

  return new Date(0);
}