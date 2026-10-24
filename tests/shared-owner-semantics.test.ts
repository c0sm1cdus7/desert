import assert from "node:assert/strict";
import test from "node:test";
import AxeBuilder from "@axe-core/playwright";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import { rendererCss } from "./fixtures/renderer-css.ts";

test("shared pane chrome and catalog specimens preserve the document outline without duplicate landmarks", { timeout: 60000 }, async () => {
  const f = await svelteBrowser(`<script lang="ts">
    import ToolbarLayout from '@desert/svelte/catalog/compositions/toolbar-layout/ToolbarLayout.svelte';
    import PlaceHeading from '@desert/svelte/catalog/foundations/place-heading/PlaceHeading.svelte';
    import SpecimenUnavailable from '@desert/svelte/catalog/compositions/specimen-unavailable/SpecimenUnavailable.svelte';
    import SpecimenRow from '@desert/svelte/catalog/compositions/specimen-row/SpecimenRow.svelte';
    import CatalogHome from '@desert/svelte/catalog/compositions/catalog-home/CatalogHome.svelte';
    const home = {version:'desert.bank-node/1',kind:'catalog.home',
      featured:{version:'desert.bank-node/1',kind:'catalog.card',presentation:'featured',record:'cover',title:'Cover',eyebrow:'Featured',actionLabel:'Open'},
      groups:[{id:'albums',title:'Albums',items:[]}]};
  </script>
  <main aria-label="Notebook">
    <ToolbarLayout content={{kind:'actions',actions:[],onevent:()=>{}}} />
    <PlaceHeading context="place" title="Notebook" subtitle="Your writing" />
    <h2>Compositions</h2><h3>Media library</h3>
    <SpecimenRow id="catalog.home" state="populated"><CatalogHome node={home} bodyOnly onevent={()=>{}} /></SpecimenRow>
    <SpecimenUnavailable reason="This specimen has no execution adapter." />
    <SpecimenUnavailable reason="Another specimen has no execution adapter." />
  </main>`);
  try {
    await f.page.addStyleTag({ content: await rendererCss() });
    assert.deepEqual(f.errors, []);
    const outline = await f.page.locator('h1,h2,h3,h4,h5,h6').evaluateAll(nodes => nodes.map(node => [node.tagName, node.textContent]));
    assert.deepEqual(outline, [['H1','Notebook'],['H2','Compositions'],['H3','Media library'],['H4','Albums']]);
    assert.equal(await f.page.getByRole('banner').count(), 0, "pane chrome is not a document-wide banner");
    assert.equal(await f.page.getByRole('note', { name:'Specimen unavailable' }).count(), 2);
    const audit = await new AxeBuilder({ page:f.page }).withRules(['heading-order','landmark-banner-is-top-level','landmark-unique']).analyze();
    assert.deepEqual(audit.violations, []);
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
