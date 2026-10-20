/** Fit, modality and edge are independent. All widths are the available host,
 * after navigation, never a browser breakpoint or the pane's own width. */
export function adaptiveSurfaceLayout(available: number, textSize: number, canDock: boolean) {
  const pane = 36 * textSize, gaps = 24;
  return { docked: canDock && available >= 45 * textSize + pane + gaps,
    edge: available >= pane + gaps ? 'right' as const : 'bottom' as const,
    paneWidth: Math.max(0, Math.min(pane, available - gaps)), reservation: pane + gaps };
}
