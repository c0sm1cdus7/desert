// The evidence fixture page (slice 3 package): a specimen that fills its container (a wallpaper, a main or navigation
// surface) gets its section as a stage, so nothing it draws is clipped or spills over the specimens around it; and the
// framed message surface reads its heading and copy on one axis.
// Run: node --test --test-timeout=900000 tests/tools/catalog-evidence-stage.test.ts   (not part of npm test: it builds and serves)
import assert from "node:assert/strict";
import { resolve } from "node:path";
import test from "node:test";
import { chromium } from "playwright";
import { evidenceRoute, fillStage } from "./catalog-evidence/fixture-pages.ts";
import { readEvidencePieces } from "./catalog-evidence/pieces.ts";
import { serveEvidence } from "./catalog-evidence/serve.ts";

const root = resolve(import.meta.dirname, "../..");

test("filling specimens get a stage; every specimen draws inside its own section; a message frame reads on one axis", { timeout: 900_000 }, async () => {
  const { pieces } = await readEvidencePieces(root, ["surface", "wallpaper"]);
  const server = await serveEvidence(pieces);
  try {
    const browser = await chromium.launch({ headless: true });
    try {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
      for (const piece of pieces) {
        await page.goto(new URL(evidenceRoute(piece.id), server.origin).href);
        await page.locator(`[data-evidence-piece="${piece.id}"] [data-evidence-specimen]`).first().waitFor();
        await page.evaluate(async () => { for (let frame = 0; frame < 3; frame++) await new Promise(requestAnimationFrame); });
        const sections = await page.locator("[data-evidence-specimen]").evaluateAll(nodes => nodes.map(section => {
          // What an ancestor inside the section clips (a scroll owner, a wallpaper's lines) is judged by that ancestor.
          const clipped = (node: Element) => {
            for (let up = node.parentElement; up && up !== section; up = up.parentElement) if (getComputedStyle(up).overflow !== "visible") return true;
            return false;
          };
          const box = section.getBoundingClientRect(), spill = [...section.querySelectorAll("*")].filter(node => {
            const drawn = node.getBoundingClientRect();
            return !clipped(node) && drawn.width > 0 && drawn.height > 0 && getComputedStyle(node).visibility !== "hidden"
              && (drawn.top < box.top - .5 || drawn.bottom > box.bottom + .5 || drawn.left < box.left - .5 || drawn.right > box.right + .5);
          }).map(node => { const drawn = node.getBoundingClientRect();
            return `${node.tagName.toLowerCase()}:${(node.textContent ?? "").trim().slice(0, 20)} [${[drawn.left, drawn.top, drawn.right, drawn.bottom].map(Math.round)}]`
              + ` outside [${[box.left, box.top, box.right, box.bottom].map(Math.round)}]`; });
          return { stage: section.getAttribute("data-evidence-stage"), height: Math.round(box.height), spill };
        }));
        const keys = piece.specimens?.list.map(specimen => specimen.key) ?? [];
        const staged = sections.flatMap((section, index) => section.stage === "fill" ? [keys[index]] : []);
        const expected = piece.id === "surface" ? ["default|kind=main", "searching|kind=main"]
          : ["default|wallpaper=silk", "default|wallpaper=mist", "default|wallpaper=plain"];
        assert.deepEqual(staged, expected, `${piece.id}: exactly the filling specimens are staged`);
        for (const section of sections) if (section.stage === "fill") assert.equal(section.height, fillStage);
        sections.forEach((section, index) => assert.deepEqual(section.spill, [], `${piece.id} ${keys[index]}: drawn inside its section`));
      }
      await page.goto(new URL(evidenceRoute("surface"), server.origin).href);
      const frame = await page.locator("[data-surface-frame] p").evaluateAll(nodes => nodes.map(node => Math.round(node.getBoundingClientRect().left)));
      assert.equal(frame.length, 2);
      assert.equal(frame[0], frame[1], "the message's heading and copy start on the frame's reading guide");
    } finally { await browser.close(); }
  } finally { await server.close(); }
});
