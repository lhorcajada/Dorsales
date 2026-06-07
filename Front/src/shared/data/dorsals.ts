export const TOTAL_DORSALS = 100;

export const DORSALS = Array.from({ length: TOTAL_DORSALS }, (_, index) => index + 1);

export const ASSIGNED_DORSALS = new Map<number, string>([
  [4, 'Lucas M.'],
  [7, 'Noa S.'],
  [9, 'Hugo R.'],
  [10, 'Martina L.'],
]);