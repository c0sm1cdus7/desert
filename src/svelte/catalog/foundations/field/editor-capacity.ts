import { toolbarBounds } from '../../../infra/toolbar-bounds.ts';

/** Autosizing is bounded by the reading area, not a device category. The
 * editor retains native caret scrolling once its complete well fills it. */
export function observeEditorCapacity(editor: HTMLTextAreaElement): () => void {
  const viewport = editor.closest<HTMLElement>('.place-viewport');
  const owner = viewport?.closest<HTMLElement>('[data-scroll-owner]');
  const well = editor.closest<HTMLElement>('.field-well');
  if (!viewport || !owner || !well) return () => {};
  let frame = 0, previous = '';
  const measure = () => {
    frame = 0;
    const bounds = viewport.getBoundingClientRect();
    let top = 0;
    let bottom = 0;
    for (const bar of owner.querySelectorAll<HTMLElement>('[data-toolbar]')) {
      if (bar.closest('[data-scroll-owner]') !== owner || !bar.getClientRects().length) continue;
      const rect = toolbarBounds(bar);
      if (bar.dataset.toolbar === 'bottom') bottom = Math.max(bottom, bounds.bottom - rect.top);
      else top = Math.max(top, rect.bottom - bounds.top);
    }
    const style = getComputedStyle(editor);
    const minimum = parseFloat(style.lineHeight) + parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
    const overhead = well.offsetHeight - editor.offsetHeight;
    const capacity = `${Math.floor(Math.max(minimum, bounds.height - top - bottom - overhead - 16))}px`;
    if (capacity !== previous) {
      previous = capacity;
      editor.style.setProperty('--field-editor-capacity', capacity);
    }
  };
  const schedule = () => { if (!frame) frame = requestAnimationFrame(measure); };
  const size = new ResizeObserver(schedule);
  size.observe(viewport); size.observe(well);
  const chrome = new MutationObserver(schedule);
  chrome.observe(viewport, { attributes: true, attributeFilter: ['style'] });
  measure();
  return () => {
    cancelAnimationFrame(frame); size.disconnect(); chrome.disconnect();
    editor.style.removeProperty('--field-editor-capacity');
  };
}
