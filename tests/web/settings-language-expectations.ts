import { mkdir, writeFile } from "node:fs/promises";
import { basename } from "node:path";
import type { Locator, Page } from "playwright";

// Owner's Apple Settings references, recorded before this increment. These
// measure hierarchy/interaction, not native pixel parity or HIG certification.
export const settingsExpectations = Object.freeze({
  desktop: { width: 1280, height: 900, minimumBody: 13 },
  compact: { widths: [390, 320], height: 844, minimumTarget: 44, minimumBody: 16 },
  group: "Sibling specimens share one surface; each state is not a separate outlined card.",
  materials: "Content is opaque and quiet. Glass belongs to navigation, tools and search.",
  wells: "Keep the enclosed caption/value field and whole-well interaction.",
  search: "Scoped search expands within the bottom compact toolbar, suppressing competing actions.",
});

export async function settingsEvidence(page: Page, name: string, values: unknown, subject?: Locator) {
  const revision = basename(process.env.DESERT_CATALOG_BUILD ?? "unknown-build");
  const directory = new URL(`../../artifacts/settings-language/${revision}/`, import.meta.url);
  await mkdir(directory, { recursive: true });
  await writeFile(new URL(`${name}.json`, directory), JSON.stringify({ expectations: settingsExpectations, values }, null, 2) + "\n");
  const path = new URL(`${name}.png`, directory).pathname;
  if (subject) await subject.screenshot({ path, animations: "disabled" });
  else await page.screenshot({ path, animations: "disabled" });
}

export async function settingsGroupPaint(group: Locator) {
  return group.evaluate(element => {
    const paint = (node: Element) => {
      const s = getComputedStyle(node), r = node.getBoundingClientRect();
      return { background: s.backgroundColor, radius: parseFloat(s.borderTopLeftRadius),
        border: [s.borderTopWidth, s.borderRightWidth, s.borderBottomWidth, s.borderLeftWidth].map(parseFloat),
        shadow: s.boxShadow, backdrop: s.backdropFilter, width: r.width, height: r.height };
    };
    const specimens = [...element.querySelectorAll("[data-view-item^='specimen:']")];
    const parent = specimens[0]?.parentElement;
    // A Card may wrap its rows in Card.Content. Observe the shared material,
    // not which one of those documented composition elements owns the fill.
    let shared = parent;
    while (shared && shared !== element && (paint(shared).background === "rgba(0, 0, 0, 0)" || paint(shared).radius <= 0))
      shared = shared.parentElement;
    return { shared: shared && shared !== element ? paint(shared) : null,
      sameParent: specimens.every(node => node.parentElement === parent),
      states: specimens.map(node => ({ id: node.getAttribute("data-view-item")?.slice("specimen:".length) ?? null, ...paint(node) })),
      blurredContent: [...element.querySelectorAll("*")].filter(node => {
        const s = getComputedStyle(node), r = node.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && s.backdropFilter !== "none";
      }).map(node => node.getAttribute("data-slot") ?? node.tagName),
    };
  });
}
