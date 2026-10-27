// Pixel parity of the component bank between a baseline tree and this tree, for the piece migration (slices 2–4).
// Each tree renders the bank with its own sources, its own compiler fixture and its own theme CSS, in a real browser.
// Every catalog entry is captured at 390×844 and 1280×900, light and dark, and compared as exact RGBA: no masks,
// no tolerance, no injected CSS. Run it explicitly (it is not part of npm test):
//   DESERT_PARITY_BASELINE_TREE=<worktree of the baseline commit> node --test tests/tools/bank-parity.test.ts
// Optional: DESERT_PARITY_OUTPUT=<new directory> keeps the PNGs and report.json of a run.
import assert from "node:assert/strict";
import test from "node:test";
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import sharp from "sharp";

const here = resolve(import.meta.dirname, "../..");
const baselineTree = process.env.DESERT_PARITY_BASELINE_TREE;
const output = process.env.DESERT_PARITY_OUTPUT;
const sizes = [{ width: 390, height: 844 }, { width: 1280, height: 900 }] as const;
const themes = ["light", "dark"] as const;
const scene = `<script lang="ts">
  import { PublicCatalogBank } from "@desert/svelte/catalog/index.ts";
  import { inspectionCatalog } from "@desert/svelte/catalog/compositions/inspection/inspection-fixture.ts";
  let mounted = $state(false);
</script><button onclick={() => mounted = true}>Mount fixture</button>
<main data-renderer-profile="apple-reference" style="padding:16px">{#if mounted}<PublicCatalogBank surface={inspectionCatalog} oncatalog={() => {}} />{/if}</main>`;

// A baseline tree marks the bank, its index and its rows with composition marks; this tree with the view regions and the
// row keys that replaced them (lane G). Each selector finds either.
const bankSelector = ':is([data-public-catalog-bank], [data-view-item="public-catalog-bank"])';
const indexSelector = ':is([data-catalog-index], [data-view-item="catalog-index"])';

type Browser = Readonly<{ page: import("playwright").Page; errors: string[]; close: () => Promise<void> }>;
async function bankIn(tree: string, size: typeof sizes[number], theme: typeof themes[number]): Promise<Browser> {
  const { svelteBrowser } = await import(pathToFileURL(join(tree, "tests/fixtures/svelte-browser.ts")).href);
  const { rendererCss } = await import(pathToFileURL(join(tree, "tests/fixtures/renderer-css.ts")).href);
  const fixture: Browser = await svelteBrowser(scene);
  await fixture.page.setViewportSize(size);
  await fixture.page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
  await fixture.page.addStyleTag({ content: await rendererCss() });
  // Seeds (avatar shuffles) come from crypto.getRandomValues: the same deterministic bytes in both trees.
  await fixture.page.evaluate(() => {
    let state = 1;
    crypto.getRandomValues = <T extends ArrayBufferView | null>(array: T): T => {
      if (!array) return array;
      const view = new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
      for (let index = 0; index < view.length; index++) { state = (state * 1103515245 + 12345) % 2147483648; view[index] = state % 256; }
      return array;
    };
  });
  await fixture.page.getByRole("button", { name: "Mount fixture", exact: true }).click();
  await fixture.page.locator(bankSelector).waitFor();
  await fixture.page.evaluate(async () => { await document.fonts.ready; for (let i = 0; i < 6; i++) await new Promise(requestAnimationFrame); });
  return fixture;
}

const destinations = (page: import("playwright").Page) => page.locator(`${indexSelector} :is([data-destination], [data-focus-key])`)
  .evaluateAll(nodes => nodes.map(node => node.getAttribute("data-destination") ?? node.getAttribute("data-focus-key") ?? ""));

