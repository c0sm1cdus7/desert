import { getContext, setContext } from "svelte";

const hostKey = Symbol("desert.surface-host");
type Host = () => HTMLElement | null;
type Layout = { reserve: (inline: number) => void };
type SurfaceHost = { element: Host; layout: Layout | undefined; owner: symbol | null };

/** Portalled transients inherit their launch surface, not the window or popup width. */
export function provideSurfaceHost(element: Host, layout?: Layout): void {
  const host = $state<SurfaceHost>({ element, layout, owner: null });
  setContext(hostKey, host);
}

export function useSurfaceHost(anchor: Host = () => null) {
  const inherited = getContext<SurfaceHost | undefined>(hostKey);
  let availableInline = $state(0), availableBlock = $state(0), textSize = $state(16);
  let hostLeft = $state(0), hostTop = $state(0), hostRight = $state(0), hostBottom = $state(0);
  $effect(() => {
    const root = document.documentElement, viewport = window.visualViewport;
    const source = inherited?.element() ?? anchor()?.closest<HTMLElement>("[data-surface-host], [data-surface-frame]") ?? root;
    let contentInline = 0;
    const measure = () => {
      const rect = source.getBoundingClientRect();
      const leading = Number.parseFloat(getComputedStyle(source).getPropertyValue('--place-leading-inset')) || 0;
      // Only an adaptive layout owns screen-space reservations. A narrow
      // launcher still supplies the reading budget, not the modal's height.
      hostLeft = inherited?.layout ? Math.max(0, rect.left + leading) : 0;
      hostTop = inherited?.layout ? Math.max(0, rect.top) : 0;
      hostRight = inherited?.layout ? Math.max(0, root.clientWidth - rect.right) : 0;
      hostBottom = inherited?.layout ? Math.max(0, window.innerHeight - rect.bottom) : 0;
      availableInline = Math.max(0, Math.min(contentInline - leading, root.clientWidth - Math.max(0, rect.left + leading), viewport?.width ?? root.clientWidth));
      availableBlock = Math.min(window.innerHeight, viewport?.height ?? window.innerHeight);
      textSize = Number.parseFloat(getComputedStyle(root).fontSize);
    };
    const size = new ResizeObserver(entries => {
      const entry = entries.find(entry => entry.target === source);
      if (entry) contentInline = entry.contentBoxSize[0]?.inlineSize ?? entry.contentRect.width;
      measure();
    });
    size.observe(source); if (source !== root) size.observe(root);
    const text = new MutationObserver(measure);
    text.observe(root, { attributes: true, attributeFilter: ["style", "class"] });
    if (source !== root) text.observe(source.parentElement ?? source, { attributes: true, attributeFilter: ['style', 'class', 'data-state', 'data-presentation'] });
    window.addEventListener("resize", measure); viewport?.addEventListener("resize", measure);
    measure();
    return () => {
      size.disconnect(); text.disconnect();
      window.removeEventListener("resize", measure); viewport?.removeEventListener("resize", measure);
    };
  });
  return {
    get availableInline() { return availableInline; }, get availableBlock() { return availableBlock; }, get textSize() { return textSize; },
    get bounds() { return { left: hostLeft, top: hostTop, right: hostRight, bottom: hostBottom }; },
    canDock(owner: symbol) { return Boolean(inherited?.layout && (!inherited.owner || inherited.owner === owner)); },
    reserve(owner: symbol, inline: number) {
      if (!inherited?.layout || (inherited.owner && inherited.owner !== owner)) return;
      inherited.owner = inline ? owner : null; inherited.layout.reserve(inline);
    },
  };
}
