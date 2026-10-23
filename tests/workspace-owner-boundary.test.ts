import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { assertClosedVisualBoundaries } from "../src/authoring/visual-boundary/closed.ts";
import { inspectVisualSource } from "../src/authoring/visual-boundary/inspect.ts";

test("navigation and View workspace own composition without accepting caller rendering", async () => {
  for (const path of ["src/svelte/catalog/compositions/catalog-navigation/CatalogNavigation.svelte", "src/svelte/catalog/compositions/view-workspace/ViewWorkspace.svelte",
    "src/svelte/catalog/compositions/local-exercise-content/LocalExerciseContent.svelte",
    "src/svelte/catalog/compositions/public-catalog-product-content/PublicCatalogProductContent.svelte", "src/svelte/catalog/compositions/view-product-content/ViewProductContent.svelte",
    "src/svelte/catalog/compositions/fact-group/FactGroup.svelte"]) {
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
  for (const path of ["src/svelte/catalog/renderer/view-product/ViewProduct.svelte", "src/svelte/catalog/renderer/workspace/Workspace.svelte",
    "src/svelte/catalog/renderer/panel/Panel.svelte", "src/svelte/catalog/renderer/local-exercises/LocalExercises.svelte",
    "src/svelte/catalog/renderer/public-catalog-product/PublicCatalogProduct.svelte", "src/svelte/catalog/renderer/facts/Facts.svelte"]) {
  const source = await readFile(new URL(`../${path}`, import.meta.url), "utf8");
  assert.deepEqual(inspectVisualSource(path, source).findings, []);
  assert.doesNotThrow(() => assertClosedVisualBoundaries([{ path, source }]));
  for (const addition of ['<div/>', '<button>Foreign</button>', '<style>p{padding:0}</style>', '{@html foreign}']) {
    assert.throws(() => assertClosedVisualBoundaries([{ path, source: source + addition }]), /CLOSED_VISUAL_BOUNDARY/);
  }
  }
});

// Restored from the debt-baseline tests retired in slice 0 (§5.3): the baseline is gone, the guard is not.
// Each source inspects clean, and each escape added to it is found, until catalog rules D–I replace the inspector.
// appearance-state.ts writes root styles: a DOM helper, not infra; catalog rule I (slice 1) refuses it until its owner is decided.
const compositions = "src/svelte/catalog/compositions", foundations = "src/svelte/catalog/foundations";
const accessAndAppearance = [
  "src/svelte/infra/access-context.ts", `${compositions}/access-form/AccessForm.svelte`, `${compositions}/access-gate/AccessGate.svelte`,
  `${compositions}/access-screen/AccessScreen.svelte`, "src/svelte/infra/appearance-preferences.ts",
  `${compositions}/appearance/Appearance.svelte`, `${compositions}/access-gate/browser-access-lock.ts`, `${compositions}/identity/Identity.svelte`,
  `${compositions}/view-product-content/ViewProductContent.svelte`, `${compositions}/local-exercise-content/LocalExerciseContent.svelte`,
  `${compositions}/public-catalog-product-content/PublicCatalogProductContent.svelte`, "src/svelte/catalog/mechanisms/surface-reading/surface-reading.css",
  `${compositions}/toolbar-layout/toolbar-identity.ts`, `${compositions}/toolbar-layout/toolbar-leading.svelte.ts`,
];
const walkthroughOwners = [
  `${compositions}/access-experience/AccessExperience.svelte`, `${compositions}/appearance-preferences/AppearancePreferences.svelte`,
  `${compositions}/avatar-shuffle/AvatarShuffle.svelte`, `${foundations}/seed-avatar/SeedAvatar.svelte`, `${foundations}/wallpaper/Wallpaper.svelte`,
  `${compositions}/lock-screen/LockScreen.svelte`, `${compositions}/reference-selector/ReferenceSelector.svelte`, `${foundations}/label-rail/LabelRail.svelte`,
  `${compositions}/labels-control/LabelsControl.svelte`, `${compositions}/attention-list/AttentionList.svelte`,
  `${foundations}/attention-indicator/AttentionIndicator.svelte`, `${compositions}/attention-status/AttentionStatus.svelte`,
  `${compositions}/media-reference-selector/MediaReferenceSelector.svelte`, `${compositions}/media-grid/MediaGrid.svelte`,
  `${compositions}/media-collection-grid/MediaCollectionGrid.svelte`, `${compositions}/speed-dial/SpeedDial.svelte`,
  `${compositions}/confirmation-dialog/ConfirmationDialog.svelte`, `${compositions}/view-workspace/ViewWorkspace.svelte`,
];
const inspected = async (path: string, addition = "") =>
  inspectVisualSource(path, await readFile(new URL(`../${path}`, import.meta.url), "utf8") + addition).findings;

test("access and appearance sources inspect clean and an added raw HTML render is found", async () => {
  for (const path of accessAndAppearance) {
    assert.deepEqual(await inspected(path), [], path);
    if (path.endsWith(".svelte")) assert.notDeepEqual(await inspected(path, "\n{@html foreign}"), [], `${path}: {@html}`);
  }
});

test("walkthrough owners inspect clean and refuse component and CSS escapes", async () => {
  for (const path of walkthroughOwners) {
    assert.deepEqual(await inspected(path), [], path);
    for (const addition of ['<Foreign class="custom"/>', '<Foreign style="padding:0"/>', '<Foreign {...attrs}/>', '<style>:global(.foreign){padding:0}</style>']) {
      assert.notDeepEqual(await inspected(path, addition), [], `${path}: ${addition}`);
    }
  }
});
