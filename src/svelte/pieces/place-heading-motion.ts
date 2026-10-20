import { observeDockAbove } from './dock-above.ts';
import { toolbarReadingBoundary } from './toolbar-reading-boundary.ts';

/** Place identity is one consumer of the reusable dock-above behavior. */
export function observePlaceHeading(viewport: HTMLElement, heading: HTMLElement, compact: HTMLElement) {
  const boundary = toolbarReadingBoundary(viewport, compact);
  const stop = observeDockAbove(viewport, heading.querySelector<HTMLElement>('[data-dock-above]')!, compact, value => {
    boundary.paint(Number(compact.style.opacity));
    heading.dataset.handoff = value.state;
    heading.dataset.handoffStart = String(value.start);
    heading.dataset.handoffEnd = String(value.end);
  });
  return () => { stop(); boundary.dispose(); };
}