/** The whole page after the motion settles: the index, or one destination's entry or shared-owner specimen. */
async function capture(fixture: Browser) {
  await fixture.page.evaluate(async () => {
    await Promise.all(document.getAnimations().filter(animation => animation.effect?.getComputedTiming().iterations !== Infinity)
      .map(animation => animation.finished.catch(() => {})));
    for (let i = 0; i < 6; i++) await new Promise(requestAnimationFrame);
  });
  await fixture.page.mouse.move(1, 1);
  return fixture.page.screenshot({ fullPage: true, caret: "hide", animations: "disabled" });
}
async function open(fixture: Browser, id: string) {
  await fixture.page.locator(`${indexSelector} :is([data-destination="${id}"], [data-focus-key="${id}"])`).first().click();
}
async function back(fixture: Browser) {
  const button = fixture.page.getByRole("button", { name: "Back", exact: true }).filter({ visible: true }).first();
  if (await button.count()) await button.click();
  await fixture.page.locator(indexSelector).filter({ visible: true }).first().waitFor();
}

async function rgba(png: Buffer) { return sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true }); }
async function changedPixels(left: Buffer, right: Buffer) {
  const [a, b] = await Promise.all([rgba(left), rgba(right)]);
  if (a.info.width !== b.info.width || a.info.height !== b.info.height) return { size: `${a.info.width}x${a.info.height} vs ${b.info.width}x${b.info.height}`, changed: -1 };
  let changed = 0;
  for (let index = 0; index < a.data.length; index += 4) {
    if (a.data[index] !== b.data[index] || a.data[index + 1] !== b.data[index + 1] || a.data[index + 2] !== b.data[index + 2] || a.data[index + 3] !== b.data[index + 3]) changed++;
  }
  return { size: `${a.info.width}x${a.info.height}`, changed };
}

test("every bank entry is pixel-identical to the baseline tree", { skip: !baselineTree && "set DESERT_PARITY_BASELINE_TREE", timeout: 1_800_000 }, async () => {
  if (!baselineTree) return;
  if (output) await mkdir(resolve(output), { recursive: false });
  const report: { case: string; entry: string; size: string; changed: number }[] = [];
  for (const size of sizes) for (const theme of themes) {
    const before: Browser = await bankIn(resolve(baselineTree), size, theme), after: Browser = await bankIn(here, size, theme);
    try {
      const ids = await destinations(before.page);
      assert.deepEqual(await destinations(after.page), ids, "the bank lists the same destinations");
      const name = `${size.width}x${size.height}-${theme}`;
      for (const id of ["index", ...ids]) {
        let shots: Buffer[] = [];
        for (const fixture of [before, after]) { if (id !== "index") await open(fixture, id); shots.push(await capture(fixture)); }
        let result = await changedPixels(shots[0]!, shots[1]!);
        // Image decoding can land a frame late; both trees are deterministic, so a real difference persists on retake.
        for (let retake = 0; retake < 3 && result.changed !== 0; retake++) {
          shots = [await capture(before), await capture(after)];
          result = await changedPixels(shots[0]!, shots[1]!);
        }
        report.push({ case: name, entry: id, ...result });
        if (output && result.changed !== 0) for (const [label, png] of [["before", shots[0]!], ["after", shots[1]!]] as const) {
          await writeFile(join(resolve(output), `${name}-${id.replaceAll(/[^a-z0-9.-]/gi, "_")}-${label}.png`), png);
        }
        if (id !== "index") for (const fixture of [before, after]) await back(fixture);
      }
      assert.deepEqual([...before.errors, ...after.errors], []);
    } finally { await before.close(); await after.close(); }
  }
  if (output) await writeFile(join(resolve(output), "report.json"), JSON.stringify(report, null, 2));
  const differing = report.filter(item => item.changed !== 0);
  console.log(`bank parity: ${report.length} captures, ${differing.length} differ`);
  assert.deepEqual(differing, [], "VISUAL_PARITY_FAILED");
});

