// Bar part (from the toolbar-layout composition): fits the trailing commands of a top rail into the room its identity
// leaves, overflowing the rest, and stacks the identity above the commands when the rail is too narrow for both.
import type { ToolbarAction } from "../../../../interaction/toolbar.ts";
import { toolbarVisibleCount } from "../../../infra/toolbar-capacity.ts";

export function useToolbarCommands<T extends ToolbarAction>(trailing: () => readonly T[], elements: () => {
  row: HTMLDivElement | null; leading: HTMLDivElement | null; utilities: HTMLDivElement | null; controls: HTMLDivElement | null;
}, reservedSearch: () => boolean = () => false) {
  let visibleCount = $state(0), open = $state(false), stacked = $state(false);
  let overflow = $derived(trailing().slice(visibleCount));
  function change(next: boolean) { open = next; }
  $effect(() => {
    trailing().length; reservedSearch();
    const { row: container, leading: navigationRail, utilities: rail, controls: controlRail } = elements();
    if (!container) return;
    const measure = () => {
      const navigation = navigationRail?.getBoundingClientRect().width ?? 0;
      const slot = parseFloat(getComputedStyle(container.closest('[data-piece="toolbar"]') ?? container).getPropertyValue('--catalog-toolbar-height')) || rail?.firstElementChild?.getBoundingClientRect().width || 44;
      const gap = parseFloat(getComputedStyle(container).columnGap) || 0;
      const railGap = rail ? parseFloat(getComputedStyle(rail).columnGap) || 0 : 0;
      const heading = container.querySelector<HTMLElement>('[data-toolbar-heading]');
      const titleSize = parseFloat(getComputedStyle(heading ?? container).fontSize) || 16;
      const controls = controlRail?.getBoundingClientRect().width ?? 0;
      const reserved = reservedSearch() ? slot + gap : 0;
      const remaining = container.clientWidth - navigation - controls - reserved - gap * (navigation ? 2 : 1);
      stacked = Boolean(heading && remaining < slot + titleSize * 4);
      const identityBudget = heading && !stacked ? Math.min(titleSize * 8, Math.max(titleSize * 4, remaining / 3)) : 0;
      visibleCount = toolbarVisibleCount(trailing().length, slot, railGap, Math.max(slot, remaining - identityBudget));
    };
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    if (rail) observer.observe(rail);
    if (navigationRail) observer.observe(navigationRail);
    if (controlRail) observer.observe(controlRail);
    measure(); document.fonts.addEventListener("loadingdone", measure);
    return () => { observer.disconnect(); document.fonts.removeEventListener("loadingdone", measure); };
  });
  return { change, get open() { return open; }, get stacked() { return stacked; },
    get visibleCount() { return visibleCount; }, get overflow() { return overflow; } };
}
