import { toolbarBounds } from '../../mechanisms/toolbar-geometry/toolbar-bounds.ts';

export type ScrollEdge = { edge: "top" | "bottom"; top: number; left: number; width: number;
  height: number; core: number; strength: number };

/** One visual treatment per scroll viewport; never changes scroll or focus. */
export function observeScrollEdges(viewport: HTMLElement, owner: HTMLElement, update: (edges: ScrollEdge[]) => void) {
  let pending = 0;
  const observed = new Set<Element>();
  const schedule = () => { if (!pending) pending = requestAnimationFrame(measure); };
  const resize = new ResizeObserver(schedule);
  function measure() {
    pending = 0;
    const bars = [...owner.querySelectorAll<HTMLElement>("[data-toolbar]")]
      .filter(bar => bar.closest("[data-scroll-owner]") === owner && bar.getClientRects().length);
    const targets = new Set<Element>([owner, viewport, ...viewport.children, ...bars]);
    for (const target of observed) if (!targets.has(target)) { resize.unobserve(target); observed.delete(target); }
    for (const target of targets) if (!observed.has(target)) { resize.observe(target); observed.add(target); }
    const bounds = viewport.getBoundingClientRect(), parent = owner.getBoundingClientRect();
    const max = Math.max(0, viewport.scrollHeight - viewport.clientHeight);
    const scrollable = /auto|scroll/.test(getComputedStyle(viewport).overflowY) && max > 1;
    const position = Math.max(0, Math.min(max, viewport.scrollTop));
    // A short, shared feather protects the boundary without sacrificing reading height.
    const feather = Math.min(parseFloat(getComputedStyle(owner).getPropertyValue("--scroll-edge-feather")) || 32, bounds.height / 4);
    const edges: ScrollEdge[] = [];
    for (const edge of ["top", "bottom"] as const) {
      const bar = bars.find(bar => bar.dataset.toolbar === edge);
      if (!bar) continue;
      const chrome = toolbarBounds(bar);
      const overlap = Math.max(0, edge === "top" ? chrome.bottom - bounds.top : bounds.bottom - chrome.top);
      const core = Math.min(overlap, bounds.height / 2);
      const height = Math.min(core + feather, bounds.height / 2);
      const distance = edge === "top" ? position : max - position;
      edges.push({ edge, top: (edge === "top" ? bounds.top : bounds.bottom - height) - parent.top - owner.clientTop,
        left: bounds.left - parent.left - owner.clientLeft, width: bounds.width, height, core,
        strength: scrollable ? Math.min(1, distance / Math.max(1, feather)) : 0 });
    }
    update(edges);
  }
  const mutations = new MutationObserver(schedule);
  mutations.observe(viewport, { childList: true, subtree: true, characterData: true });
  viewport.addEventListener("scroll", schedule, { passive: true });
  document.fonts.addEventListener("loadingdone", schedule);
  measure();
  return () => {
    cancelAnimationFrame(pending); resize.disconnect(); mutations.disconnect();
    viewport.removeEventListener("scroll", schedule); document.fonts.removeEventListener("loadingdone", schedule);
  };
}
