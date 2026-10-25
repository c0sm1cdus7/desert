// A catalog detail shown inside another page reads on that page's axis (second review of the slice 3 package): on the
// catalog.detail page, «Notebook cover» and «About» started 18px (and more at 1280) right of the page's own titles and
// text, because the nested detail added a place's content inset its host does not have. Nested, its title and its stack
// read at the row inset, as the host's stack titles do; its block padding is unchanged.
import test from "node:test";
import assert from "node:assert/strict";
import { mounted } from "./support/foundation.ts";

test("a nested catalog detail's title and About read on its host's row inset", async () => {
  const f = await mounted(`<div style="width:354px" data-host><Catalog.Column gap="regular">
    <Catalog.StackLayout title="Examples"><Catalog.Text kind="body" text="Host text" /></Catalog.StackLayout>
    <CatalogDetail placement="nested" node={{ version: "desert.bank-node/1", kind: "catalog.detail", record: "lake", title: "Notebook cover",
      description: "An original illustration.", image: { asset: "lake", alt: "Lake" } }} />
  </Catalog.Column></div>`, `  import CatalogDetail from "@desert/svelte/catalog/compositions/catalog-detail/CatalogDetail.svelte";`);
  try {
    for (const width of [390, 1280]) {
      await f.page.setViewportSize({ width, height: 900 });
      const x = await f.page.evaluate(() => {
        const host = document.querySelector("[data-host]")!.getBoundingClientRect().left;
        const at = (words: string) => { const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
          for (let node = walker.nextNode(); node; node = walker.nextNode()) if (node.textContent?.trim() === words) {
            const range = document.createRange(); range.selectNodeContents(node); return Math.round(range.getBoundingClientRect().left - host); }
          return NaN; };
        return { hostTitle: at("Examples"), title: at("Notebook cover"), about: at("About"), text: at("An original illustration.") };
      });
      assert.deepEqual({ title: x.title, about: x.about, text: x.text }, { title: x.hostTitle, about: x.hostTitle, text: x.hostTitle },
        `${width}: ${JSON.stringify(x)}`);
    }
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
