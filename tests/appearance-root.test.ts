// AppearanceRoot (slice 3, F1.9, DESIGN §1.6): the one foundation that applies the chosen appearance to the document root
// and publishes the platform colour scheme to infra/appearance-store.ts. It replaces onMount(mountCatalogAppearance).
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import { appearanceStorageKey } from "../src/svelte/infra/appearance-preferences.ts";

const stored = { theme: "dark", textSize: "larger", tint: "rose", wallpaper: "mist" };
const host = `<script lang="ts">
  import AppearanceRoot from "@desert/svelte/catalog/foundations/appearance-root/AppearanceRoot.svelte";
  import { systemScheme } from "@desert/svelte/infra/appearance-store.ts";
  import { appearance } from "@desert/svelte/infra/appearance-state.ts";
  document.documentElement.dataset.theme = "light";
  localStorage.setItem(${JSON.stringify(appearanceStorageKey)}, ${JSON.stringify(JSON.stringify(stored))});
  let mounted = $state(true);
  Reflect.set(window, "unmount", () => { mounted = false; });
  systemScheme.subscribe(value => Reflect.set(window, "scheme", value));
  appearance.subscribe(value => Reflect.set(window, "tint", value.tint));
</script>
{#if mounted}<AppearanceRoot />{/if}`;
const root = (page: Awaited<ReturnType<typeof svelteBrowser>>["page"]) => page.evaluate(() => {
  const element = document.documentElement;
  return { theme: element.dataset.theme, tint: element.dataset.tint, wallpaper: element.dataset.wallpaper,
    profile: element.dataset.rendererProfile, scale: element.style.getPropertyValue("--text-scale") };
});

test("the stored appearance is applied to the document root and the previous root is restored on unmount", { timeout: 30000 }, async () => {
  const f = await svelteBrowser(host, {}, "http://desert-appearance-root.test/");
  try {
    await f.page.waitForFunction(() => document.documentElement.dataset.tint === "rose");
    // No renderer profile mark: the catalog-profile mechanism that read it was dissolved into the theme (Batch 3).
    assert.deepEqual(await root(f.page), { theme: "dark", tint: "rose", wallpaper: "mist", profile: undefined, scale: "1.3" });
    await f.page.evaluate(() => Reflect.get(window, "unmount")());
    await f.page.waitForFunction(() => document.documentElement.dataset.tint === undefined);
    assert.deepEqual(await root(f.page), { theme: "light", tint: undefined, wallpaper: undefined, profile: undefined, scale: "" });
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("the platform colour scheme is published to the nonvisual store, and follows its changes", { timeout: 30000 }, async () => {
  const f = await svelteBrowser(host, {}, "http://desert-appearance-scheme.test/");
  try {
    for (const scheme of ["dark", "light", "dark"] as const) {
      await f.page.emulateMedia({ colorScheme: scheme });
      await f.page.waitForFunction(scheme => Reflect.get(window, "scheme") === scheme, scheme);
    }
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("another tab's stored choice reaches this tab", { timeout: 30000 }, async () => {
  const f = await svelteBrowser(host, {}, "http://desert-appearance-sync.test/");
  try {
    await f.page.waitForFunction(() => Reflect.get(window, "tint") === "rose");
    await f.page.evaluate(key => {
      localStorage.setItem(key, JSON.stringify({ theme: "dark", textSize: "larger", tint: "green", wallpaper: "mist" }));
      window.dispatchEvent(new StorageEvent("storage", { key }));
    }, appearanceStorageKey);
    await f.page.waitForFunction(() => document.documentElement.dataset.tint === "green");
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("infra keeps only the nonvisual appearance stores: no document, root or matchMedia there", async () => {
  const state = await readFile(resolve(import.meta.dirname, "../src/svelte/infra/appearance-state.ts"), "utf8");
  assert.doesNotMatch(state, /document\.|documentElement|matchMedia\(|setProperty\(/);
});

// One fact, one place: the chosen text scale is written only by AppearanceRoot; the theme reads it, defaulting to 1.
test("the text scale has one writer: the theme reads it with its default and never declares it", async () => {
  const theme = (name: string) => readFile(resolve(import.meta.dirname, `../src/svelte/catalog/mechanisms/theme/${name}`), "utf8");
  assert.doesNotMatch(await theme("tokens.css"), /--text-scale\s*:/, "the theme does not write --text-scale");
  assert.match(await theme("base.css"), /font-size:calc\(100% \* var\(--text-scale, 1\)\)/, "the root font size reads the scale, 1 when none is chosen");
});
