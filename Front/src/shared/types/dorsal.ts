export type DorsalStatus = 'available' | 'assigned' | 'locked';

export interface Dorsal {
  number: number;
  status: DorsalStatus;
  assignedChildId?: string;
  assignedChildName?: string;
}