/** View content through the real workspace body (ContentFlow, Information, StackLayout, ViewItem, Appearance, Identity). */
const viewScenes: Readonly<Record<string, readonly unknown[]>> = {
  "notes-overview": [
    { kind: "header", id: "header", title: "Notes", subtitle: "Your private notes." },
    { kind: "stack", id: "details", title: "Details", description: "About this note.", items: [
      { kind: "fact", label: "Owner", value: "Franco" }, { kind: "fact", label: "Words", value: "128" },
      { kind: "fact", label: "Folder", value: null }, { kind: "text", text: "A paragraph of plain reading text." },
      { kind: "destination-link", id: "trash", output: "trash", label: "Trash", icon: "archive" }] },
    { kind: "stack", id: "more", title: "More", items: [{ kind: "text", text: "Second stack, text only." }] },
  ],
  "appearance": [{ kind: "header", id: "header", title: "Appearance" }, { kind: "appearance", id: "appearance" }],
  "identity": [{ kind: "header", id: "header", title: "Identity" }, { kind: "identity", id: "identity" }],
};
async function sceneIn(tree: string, content: readonly unknown[], size: typeof sizes[number], theme: typeof themes[number]): Promise<Browser> {
  const { svelteBrowser } = await import(pathToFileURL(join(tree, "tests/fixtures/svelte-browser.ts")).href);
  const { rendererCss } = await import(pathToFileURL(join(tree, "tests/fixtures/renderer-css.ts")).href);
  const { workspaceBodySource } = await import(pathToFileURL(join(tree, "tests/fixtures/workspace-body.ts")).href);
  const fixture: Browser = await svelteBrowser(`<script lang="ts">
  import { CatalogWorkspace } from "@desert/svelte/catalog/index.ts";
  ${workspaceBodySource(content)}
  let mounted = $state(false);
</script><button onclick={() => mounted = true}>Mount fixture</button>
{#if mounted}<CatalogWorkspace navigationSurface={{ title: "Notebook", settingsPlaceholder: true }} title="Notes" identity={{ title: "Notes", subtitle: "Your writing" }}
  navigation={[{ id: "notes", label: "Notes", icon: "create" }]} active="notes" query="" searching={false} onsearch={() => {}} oncancel={() => {}}
  onquery={() => {}} onnavigate={() => {}} content={workspaceBody} />{/if}`);
  await fixture.page.setViewportSize(size);
  await fixture.page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
  await fixture.page.addStyleTag({ content: await rendererCss() });
  await fixture.page.getByRole("button", { name: "Mount fixture", exact: true }).click();
  await fixture.page.locator("[data-view-content]").first().waitFor();
  return fixture;
}

test("view scenes are pixel-identical to the baseline tree", { skip: !baselineTree && "set DESERT_PARITY_BASELINE_TREE", timeout: 1_800_000 }, async () => {
  if (!baselineTree) return;
  const report: { case: string; entry: string; size: string; changed: number }[] = [];
  for (const [scene, content] of Object.entries(viewScenes)) for (const size of sizes) for (const theme of themes) {
    const before: Browser = await sceneIn(resolve(baselineTree), content, size, theme), after: Browser = await sceneIn(here, content, size, theme);
    try {
      let shots = [await capture(before), await capture(after)], result = await changedPixels(shots[0]!, shots[1]!);
      for (let retake = 0; retake < 3 && result.changed !== 0; retake++) { shots = [await capture(before), await capture(after)]; result = await changedPixels(shots[0]!, shots[1]!); }
      const name = `${size.width}x${size.height}-${theme}`;
      report.push({ case: name, entry: scene, ...result });
      if (output && result.changed !== 0) for (const [label, png] of [["before", shots[0]!], ["after", shots[1]!]] as const) {
        await mkdir(resolve(output), { recursive: true });
        await writeFile(join(resolve(output), `scene-${name}-${scene}-${label}.png`), png);
      }
      assert.deepEqual([...before.errors, ...after.errors], []);
    } finally { await before.close(); await after.close(); }
  }
  const differing = report.filter(item => item.changed !== 0);
  console.log(`view parity: ${report.length} captures, ${differing.length} differ`);
  assert.deepEqual(differing, [], "VISUAL_PARITY_FAILED");
});
