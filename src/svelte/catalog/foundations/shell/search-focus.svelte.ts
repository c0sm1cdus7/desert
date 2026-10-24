// Shell part (from CatalogWorkspace.svelte:85-155): search is a foreground mode of the place. Focus or a press leaving
// the search (its field, toggle and results) cancels it; Escape inside it cancels and returns focus to the toggle that
// opened it, else to the last focused content, else to the content viewport. Content focus is remembered meanwhile.
import { tick } from "svelte";

type Elements = { root: () => HTMLElement | null; viewport: () => HTMLElement | null; results: () => HTMLElement | null };
type Options = Elements & { searching: () => boolean; composing: () => boolean; cancel: (restoreFocus: boolean) => void };

export function searchFocus({ root, viewport, results, searching, composing, cancel }: Options) {
  let contentFocus: HTMLElement | null = null, opener: HTMLElement | null = null, activation: Element | null = null;
  const inSearch = (target: EventTarget | null) => target instanceof Node && Boolean(results()?.contains(target)
    || root()?.querySelector("[data-catalog-search-actions]")?.contains(target));
  // WebKit may focus a tabindex ancestor instead of the pressed button; only that activation stays alive.
  const ownsPointerFocus = (target: EventTarget | null) => target instanceof Node && activation !== null && target.contains(activation);
  async function close(restoreFocus: boolean) {
    cancel(restoreFocus);
    if (!restoreFocus) return;
    await tick();
    const content = viewport(), remembered = contentFocus;
    const target = opener?.isConnected && opener.checkVisibility() ? opener
      : remembered && content?.contains(remembered) && remembered.checkVisibility() && !remembered.matches(":disabled,[aria-disabled='true']")
        ? remembered : content;
    target?.focus({ preventScroll: true });
  }
  return {
    /** The place changed: a remembered content focus belongs to the old one. */
    reset() { contentFocus = null; },
    /** Search opened: remember the toggle that opened it. */
    opened() { opener = root()?.querySelector<HTMLElement>("[data-search-toggle] button") ?? null; },
    focusin(event: FocusEvent) {
      if (!searching() && event.target instanceof HTMLElement && viewport()?.contains(event.target)) contentFocus = event.target;
      else if (searching() && !inSearch(event.target) && !ownsPointerFocus(event.target)) void close(false);
    },
    focusout(event: FocusEvent) {
      // Browsers can expose BODY between focusout and focusin: the announced destination decides, else settled focus.
      if (!searching() || inSearch(event.relatedTarget)) return;
      requestAnimationFrame(() => {
        if (searching() && !inSearch(document.activeElement) && !ownsPointerFocus(document.activeElement)) void close(false);
      });
    },
    pointerdown(event: PointerEvent) {
      activation = null;
      if (!searching() || !(event.target instanceof Element)) return;
      // A result, the field and its toggle own their own transaction; a press elsewhere cancels.
      const own = event.target.closest("[data-catalog-search-actions],[data-search-result]");
      if (own) { activation = own; return; }
      void close(!event.target.closest("button,a[href],input,textarea,select,[tabindex]:not([tabindex='-1'])"));
    },
    pointerfinish() {
      const pressed = activation;
      if (!pressed) return;
      // Click follows pointerup: reconcile after it, including gestures that never activated a result.
      requestAnimationFrame(() => {
        if (activation !== pressed) return;
        activation = null;
        if (searching() && !inSearch(document.activeElement)) void close(false);
      });
    },
    keydown(event: KeyboardEvent) {
      if (!searching() || !inSearch(event.target) || event.defaultPrevented || event.key !== "Escape" || event.isComposing
        || composing() || event.keyCode === 229) return;
      event.preventDefault(); event.stopPropagation(); void close(true);
    },
  };
}
