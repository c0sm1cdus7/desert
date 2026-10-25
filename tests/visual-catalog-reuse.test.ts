import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ResolvedNodes } from "../src/interaction/catalog.ts";
import { compilePublicCatalog } from "../src/public-catalog/index.ts";
import { catalogFixture } from "./fixtures/public-catalog.ts";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import { rendererCss } from "./fixtures/renderer-css.ts";
import { createBuildProject } from "../src/build/svelte/project.ts";
import { imageSource } from "../src/svelte/infra/media-source.ts";
import { catalogWorkspaceSource } from "./fixtures/catalog-workspace.ts";

const catalog = compilePublicCatalog(catalogFixture()).surface;
const mount = (adapter: boolean) => `<script>
  import Bank from './src/svelte/${adapter ? "catalog/renderer/inspection-content/InspectionContent" : "catalog/renderer/public-catalog-bank/PublicCatalogBank"}.svelte';
  const catalog = ${JSON.stringify(catalog)};
</script><main data-renderer-profile="apple-reference" style="padding:16px"><Bank ${adapter
  ? 'catalog={catalog}' : 'surface={catalog} bodyOnly oncatalog={() => {}}'} /></main>`;

test("the View adapter renders the exact approved bank body for identical fixture data", async () => {
  const css = await rendererCss();
  const direct = await svelteBrowser(mount(false));
  const adapted = await svelteBrowser(mount(true));
  try {
    for (const fixture of [direct, adapted]) await fixture.page.addStyleTag({ content: css });
    // The bank region holds one column; its entries are the labelled sections of that column. A fixture is a gap when the
    // unavailable note stands in for its specimen.
    const measure = async (fixture: typeof direct) => fixture.page.locator("[data-view-item='public-catalog-bank'] > *").evaluate(column => ({
      text: column.textContent,
      gap: getComputedStyle(column).rowGap,
      families: [...column.children].filter(element => element.matches("section")).map(element => ({
        label: element.getAttribute("aria-label"), gap: getComputedStyle(element.firstElementChild!).rowGap,
        width: element.getBoundingClientRect().width,
      })),
      fixtures: [...column.querySelectorAll("[data-view-item^='specimen:']")].map(element => ({
        id: element.getAttribute("data-view-item"), coverage: element.querySelector('[role="note"]') ? "gap" : "rendered",
      })),
    }));
    assert.deepEqual(await measure(adapted), await measure(direct));
    assert.equal(await adapted.page.locator("[data-view-item^='specimen:']").count(),
      ResolvedNodes.entries.reduce((total, entry) => total + entry.states.length, 0));
    assert.equal(await adapted.page.getByText("Not installed in product execution", { exact: true }).count(), 0);
    assert.deepEqual(adapted.errors, []);
  } finally { await Promise.all([direct.close(), adapted.close()]); }
});

