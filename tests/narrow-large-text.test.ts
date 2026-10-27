// Every specimen of every piece and every Visual Catalog page, on the narrowest phone at its largest text (320px, 200%):
// no word breaks across two lines without its hyphen, nothing scrolls sideways, and an Action that shows its label draws all
// of it (it wraps and grows, never ends in «…»; a bottom pair's halves keep one width, height and top). The pieces are rendered by their own
// owners in the test-only evidence build (the build the owner's approval photographs come from), and the catalog pages are
// opened through the product's own navigation.
import assert from "node:assert/strict";
import { resolve } from "node:path";
import test from "node:test";
import { chromium, type Page } from "playwright";
import { evidenceRoute } from "./tools/catalog-evidence/fixture-pages.ts";
import { openDestination, openHome } from "./tools/catalog-evidence/capture.ts";
import { readEvidencePieces } from "./tools/catalog-evidence/pieces.ts";
import { serveEvidence } from "./tools/catalog-evidence/serve.ts";
import { clippedActions } from "./support/action-labels.ts";
import { brokenWords, largeText, narrowWidth, sidewaysScroll, sizeText } from "./support/word-breaks.ts";

const root = resolve(import.meta.dirname, "..");
/** Pieces whose specimens cannot load in a browser, each with where its pixels are checked instead. Any other piece whose
 * specimens do not render fails the test. */
const checkedElsewhere: Readonly<Record<string, string>> = {
  "view-workspace": "its specimens import a node-only test fixture; it is the workspace every Visual Catalog page below is drawn in",
};

async function defects(page: Page, selector: string, label: string) {
  const words = await page.evaluate(brokenWords, [selector, label] as const);
  const sideways = await page.evaluate(sidewaysScroll, [selector, label] as const);
  const actions = await page.evaluate(clippedActions, [selector, label] as const);
  return [...words.map(word => `word broken without its hyphen: ${word}`), ...sideways.map(item => `sideways scroll: ${item}`),
    ...actions.map(item => `action label not drawn whole: ${item}`)];
}

test(`every specimen and Visual Catalog page at ${narrowWidth}px and ${largeText} text breaks words only at a hyphen, never scrolls sideways and draws every Action label whole`,
  { timeout: 3_600_000 }, async () => {
    const { pieces } = await readEvidencePieces(root, "all");
    const server = await serveEvidence(pieces);
    const found: string[] = [], unrendered: string[] = [];
    try {
      const browser = await chromium.launch({ headless: true, args: ["--disable-lcd-text"] });
      try {
        const context = await browser.newContext({ viewport: { width: narrowWidth, height: 800 }, colorScheme: "light",
          reducedMotion: "reduce", locale: "en-US", timezoneId: "America/Argentina/Buenos_Aires" });
        await context.addInitScript(() => { localStorage.clear(); sessionStorage.clear(); });
        const page = await context.newPage();
        page.setDefaultTimeout(15_000);
        for (const piece of pieces) {
          const list = piece.specimens?.list ?? [];
          if (!list.length) continue;
          if (!server.pages.includes(piece.id)) {
            if (!Object.hasOwn(checkedElsewhere, piece.id)) unrendered.push(`${piece.id}: ${server.excluded.get(piece.id) ?? "no fixture page"}`);
            continue;
          }
          await page.goto(new URL(evidenceRoute(piece.id), server.origin).href);
          await page.locator(`[data-evidence-piece="${piece.id}"]`).waitFor();
          await sizeText(page, largeText);
          for (const specimen of list) {
            const failure = page.locator(`[data-evidence-specimen="${specimen.index}"] [data-evidence-failed]`);
            if (await failure.count()) unrendered.push(`${piece.id} ${specimen.key}: ${await failure.first().textContent()}`);
          }
          const keys = new Map(list.map(specimen => [String(specimen.index), specimen.key]));
          for (const item of await defects(page, "[data-evidence-specimen]", "data-evidence-specimen"))
            found.push(`${piece.id} ${item.replace(/^(.*?: )(\d+)(?=: )/, (_, kind: string, index: string) => `${kind}${keys.get(index) ?? index}`)}`);
        }
        const destinations = [...new Map(pieces.flatMap(piece => piece.destinations).map(item => [item.id, item])).values()];
        await openHome(page, false, server.launchUrl, server.origin);
        await sizeText(page, largeText);
        for (const item of await defects(page, "body", "data-none")) found.push(`catalog home ${item}`);
        for (const destination of destinations) {
          await openHome(page, true, server.launchUrl, server.origin);
          await openDestination(page, destination);
          await sizeText(page, largeText);
          for (const item of await defects(page, "body", "data-none")) found.push(`catalog page ${destination.id} ${item}`);
        }
      } finally { await browser.close(); }
    } finally { await server.close(); }
    console.log([`${found.length} defects, ${unrendered.length} specimens not rendered`, ...found, ...unrendered.map(item => `not rendered: ${item}`)].join("\n"));
    assert.deepEqual(unrendered, [], "every specimen renders");
    assert.deepEqual(found, []);
  });
