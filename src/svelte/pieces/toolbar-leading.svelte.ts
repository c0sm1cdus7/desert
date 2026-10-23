/** Geometry follows rendered leading controls, including reactive visibility and wrapping. */
export function useToolbarLeading(element: () => HTMLElement | null) {
  let occupied = $state(false);
  $effect(() => {
    const owner = element();
    if (!owner) { occupied = false; return; }
    const measure = () => {
      occupied = [...owner.querySelectorAll<HTMLElement>("button,a[href],input,select,textarea")]
        .some(control => control.checkVisibility({ visibilityProperty: true }) && control.getBoundingClientRect().width > 0);
    };
    const resize = new ResizeObserver(measure);
    const refresh = () => { resize.disconnect(); resize.observe(owner); for (const child of owner.querySelectorAll("*")) resize.observe(child); measure(); };
    const mutations = new MutationObserver(refresh);
    mutations.observe(owner, { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden", "style", "class"] });
    refresh();
    return () => { resize.disconnect(); mutations.disconnect(); };
  });
  return { get occupied() { return occupied; } };
}
