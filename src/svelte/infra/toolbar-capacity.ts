/** Reserve More only when not every command fits. Search is budgeted by its host. */
export function toolbarVisibleCount(count: number, target: number, gap: number, available: number): number {
  if (count === 0) return 0;
  const slots = Math.max(0, Math.floor((available + gap) / (target + gap)));
  return slots >= count ? count : Math.max(0, slots - 1);
}
