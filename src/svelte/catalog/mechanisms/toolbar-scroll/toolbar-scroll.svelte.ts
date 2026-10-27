import { getContext, setContext } from "svelte";

type ScrollOwner = { owner: () => HTMLElement | null; viewport: () => HTMLElement | null };
const scrollKey = Symbol("desert.scroll-owner");

/** Only shared surface owners register scrolling; consumers cannot redefine it. */
export function provideToolbarScroll(owner: ScrollOwner): void { setContext(scrollKey, owner); }

const edgeKey = Symbol("desert.frame-edge");
/** A frame tells the bars in its top and bottom slots that they sit on its edges (they layer above its scroll edges);
 * every surface first says no, so content never inherits an outer frame's edge, and a bar says no to what it holds. */
export function provideFrameEdge(edge: boolean): void { setContext(edgeKey, edge); }
export function useFrameEdge(): boolean { return getContext<boolean | undefined>(edgeKey) ?? false; }

export function useToolbarScroll(element: () => HTMLElement | null, edge: () => "top" | "bottom") {
  const source = getContext<ScrollOwner | undefined>(scrollKey);
  let available = $state(false);
  function returnToTop() {
    const viewport = source?.viewport();
    if (!available || !viewport || viewport.inert) return;
    viewport.scrollTo({ top: 0, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }
  $effect(() => {
    const toolbar = element(), owner = source?.owner(), viewport = source?.viewport();
    available = false;
    // Portals must not inherit the launcher's viewport. A secondary/search rail
    // never covers the primary toolbar's hit area or adds another focus stop.
    if (!toolbar || !owner || !viewport || edge() !== "top"
      || toolbar.closest("[data-scroll-owner]") !== owner
      || owner.querySelector('[data-toolbar="top"]') !== toolbar) return;
    const measure = () => { available = viewport.scrollTop > 0 && !viewport.inert
      && !toolbar.closest('[inert], [aria-hidden="true"]'); };
    let pointer: { x: number; y: number } | null = null, dragged = false;
    const down = (event: PointerEvent) => { pointer = { x: event.clientX, y: event.clientY }; dragged = false; };
    const move = (event: PointerEvent) => {
      if (pointer && Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y) > 6) dragged = true;
    };
    const cancel = () => { pointer = null; dragged = true; };
    const click = (event: MouseEvent) => {
      pointer = null;
      if (dragged || event.defaultPrevented || !(event.target instanceof Element)) return;
      // A disabled button may delegate hit testing to its wrapper. The action
      // still owns that region; it must never fall through to surface scrolling.
      if (event.target.closest('.toolbar-action,[data-toolbar-controls],button,a,input,textarea,select,summary,[role="button"],[role="link"],[contenteditable="true"]')) return;
      returnToTop();
    };
    const mutations = new MutationObserver(measure);
    mutations.observe(owner, { attributes: true, subtree: true, attributeFilter: ["inert", "aria-hidden"] });
    viewport.addEventListener("scroll", measure, { passive: true });
    toolbar.addEventListener("click", click);
    toolbar.addEventListener("pointerdown", down, { passive: true });
    toolbar.addEventListener("pointermove", move, { passive: true });
    toolbar.addEventListener("pointercancel", cancel);
    measure();
    return () => {
      mutations.disconnect(); viewport.removeEventListener("scroll", measure);
      toolbar.removeEventListener("click", click); toolbar.removeEventListener("pointerdown", down);
      toolbar.removeEventListener("pointermove", move); toolbar.removeEventListener("pointercancel", cancel);
    };
  });
  return { get available() { return available; }, returnToTop };
}