test("local catalog previews reuse the installed detail and retain bank drafts through toolbar search", async () => {
  const fixture = await svelteBrowser(catalogWorkspaceSource);
  try {
    await fixture.page.addStyleTag({ content: await rendererCss() });
    await fixture.page.emulateMedia({ reducedMotion: "reduce" });
    await fixture.page.locator('[data-view-item="catalog-index"] [data-focus-key="input.text"]').click();
    await fixture.page.locator('[data-view-item="entry:input.text"]').getByRole('button',{name:/^State ·/}).click();
    await fixture.page.getByRole('option',{name:'value',exact:true}).click();
    const writing = fixture.page.locator('[data-view-item="specimen:input.text:value"] input');
    await writing.fill("Keep my diagnostic draft");
    const original = await writing.elementHandle();
    await fixture.page.getByRole('button',{name:'Back',exact:true}).click();
    await fixture.page.locator('[data-view-item="catalog-index"] [data-focus-key="catalog.card"]').click();
    await fixture.page.locator('[data-view-item="entry:catalog.card"]').getByRole('button',{name:/^State ·/}).click();
    await fixture.page.getByRole('option',{name:'item',exact:true}).click();
    await fixture.page.locator('[data-view-item="specimen:catalog.card:item"] button').click();
    assert.ok(await fixture.page.locator('[data-catalog-detail]:visible').isVisible());
    assert.equal(await fixture.page.locator('[data-view-item="public-catalog-bank"]:visible').count(), 0);
    await fixture.page.locator('[data-catalog-content] > [data-toolbar="top"]')
      .getByRole("button", { name: "Back", exact: true }).click();
    assert.equal(await writing.inputValue(), "Keep my diagnostic draft");
    assert.ok(await writing.evaluate((element, previous) => element === previous, original));
    const search = fixture.page.getByRole("searchbox", { name: "Search visual catalog", exact: true });
    await fixture.page.getByRole("button",{ name:"Search", exact:true }).click();
    await search.fill("control.options");
    await fixture.page.locator('[data-focus-key="search:control.options"]').click();
    assert.equal(await search.count(),0,'selecting a result dismisses the accessible overlay search');
    await fixture.page.getByRole("button",{ name:"Search", exact:true }).click();
    assert.equal(await search.inputValue(), "", 'new search starts clear');
    await search.fill("control.money");
    await fixture.page.locator('[data-focus-key="search:control.money"]').click();
    assert.ok(await fixture.page.locator('[data-view-item="entry:control.money"]').isVisible());
    assert.equal(await fixture.page.locator("[data-view-item^='entry:']:visible").count(), 1,
      'search opens only the selected indexed detail; other local drafts remain mounted');
    assert.equal(await writing.inputValue(), "Keep my diagnostic draft");
    assert.ok(await writing.evaluate((element, previous) => element === previous, original));
    assert.deepEqual(fixture.errors, []);
  } finally { await fixture.close(); }
});

test("a nested catalog activity cannot keep a popup alive after its parent is deactivated", async () => {
  const fixture = await svelteBrowser(`<script>
    import InspectionContent from './src/svelte/catalog/renderer/inspection-content/InspectionContent.svelte';
    import RetainedPlace from './src/svelte/catalog/compositions/retained-place/RetainedPlace.svelte';
    let active = $state(true);
  </script>
  <svelte:window onkeydown={event => { if (event.key === 'F8') active = !active; }} />
  <main data-renderer-profile="apple-reference"><RetainedPlace {active}><InspectionContent /></RetainedPlace></main>`);
  try {
    await fixture.page.addStyleTag({ content: await rendererCss() });
    await fixture.page.locator('[data-view-item="catalog-index"] [data-focus-key="control.popover"]').click();
    await fixture.page.getByRole("button", { name: "Open contextual information", exact: true }).click();
    assert.equal(await fixture.page.locator('[data-presentation="anchored"]:visible').count(), 1);
    await fixture.page.keyboard.press("F8");
    await fixture.page.locator('[data-presentation="anchored"]').waitFor({ state: "hidden" });
    assert.equal(await fixture.page.locator('[data-view-item="public-catalog-bank"]:visible').count(), 0);
    await fixture.page.keyboard.press("F8");
    assert.equal(await fixture.page.locator('[data-view-item="public-catalog-bank"]:visible').count(), 1);
    assert.equal(await fixture.page.locator('[data-presentation="anchored"]:visible').count(), 0);
    assert.deepEqual(fixture.errors, []);
  } finally { await fixture.close(); }
});

test("generated projects bind the original SDK illustration locally without duplicating its source", async () => {
  const project = createBuildProject("export const surface = {}; export const validateInput = () => false;");
  try {
    assert.deepEqual(readFileSync(join(project.directory, "static/media/desert-bank-notebook.svg")),
      readFileSync(join(project.directory, "static/bank-image.svg")));
  } finally { project.close(); }
  assert.equal(imageSource("/media/desert-bank-notebook.svg", 1280), "/media/desert-bank-notebook.svg");
  assert.equal(imageSource("/media/photograph", 1280), "/media/photograph?w=1280");
});
