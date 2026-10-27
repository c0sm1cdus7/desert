import { tick } from 'svelte';
import { tabbable } from 'tabbable';

const holds = new WeakMap<HTMLElement, { count: number; original: boolean }>();
function holdInert(element: HTMLElement) {
  const entry = holds.get(element) ?? { count: 0, original: element.inert };
  entry.count++; holds.set(element, entry); element.inert = true;
  return () => {
    if (--entry.count === 0) { element.inert = entry.original; holds.delete(element); }
  };
}

/** Keep Bits' presence, dismissal layers and autofocus lifecycle. Its installed
 * FocusScope only reads trapFocus when mounted, so adaptive modality uses native
 * inert plus tabbable boundaries instead of remounting the user's form. */
export function adaptiveModality(element: () => HTMLElement | null, modal: () => boolean) {
  $effect(() => {
    const pane = element();
    if (!pane || !modal()) return;
    const releases: (() => void)[] = [];
    const owned = new Set<HTMLElement>([pane]);
    // Already-open child popovers belong to this surface through aria-controls.
    for (const owner of pane.querySelectorAll('[aria-controls]')) {
      for (const id of (owner.getAttribute('aria-controls') ?? '').split(' ')) {
        const target = document.getElementById(id); if (target) owned.add(target);
      }
    }
    // A modal failure or a child picker may already be above this pane when a
    // resize makes the pane modal. Preserve the later production layer rather
    // than making it inert or stealing its focus during the parent's adaptation.
    for (const layer of document.querySelectorAll<HTMLElement>(
      '[data-dialog-content][data-state="open"],[data-slot="popover-content"][data-state="open"],[data-slot="select-content"][data-state="open"]')) {
      if (pane.compareDocumentPosition(layer) & Node.DOCUMENT_POSITION_FOLLOWING) owned.add(layer);
    }
    for (let branch: HTMLElement = pane; branch.parentElement; branch = branch.parentElement) {
      for (const sibling of branch.parentElement.children) {
        if (!(sibling instanceof HTMLElement) || sibling === branch || /^(SCRIPT|STYLE|LINK)$/.test(sibling.tagName)) continue;
        if ([...owned].some(target => sibling === target || sibling.contains(target))) continue;
        // Scrims are dismissal targets; they must remain interactive.
        if (sibling.matches('[data-dialog-overlay]')) continue;
        releases.push(holdInert(sibling));
      }
      if (branch.parentElement === document.body) break;
    }
    let live = true;
    void tick().then(() => {
      if (live && !pane.contains(document.activeElement) && ![...owned].some(target => target.contains(document.activeElement))) {
        pane.focus({ preventScroll: true });
      }
    });
    const key = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.key !== 'Tab' || event.isComposing) return;
      // A portalled child is handled by its own installed dialog/popover scope.
      if (event.target instanceof Node && !pane.contains(event.target) && event.target !== document.body) return;
      const items = tabbable(pane, { getShadowRoot: true });
      const first = items[0], last = items.at(-1), active = document.activeElement;
      if (!first) { event.preventDefault(); pane.focus({ preventScroll: true }); }
      else if (event.shiftKey && (active === first || active === pane)) { event.preventDefault(); last!.focus({ preventScroll: true }); }
      else if (!event.shiftKey && (active === last || active === pane)) { event.preventDefault(); first.focus({ preventScroll: true }); }
    };
    document.addEventListener('keydown', key);
    return () => { live = false; document.removeEventListener('keydown', key); releases.reverse().forEach(release => release()); };
  });
}
