import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { InteractionCatalog } from "../src/interaction/catalog.ts";
import { compilePublicCatalog } from "../src/public-catalog/index.ts";
import { catalogFixture } from "./fixtures/public-catalog.ts";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import { rendererCss } from "./fixtures/renderer-css.ts";
import { createBuildProject } from "../src/build/svelte/project.ts";
import { imageSource } from "../src/svelte/pieces/media/source.ts";

const catalog = compilePublicCatalog(catalogFixture()).surface;
const mount = (adapter: boolean) => `<script>
  import Bank from './src/svelte/${adapter ? "views/InspectionContent" : "explorer/PublicCatalogBank"}.svelte';
  const catalog = ${JSON.stringify(catalog)};
</script><main data-renderer-profile="apple-reference" style="padding:16px"><Bank ${adapter
  ? 'catalog={catalog}' : 'surface={catalog} bodyOnly oncatalog={() => {}}'} /></main>`;

test("the View adapter renders the exact approved bank body for identical fixture data", async () => {
  const css = await rendererCss();
  const direct = await svelteBrowser(mount(false));
  const adapted = await svelteBrowser(mount(true));
  try {
    for (const fixture of [direct, adapted]) await fixture.page.addStyleTag({ content: css });
    const measure = async (fixture: typeof direct) => fixture.page.locator("[data-public-catalog-bank]").evaluate(bank => ({
      text: bank.textContent,
      gap: getComputedStyle(bank).rowGap,
      families: [...bank.children].filter(element => element.matches("section")).map(element => ({
        label: element.getAttribute("aria-label"), gap: getComputedStyle(element).rowGap,
        width: element.getBoundingClientRect().width,
      })),
      fixtures: [...bank.querySelectorAll("[data-specimen]")].map(element => ({
        id: element.getAttribute("data-specimen"), coverage: element.getAttribute("data-bank-coverage"),
      })),
    }));
    assert.deepEqual(await measure(adapted), await measure(direct));
    assert.equal(await adapted.page.locator("[data-specimen]").count(), 57);
    assert.equal(await adapted.page.getByText("Not installed in product execution", { exact: true }).count(), 0);
    assert.deepEqual(adapted.errors, []);
  } finally { await Promise.all([direct.close(), adapted.close()]); }
});

test("local catalog previews reuse the installed detail and retain bank drafts and search delegation", async () => {
  const source = `<script>
    import InspectionContent from './src/svelte/views/InspectionContent.svelte';
    let bank; let query = $state('');
    async function reveal() { const target = await bank.revealEntry('control.money'); target?.scrollIntoView(); }
  </script>
  <main data-renderer-profile="apple-reference"><button onclick={reveal}>Reveal money</button>
  <output data-query>{query}</output>
  <InspectionContent bind:this={bank} bind:query /></main>`;
  const fixture = await svelteBrowser(source);
  try {
    await fixture.page.addStyleTag({ content: await rendererCss() });
    const writing = fixture.page.locator('[data-specimen="input.text:value"] input');
    await writing.fill("Keep my diagnostic draft");
    const original = await writing.elementHandle();
    await fixture.page.locator('[data-specimen="catalog.card:item"] button').click();
    assert.ok(await fixture.page.locator('[data-catalog-detail]:visible').isVisible());
    assert.equal(await fixture.page.locator('[data-public-catalog-bank]:visible').count(), 0);
    await fixture.page.getByRole("button", { name: "Back to visual catalog", exact: true }).click();
    assert.equal(await writing.inputValue(), "Keep my diagnostic draft");
    assert.ok(await writing.evaluate((element, previous) => element === previous, original));
    const search = fixture.page.getByRole("searchbox", { name: "Find component", exact: true });
    await search.fill("control.options");
    assert.equal(await fixture.page.locator("[data-query]").textContent(), "control.options");
    await fixture.page.getByRole("button", { name: "Reveal money", exact: true }).click();
    assert.equal(await search.inputValue(), "");
    assert.ok(await fixture.page.locator('[data-catalog-entry="control.money"]').isVisible());
    assert.equal(await fixture.page.locator("[data-catalog-entry]:visible").count(), InteractionCatalog.entries.length);
    assert.deepEqual(fixture.errors, []);
  } finally { await fixture.close(); }
});

test("a nested catalog activity cannot keep a popup alive after its parent is deactivated", async () => {
  const fixture = await svelteBrowser(`<script>
    import InspectionContent from './src/svelte/views/InspectionContent.svelte';
    import RetainedPlace from './src/svelte/explorer/RetainedPlace.svelte';
    let active = $state(true);
  </script>
  <svelte:window onkeydown={event => { if (event.key === 'F8') active = !active; }} />
  <main data-renderer-profile="apple-reference"><RetainedPlace {active}><InspectionContent /></RetainedPlace></main>`);
  try {
    await fixture.page.addStyleTag({ content: await rendererCss() });
    await fixture.page.getByRole("button", { name: "Open contextual information", exact: true }).click();
    assert.equal(await fixture.page.locator('[data-presentation="anchored"]:visible').count(), 1);
    await fixture.page.keyboard.press("F8");
    await fixture.page.locator('[data-presentation="anchored"]').waitFor({ state: "hidden" });
    assert.equal(await fixture.page.locator('[data-public-catalog-bank]:visible').count(), 0);
    await fixture.page.keyboard.press("F8");
    assert.equal(await fixture.page.locator('[data-public-catalog-bank]:visible').count(), 1);
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
