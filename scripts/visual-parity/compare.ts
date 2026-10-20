import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { chromium } from "playwright";
import sharp from "sharp";
import { fingerprint, hash, openBank, selectState, metrics, sizes, themes, states } from "./capture.ts";

const baseline = process.env.DESERT_PARITY_BASELINE ?? "http://127.0.0.1:4292/";
const candidate = process.env.DESERT_PARITY_CANDIDATE;
const output = process.env.DESERT_PARITY_OUTPUT;
if (!candidate || !output) throw new Error("DESERT_PARITY_CANDIDATE_AND_OUTPUT_REQUIRED");
const directory = resolve(output);
// Never replace an earlier evidence run. The caller selects a new directory.
await mkdir(directory, { recursive: false });
const builds = { baseline: await fingerprint(baseline), candidate: await fingerprint(candidate) };
const browser = await chromium.launch({ headless: true });
const report: { case: string; changedPixels?: number; totalPixels?: number; error?: string; evidence?: unknown }[] = [];
try {
  for (const size of sizes) for (const theme of themes) for (const state of states) {
    const name = `${size.width}x${size.height}-${theme}-${state}`;
    const captures: { png: Buffer; metrics: unknown; sha256: string }[] = [];
    try {
      for (const [label, origin] of [["baseline", baseline], ["candidate", candidate]] as const) {
        const fixture = await openBank(browser, origin, size, theme);
        try {
          await selectState(fixture.page, state);
          // Only the text caret is hidden. No CSS injection, masks or image tolerance.
          const png = await fixture.page.screenshot({ path: join(directory, `${name}-${label}.png`), caret: "hide" });
          assert.deepEqual(fixture.errors, [], `${label}: browser exceptions`);
          assert.deepEqual(fixture.writes, [], `${label}: public bank sent a write request`);
          captures.push({ png, metrics: await metrics(fixture.page), sha256: hash(png) });
        } finally { await fixture.close(); }
      }
      const [left, right] = await Promise.all(captures.map(async capture => sharp(capture.png).ensureAlpha().raw().toBuffer({ resolveWithObject: true })));
      assert.deepEqual(left!.info, right!.info, "Raster sizes/channels differ");
      let changedPixels = 0;
      for (let pixel = 0; pixel < left!.data.length; pixel += 4) {
        if (left!.data[pixel] !== right!.data[pixel] || left!.data[pixel + 1] !== right!.data[pixel + 1] ||
          left!.data[pixel + 2] !== right!.data[pixel + 2] || left!.data[pixel + 3] !== right!.data[pixel + 3]) changedPixels++;
      }
      report.push({ case: name, changedPixels, totalPixels: left!.info.width * left!.info.height,
        evidence: captures.map(({ png: _, ...capture }) => capture) });
      console.log(`${name}: ${changedPixels} changed pixels`);
    } catch (error) {
      report.push({ case: name, error: error instanceof Error ? error.message : String(error) });
      console.log(`${name}: FAILED ${error instanceof Error ? error.message : String(error)}`);
    }
    await writeFile(join(directory, "report.json"), JSON.stringify({ version: 1, startedBuilds: builds,
      browser: browser.version(), rasterPolicy: "Exact RGBA; no masks/tolerance; caret hidden; finite motion settled", report }, null, 2));
  }
  assert.equal(report.length, 20, "Incomplete state matrix");
  assert.ok(report.every(item => item.error === undefined && item.changedPixels === 0), "VISUAL_PARITY_FAILED: inspect report.json");
} finally { await browser.close(); }
