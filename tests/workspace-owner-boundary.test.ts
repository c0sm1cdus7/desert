import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { assertClosedVisualBoundaries } from "../src/authoring/visual-boundary/closed.ts";
import { inspectVisualSource } from "../src/authoring/visual-boundary/inspect.ts";
import { assertNoNewVisualDebt, type VisualInventory } from "../src/authoring/visual-boundary/inventory.ts";

test("navigation and View workspace own composition without accepting caller rendering", async () => {
  for (const path of ["src/svelte/explorer/CatalogNavigation.svelte", "src/svelte/pieces/ViewWorkspace.svelte",
    "src/svelte/pieces/LocalExerciseContent.svelte",
    "src/svelte/pieces/PublicCatalogProductContent.svelte", "src/svelte/pieces/ViewProductContent.svelte",
    "src/svelte/pieces/FactGroup.svelte"]) {
    const source = await readFile(new URL(`../${path}`, import.meta.url), "utf8");
    assert.doesNotThrow(() => assertClosedVisualBoundaries([{ path, source }]));
    for (const replacement of [
      '<script>let {children}=$props()</script>{@render children()}',
      '<script lang="ts">import type {Snippet} from "svelte";let {body}:{body:Snippet}=$props()</script>{@render body()}',
      '<script>let {attrs}=$props()</script><div {...attrs}/>',
      '{@html foreign}',
    ]) assert.throws(() => assertClosedVisualBoundaries([{ path, source: replacement }]), /CLOSED_VISUAL_BOUNDARY/);
    for (const markup of ['<Owner class="custom"/>', '<Owner style="padding:0"/>', '<Owner {...props}/>',
      '<Owner children={foreign}/>', '<Owner><div>Foreign</div></Owner>']) {
      assert.throws(() => assertClosedVisualBoundaries([{ path: "src/svelte/Consumer.svelte",
        source: `<script>import Owner from "./${path.slice("src/svelte/".length)}";</script>${markup}` }]), /CLOSED_VISUAL_BOUNDARY/);
    }
  }
});

test("renderers only select their finite catalog owners", async () => {
  for (const path of ["src/svelte/views/ViewProduct.svelte", "src/svelte/views/Workspace.svelte",
    "src/svelte/views/Panel.svelte", "src/svelte/explorer/LocalExercises.svelte",
    "src/svelte/explorer/PublicCatalogProduct.svelte", "src/svelte/Facts.svelte"]) {
  const source = await readFile(new URL(`../${path}`, import.meta.url), "utf8");
  assert.deepEqual(inspectVisualSource(path, source).findings, []);
  assert.doesNotThrow(() => assertClosedVisualBoundaries([{ path, source }]));
  for (const addition of ['<div/>', '<button>Foreign</button>', '<style>p{padding:0}</style>', '{@html foreign}']) {
    assert.throws(() => assertClosedVisualBoundaries([{ path, source: source + addition }]), /CLOSED_VISUAL_BOUNDARY/);
  }
  }
});

test("access and appearance sources are classified without creating finding allowances", async () => {
  const baseline = JSON.parse(await readFile(new URL("../docs/architecture/visual-ownership-debt.json", import.meta.url), "utf8")) as VisualInventory;
  for (const name of ["access-context.ts", "AccessForm.svelte", "AccessGate.svelte", "AccessScreen.svelte",
    "appearance-preferences.ts", "appearance-state.ts", "Appearance.svelte", "browser-access-lock.ts", "Identity.svelte",
    "ViewProductContent.svelte", "LocalExerciseContent.svelte", "PublicCatalogProductContent.svelte",
    "surface-reading.css", "toolbar-identity.ts", "toolbar-leading.svelte.ts"]) {
    const path = `src/svelte/pieces/${name}`, recorded = baseline.sources.find(item => item.path === path);
    assert.ok(recorded, path);
    assert.deepEqual(recorded.findings, [], `No escape allowance for ${path}`);
    const source = await readFile(new URL(`../${path}`, import.meta.url), "utf8");
    const current = inspectVisualSource(path, source);
    assert.deepEqual(current.findings, []);
    assert.doesNotThrow(() => assertNoNewVisualDebt({ ...baseline, sources: [current] }, baseline));
    if (path.endsWith(".svelte")) {
      assert.throws(() => assertNoNewVisualDebt({ ...baseline, sources: [inspectVisualSource(path, source + '\n{@html foreign}')] }, baseline), /NEW_VISUAL_DEBT/);
    }
  }
});

test("walkthrough owners use finite recipes without accepting new component or CSS escapes", async () => {
  const baseline = JSON.parse(await readFile(new URL("../docs/architecture/visual-ownership-debt.json", import.meta.url), "utf8")) as VisualInventory;
  for (const name of ["AccessExperience", "AppearancePreferences", "AvatarShuffle", "SeedAvatar", "Wallpaper", "LockScreen",
    "ReferenceSelector", "LabelRail", "LabelsControl", "AttentionList", "AttentionIndicator", "AttentionStatus",
    "MediaReferenceSelector", "media/MediaGrid", "media/MediaCollectionGrid", "SpeedDial", "ConfirmationDialog"]) {
    const path = `src/svelte/pieces/${name}.svelte`;
    const source = await readFile(new URL(`../${path}`, import.meta.url), "utf8");
    const current = inspectVisualSource(path, source);
    assert.deepEqual(current.findings, [], path);
    assert.doesNotThrow(() => assertNoNewVisualDebt({ ...baseline, sources: [current] }, baseline));
    for (const addition of ['<Foreign class="custom"/>', '<Foreign style="padding:0"/>',
      '<Foreign {...attrs}/>', '<style>:global(.foreign){padding:0}</style>']) {
      assert.throws(() => assertNoNewVisualDebt({ ...baseline,
        sources: [inspectVisualSource(path, source + addition)] }, baseline), /NEW_VISUAL_DEBT/, `${path}: ${addition}`);
    }
  }
});

test("View workspace is closed while its historical debt remains recorded", async () => {
  const baseline = JSON.parse(await readFile(new URL("../docs/architecture/visual-ownership-debt.json", import.meta.url), "utf8")) as VisualInventory;
  const path = "src/svelte/pieces/ViewWorkspace.svelte";
  const previous = baseline.sources.find(item => item.path === path);
  assert.ok(previous?.findings.length, "The migration does not erase historical findings");
  const current = inspectVisualSource(path, await readFile(new URL(`../${path}`, import.meta.url), "utf8"));
  assert.deepEqual(current.findings, []);
  assert.doesNotThrow(() => assertNoNewVisualDebt({ ...baseline, sources: [current] }, baseline));
});
