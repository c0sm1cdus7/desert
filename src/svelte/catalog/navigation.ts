import { InteractionCatalog, type PrimitiveId } from "../../interaction/catalog.ts";

export type CatalogEntry = typeof InteractionCatalog.entries[number];
export type CatalogFamily = typeof InteractionCatalog.groups[number]["id"];

// Navigation is a view of the canonical bank, not a separately maintained inventory.
export const catalogGroups = InteractionCatalog.groups.map(group => ({
  ...group, family: group.id, anchor: `catalog-${group.id}`,
  entries: InteractionCatalog.entries.filter(entry => entry.inspection.group === group.id),
}));

export function catalogTitle(id: PrimitiveId): string {
  const words = id.startsWith("input.") ? `${id.slice(6)} input` : id.replace(/^control\./, "");
  return words.charAt(0).toUpperCase() + words.slice(1).replaceAll(".", " ");
}

export function matchingEntries(query: string): readonly CatalogEntry[] {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return InteractionCatalog.entries.filter(entry => {
    const searchable = [entry.id, catalogTitle(entry.id), catalogGroups.find(group => group.id === entry.inspection.group)!.title,
      ...entry.states, ...entry.inspection.owners.flatMap(owner => {
        const foundation = InteractionCatalog.foundations.find(item => item.id === owner)!;
        return [foundation.title, foundation.rule];
      })].join(" ").toLowerCase();
    return terms.every(term => searchable.includes(term));
  });
}

function revealCatalogAnchor(target: HTMLElement) {
  // Returning to the content identity reveals the beginning of its own viewport.
  const header = target.closest('[data-place-header]');
  if (header) {
    header.closest('[data-scroll-owner]')?.querySelector<HTMLElement>('.place-viewport')?.scrollTo({ top: 0 });
    return;
  }
  // scrollIntoView scrolls every ancestor, including the outer document. A
  // nested workspace owns its scrolling; its floating chrome must stay put.
  for (let owner = target.parentElement; owner && owner !== document.scrollingElement; owner = owner.parentElement) {
    const style = getComputedStyle(owner);
    if (!/^(auto|scroll)$/.test(style.overflowY)) continue;
    // scroll-padding may remain a calc() in CSSOM. Measure the actual overlaid
    // chrome instead of treating an unparseable computed value as zero.
    const bounds = owner.getBoundingClientRect();
    const surface = owner.closest('[data-scroll-owner]');
    const chrome = [...(surface?.querySelectorAll<HTMLElement>('[data-toolbar="top"]') ?? [])]
      .filter(bar => bar.checkVisibility())
      .reduce((bottom, bar) => Math.max(bottom, bar.getBoundingClientRect().bottom - bounds.top), 0);
    const padding = Math.max(parseFloat(style.scrollPaddingTop) || 0, chrome + 16);
    const margin = parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
    owner.scrollTo({ top: owner.scrollTop + target.getBoundingClientRect().top
      - owner.getBoundingClientRect().top - owner.clientTop - padding - margin });
    return;
  }
  target.scrollIntoView({ block: "start" });
}

export function navigateCatalog(event: MouseEvent, id: string, focusId = id) {
  // Keep navigation local to the catalog rather than changing the product route.
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const target = document.getElementById(id);
  const focusTarget = document.getElementById(focusId);
  if (!target || !focusTarget) return;
  event.preventDefault();
  // A scroll anchor may contain many controls; focus its intended destination,
  // not the entire region. Group headings remain concise keyboard jump targets.
  focusTarget.focus({ preventScroll: true });
  revealCatalogAnchor(target);
}
