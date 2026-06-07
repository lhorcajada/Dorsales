import { describe, expect, it } from 'vitest';

import type { ContestOverview } from '../../shared/services/contest-service';

import { getContestHomeState, getContestStateLabel, getCountdownTarget } from './homeScreenHelpers';

function buildOverview(overrides: Partial<ContestOverview> = {}): ContestOverview {
  return {
    contestName: 'Asignación de dorsales',
    isEnabled: false,
    isPaused: false,
    opensAt: null,
    closesAt: null,
    opensAtLabel: 'sin fecha',
    closesAtLabel: 'sin fecha',
    totalDorsals: 100,
    availableDorsals: 100,
    assignedDorsals: 0,
    lockedDorsals: 0,
    ...overrides,
  };
}

describe('getContestHomeState', () => {
  it('shows the contest as pending when opening is scheduled in the future', () => {
    const now = new Date('2026-06-07T10:00:00.000Z');
    const overview = buildOverview({
      opensAt: new Date('2026-06-07T12:00:00.000Z'),
      closesAt: new Date('2026-06-07T14:00:00.000Z'),
    });

    expect(getContestHomeState(overview, now)).toBe('pending-open');
    expect(getContestStateLabel('pending-open')).toBe('Pendiente de apertura');
    expect(getCountdownTarget(overview, 'pending-open')).toEqual(overview.opensAt);
  });

  it('shows the contest as pending when it is not enabled yet and has no dates', () => {
    const now = new Date('2026-06-07T10:00:00.000Z');
    const overview = buildOverview();

    expect(getContestHomeState(overview, now)).toBe('pending-open');
    expect(getCountdownTarget(overview, 'pending-open')).toBeInstanceOf(Date);
  });

  it('keeps a paused contest closed', () => {
    const now = new Date('2026-06-07T10:00:00.000Z');
    const overview = buildOverview({
      isEnabled: true,
      isPaused: true,
      opensAt: new Date('2026-06-07T09:00:00.000Z'),
      closesAt: new Date('2026-06-07T11:00:00.000Z'),
    });

    expect(getContestHomeState(overview, now)).toBe('closed');
    expect(getContestStateLabel('closed')).toBe('Cerrado');
  });
});