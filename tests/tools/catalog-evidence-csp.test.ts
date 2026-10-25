// The renderer's CSP allows no inline style attribute (plan §3.4 rule T: no `style-src-attr 'unsafe-inline'` from slice 4).
// On the evidence build, which ships the release host's config.mjs, the Notebook home, an open transient panel, every
// Visual Catalog destination of every piece and every piece's fixture page (all its specimens) apply no inline style the
// policy refuses: the browser reports no securitypolicyviolation and logs no Content Security Policy error.
// Run: node --test --test-timeout=1800000 tests/tools/catalog-evidence-csp.test.ts   (not part of npm test: it builds and serves)
import assert from "node:assert/strict";
import { resolve } from "node:path";
import test from "node:test";
import { chromium, type Page } from "playwright";
import { openDestination, openHome } from "./catalog-evidence/capture.ts";
import { evidenceRoute } from "./catalog-evidence/fixture-pages.ts";
import { readEvidencePieces } from "./catalog-evidence/pieces.ts";
import { serveEvidence } from "./catalog-evidence/serve.ts";

const root = resolve(import.meta.dirname, "../..");

/** Every refusal the page reports, from the document's own securitypolicyviolation events and from the console. */
async function watchPolicy(page: Page, refused: string[]) {
  await page.addInitScript(() => {
    document.addEventListener("securitypolicyviolation", event => {
      console.error(`Content Security Policy: ${event.violatedDirective} refused ${event.blockedURI || "inline"} at ${event.sourceFile}:${event.lineNumber} (${event.sample})`);
    });
  });
  page.on("console", message => { if (message.type() === "error" && /Content Security Policy/.test(message.text())) refused.push(`${page.url()} ${message.text()}`); });
}

test("the evidence build applies no inline style its CSP refuses, on the home, a panel, the Visual Catalog and every specimen",
  { timeout: 1_800_000 }, async () => {
    const { pieces } = await readEvidencePieces(root, "all");
    const server = await serveEvidence(pieces);
    try {
      const browser = await chromium.launch({ headless: true });
      try {
        const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce" })).newPage();
        const refused: string[] = [];
        await watchPolicy(page, refused);
        await openHome(page, false, server.launchUrl, server.origin);
        const destinations = [...new Map(pieces.flatMap(piece => piece.destinations).map(item => [item.id, item])).values()];
        for (const destination of destinations) {
          await openHome(page, true, server.launchUrl, server.origin);
          await openDestination(page, destination);
        }
        await page.goto(server.origin);
        await page.getByRole("button", { name: "Create note", exact: true }).first().click();
        await page.locator("[data-modal]").first().waitFor();
        await page.keyboard.press("Escape");
        for (const id of server.pages) {
          await page.goto(new URL(evidenceRoute(id), server.origin).href);
          await page.locator(`[data-evidence-piece="${id}"]`).waitFor();
        }
        assert.ok(destinations.length > 0 && server.pages.length > 0,
          `the walk visited ${destinations.length} destinations and ${server.pages.length} fixture pages; excluded: ${[...server.excluded].map(([id, why]) => `${id} (${why})`).join("; ")}`);
        assert.deepEqual([...new Set(refused)], []);
      } finally { await browser.close(); }
    } finally { await server.close(); }
  });
