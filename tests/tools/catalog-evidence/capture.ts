// Playwright captures of the served evidence build: every specimen of a piece from its fixture page, and every Visual
// Catalog destination that shows a piece, opened through the product's own navigation. Each capture is taken at the four
// combinations of sheet.ts after the motion settles; nothing is injected into the page.
import type { Browser, BrowserContext, Page } from "playwright";
import { openCatalog } from "../../web/inspection-fixture.ts";
import { evidenceRoute } from "./fixture-pages.ts";
import { combinationName, combinations, type Combination } from "./sheet.ts";
import type { CatalogDestination, EvidencePiece } from "./pieces.ts";

const heights = { 390: 844, 1280: 900 } as const;
export type Captured = Readonly<{ captures: ReadonlyMap<string, Buffer> }> | Readonly<{ error: string }>;

async function context(browser: Browser, deviceScaleFactor: number): Promise<BrowserContext> {
  return browser.newContext({ viewport: { width: 1280, height: heights[1280] }, deviceScaleFactor, colorScheme: "light",
    reducedMotion: "reduce", locale: "en-US", timezoneId: "America/Argentina/Buenos_Aires" });
}
function watch(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  return errors;
}
/** Requests of the page that the build could not answer (an asset a specimen names but the build does not hold). */
function watchRequests(page: Page): Set<string> {
  const failed = new Set<string>();
  page.on("response", response => { if (response.status() >= 400) failed.add(`${response.status()} ${new URL(response.url()).pathname}`); });
  page.on("requestfailed", request => failed.add(`failed ${new URL(request.url()).pathname}`));
  return failed;
}
export type SpecimenCaptures = Readonly<{ results: ReadonlyMap<number, Captured>; unanswered: readonly string[] }>;
async function apply(page: Page, combination: Combination) {
  await page.setViewportSize({ width: combination.width, height: heights[combination.width] });
  await page.emulateMedia({ colorScheme: combination.theme, reducedMotion: "reduce" });
}
async function settle(page: Page) {
  await page.mouse.move(1, 1);
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(document.getAnimations().filter(animation => animation.effect?.getComputedTiming().iterations !== Infinity)
      .map(animation => animation.finished.catch(() => undefined)));
    for (let frame = 0; frame < 6; frame++) await new Promise(requestAnimationFrame);
  });
}

/** Every specimen of one piece, by specimen index: its four captures, or the error its boundary caught. */
export async function captureSpecimens(browser: Browser, origin: string, piece: EvidencePiece): Promise<SpecimenCaptures> {
  const list = piece.specimens?.list ?? [];
  const found = new Map<number, Map<string, Buffer>>(), failed = new Map<number, string>();
  const scope = await context(browser, 2);
  try {
    const page = await scope.newPage(), errors = watch(page), unanswered = watchRequests(page);
    for (const combination of combinations) {
      await apply(page, combination);
      await page.goto(new URL(evidenceRoute(piece.id), origin).href);
      await page.locator(`[data-evidence-piece="${piece.id}"]`).waitFor();
      await settle(page);
      for (const specimen of list) {
        const section = page.locator(`[data-evidence-specimen="${specimen.index}"]`);
        const failure = section.locator("[data-evidence-failed]");
        if (await failure.count()) { failed.set(specimen.index, (await failure.first().textContent()) ?? "the specimen threw"); continue; }
        const captures = found.get(specimen.index) ?? new Map<string, Buffer>();
        captures.set(combinationName(combination), await section.screenshot({ animations: "disabled", caret: "hide" }));
        found.set(specimen.index, captures);
      }
    }
    const pageErrors = [...new Set(errors)];
    const results = new Map(list.map((specimen): [number, Captured] => {
      const error = failed.get(specimen.index);
      if (error !== undefined) return [specimen.index, { error }];
      const captures = found.get(specimen.index);
      if (!captures || captures.size !== combinations.length) return [specimen.index, { error: pageErrors.join("; ") || "missing captures" }];
      return [specimen.index, { captures }];
    }));
    return { results, unanswered: [...unanswered].sort() };
  } finally { await scope.close(); }
}

/** The scrolling ancestor of the catalog grows the viewport until the whole destination is visible (capped). */
async function revealWhole(page: Page, combination: Combination) {
  const overflow = await page.locator("[data-view-item='public-catalog-bank']").first().evaluate(element => {
    let extra = Math.max(0, document.documentElement.scrollHeight - innerHeight);
    for (let node = element.parentElement; node; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (/(auto|scroll)/.test(style.overflowY)) extra = Math.max(extra, node.scrollHeight - node.clientHeight);
    }
    return extra;
  });
  await page.setViewportSize({ width: combination.width, height: Math.min(heights[combination.width] + overflow, 8000) });
  await settle(page);
}
async function open(page: Page, destination: CatalogDestination) {
  for (const step of [...destination.path, destination.id]) {
    await page.locator(`[data-view-item="public-catalog-bank"] [data-focus-key="${step}"]`).filter({ visible: true }).first().click();
    await settle(page);
  }
}
async function home(page: Page, launched: boolean, launchUrl: string, origin: string) {
  await page.goto(launched ? origin : launchUrl);
  await page.getByRole("button", { name: "Create note", exact: true }).first().waitFor();
  await openCatalog(page);
}

/** Every Visual Catalog destination, by id: its four captures, or why it could not be opened. */
export async function captureCatalog(browser: Browser, launchUrl: string, origin: string,
  destinations: readonly CatalogDestination[]): Promise<ReadonlyMap<string, Captured>> {
  const found = new Map<string, Map<string, Buffer>>(), failed = new Map<string, string>();
  const scope = await context(browser, 1);
  try {
    const page = await scope.newPage();
    let launched = false;
    for (const combination of combinations) for (const destination of destinations) {
      if (failed.has(destination.id)) continue;
      try {
        await apply(page, combination);
        await home(page, launched, launchUrl, origin);
        launched = true;
        await open(page, destination);
        await revealWhole(page, combination);
        const captures = found.get(destination.id) ?? new Map<string, Buffer>();
        captures.set(combinationName(combination), await page.screenshot({ animations: "disabled", caret: "hide" }));
        found.set(destination.id, captures);
      } catch (error) { failed.set(destination.id, error instanceof Error ? error.message.split("\n")[0] ?? "" : String(error)); }
    }
  } finally { await scope.close(); }
  return new Map(destinations.map((destination): [string, Captured] => {
    const error = failed.get(destination.id), captures = found.get(destination.id);
    return [destination.id, error !== undefined || !captures ? { error: error ?? "not captured" } : { captures }];
  }));
}
