// Slice 3 (F1.8): Card generalises catalog-card and absorbs the media tile, the collection cover and the summary
// widget's card. Each presentation keeps the pixels of the piece it absorbs, rendered live beside it (CatalogCard,
// MediaGrid, MediaCollectionGrid, SummaryWidget), and the card opens, stays closed when disabled and warms its image.
import assert from "node:assert/strict";
import test from "node:test";
import { rendererCss } from "./fixtures/renderer-css.ts";
import { treeViolations } from "./fixtures/tree-violations.ts";
import { measureProbes, renderCases, type Probes } from "./fixtures/parity.ts";

const id = (n: number) => `10000000-0000-4000-8000-00000000000${n}`;
const collection = { version: "desert.bank-node/1", kind: "collection", object: "item", fields: ["photo", "caption"],
  labels: { "item.photo": "Photo", "item.caption": "Caption" }, loaded: true, disabled: false, selectedId: id(1),
  attention: { [id(1)]: [{ kind: "review" }] } };
const grid = { ...collection, presentation: { kind: "media-grid", image: "photo", description: "caption" }, records: [
  { id: id(1), version: 1, facts: { photo: "/media/harbour.jpg", caption: "Harbour at dusk" } },
  { id: id(2), version: 1, facts: { photo: { kind: "asset", reference: id(3), media: "video" }, caption: "Night ferry" } },
  { id: id(4), version: 1, facts: { photo: "", caption: "" } }] };
const covers = { ...collection, fields: ["title"], labels: { "item.title": "Title" }, presentation: { kind: "collection-grid", title: "title",
  previews: [{ id: id(1), count: 3, media: { kind: "asset", reference: id(3), media: "image" } }, { id: id(2), count: 1 }] },
  records: [{ id: id(1), version: 1, facts: { title: "Travel" } }, { id: id(2), version: 1, facts: { title: "Family" } }] };
const summary = { ...collection, object: "task", fields: ["status"], labels: { "task.status": "Status" }, connection: "online",
  records: [{ id: "a", version: 1, facts: { status: "open" } }], presentation: { kind: "summary-widget", title: "Tasks",
    description: "Your work at a glance.", totalLabel: "Tasks", field: "status", segments: [{ value: "open", label: "Open" }] } };
const node = (record: string, extra: object) => ({ version: "desert.bank-node/1", kind: "catalog.card", presentation: "item", record,
  title: "Night ferry", ...extra });

const page = (body: string) => `<script lang="ts">
  import CatalogCard from "@desert/svelte/catalog/foundations/catalog-card/CatalogCard.svelte";
  import MediaGrid from "@desert/svelte/catalog/compositions/media-grid/MediaGrid.svelte";
  import MediaCollectionGrid from "@desert/svelte/catalog/compositions/media-collection-grid/MediaCollectionGrid.svelte";
  import SummaryWidget from "@desert/svelte/catalog/compositions/summary-widget/SummaryWidget.svelte";
  import Card from "@desert/svelte/catalog/foundations/card/Card.svelte";
</script>
<main data-renderer-profile="apple-reference" style="display:grid;gap:16px;padding:16px;width:640px">${body}</main>`;
const track = 'style="display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,18rem),1fr));gap:16px;width:600px"';
const before = page(`
  <div data-case="item-placeholder"><CatalogCard node={${JSON.stringify(node("night-ferry", { mediaType: "video" }))}} /></div>
  <div data-case="item-image"><CatalogCard node={${JSON.stringify(node("harbor", { title: "Harbor at dawn", image: { asset: "harbor-cover", alt: "Boats at sunrise" } }))}} /></div>
  <div data-case="tiles" style="width:600px"><MediaGrid node={${JSON.stringify(grid)}} select={() => {}} /></div>
  <div data-case="covers" style="width:600px"><MediaCollectionGrid node={${JSON.stringify(covers)}} select={() => {}} /></div>
  <div data-case="summary"><SummaryWidget node={${JSON.stringify(summary)}} activate={() => {}} /></div>`);
const after = page(`
  <div data-case="item-placeholder"><Card presentation="item" label="Night ferry" title="Night ferry" artwork={{ kind: "placeholder", media: "video" }}
    attention={false} current={false} disabled={false} /></div>
  <div data-case="item-image"><Card presentation="item" label="Harbor at dawn" title="Harbor at dawn" artwork="/media/harbor-cover" alt="Boats at sunrise"
    attention={false} current={false} disabled={false} /></div>
  <div data-case="tiles" ${track}>
    <Card presentation="tile" label="Open Harbour at dusk" artwork="/media/harbour.jpg" alt="Harbour at dusk" attention current disabled={false} />
    <Card presentation="tile" label="Open Night ferry" artwork={{ kind: "placeholder", media: "video" }} attention={false} current={false} disabled={false} />
    <Card presentation="tile" label="Open Media 3" artwork={{ kind: "placeholder", media: "unavailable" }} attention={false} current={false} disabled={false} />
  </div>
  <div data-case="covers" ${track}>
    <Card presentation="collection" label="Open collection Travel" title="Travel" subtitle="3 items" artwork={{ kind: "asset", reference: "${id(3)}", media: "image" }}
      attention current disabled={false} />
    <Card presentation="collection" label="Open collection Family" title="Family" subtitle="1 item" attention={false} current={false} disabled={false} />
  </div>
  <div data-case="summary"><Card presentation="summary" label="Open Tasks" attention={false} current={false} disabled={false}><span>Tasks</span></Card></div>`);

const probes = (side: "before" | "after"): Probes => {
  const card = side === "before" ? "[data-catalog-card]" : "[data-card]";
  const press = side === "before" ? "[data-catalog-image-action]" : "[data-card] button";
  const tile = side === "before" ? "[data-media-grid-item]" : '[data-card="tile"]';
  const cover = side === "before" ? "[data-media-collection-card]" : '[data-card="collection"]';
  const media = { card, press, content: `${press} > [data-button-content]`, artwork: "[data-media-image], [data-media-artwork-placeholder]",
    title: side === "before" ? "[data-catalog-card-overlay]" : ".card-overlay" };
  return {
    "item-placeholder": { ...media, glyph: "svg" }, "item-image": media,
    tiles: { tile, content: `${tile} > [data-button-content]`, dot: "[data-attention-indicator]", artwork: "[data-media-image], [data-media-artwork-placeholder]" },
    covers: { cover, content: `${cover} > [data-button-content]`, dot: "[data-attention-indicator]", image: "[data-media-image]",
      title: "strong", subtitle: side === "before" ? "[data-media-collection-copy] > span" : ".card-subtitle" },
  };
};

test("card: its folder imports no foreign vendor, styles only its own classes and covers every state and presentation", async () => {
  const found = await treeViolations(["src/svelte/catalog/foundations/card/"], ["E", "F", "G", "H", "I", "J"]);
  // F1-merge: the card presses through the vendor button's attachment until the control-feedback utility carries it.
  assert.deepEqual(found.filter(line => !line.startsWith("VENDOR_OUTSIDE_OWNER: src/svelte/catalog/foundations/card/Card.svelte:4: imports vendor family button")), []);
});

test("card keeps the pixels of the catalog card, the media tile, the collection cover and the summary card", { timeout: 60000 }, async () => {
  const css = await rendererCss();
  const [was, is] = [await renderCases(before, {}, css), await renderCases(after, {}, css)];
  try {
    for (const f of [was, is]) await f.page.locator('[data-case="item-image"] [data-image-state="error"]').waitFor();
    // An item's artwork fills the card through the card's own absolute frame, where a contextual rule positioned it
    // before: its box is compared, its position is the frame's.
    const unplaced = (value: unknown) => JSON.parse(JSON.stringify(value), (key, item) => key === "position" ? undefined : item);
    const [old, now] = [await measureProbes(was.page, probes("before")), await measureProbes(is.page, probes("after"))];
    for (const name of Object.keys(old)) {
      const artwork = (value: typeof old) => ({ ...value[name], artwork: unplaced(value[name]?.artwork) });
      assert.deepEqual(name.startsWith("item") ? artwork(now) : now[name], name.startsWith("item") ? artwork(old) : old[name], name);
    }
    // The summary card: its frame and its content column (its readings are the composition's children).
    const frame = (side: "before" | "after"): Probes => ({ summary: { frame: side === "before" ? "[data-summary-widget]" : '[data-card="summary"]' } });
    const styles = ["width", "min-height", "padding-top", "padding-left", "border-radius", "border-top-width", "background-color", "display",
      "align-items", "justify-content", "text-align", "white-space", "font-size", "font-weight", "line-height", "color"];
    assert.deepEqual(await measureProbes(is.page, frame("after"), styles).then(value => strip(value)), await measureProbes(was.page, frame("before"), styles).then(value => strip(value)));
    assert.deepEqual([was.errors, is.errors], [[], []]);
  } finally { await was.close(); await is.close(); }
});
/** Heights depend on the summary's readings; the frame's x, y and width do not. */
const strip = (value: unknown) => JSON.parse(JSON.stringify(value), (key, item) => key === "box" && Array.isArray(item) ? item.slice(0, 3) : item);

test("card: opens when pressed, stays closed when disabled, names its summary readings and returns focus by key", async () => {
  const f = await renderCases(`<script lang="ts">
    import Card from "@desert/svelte/catalog/foundations/card/Card.svelte";
    import { provideFocusScope } from "@desert/svelte/infra/focus-scope.ts";
    Object.assign(window, { scope: provideFocusScope() });
    let opened = $state([]);
  </script>
  <main data-renderer-profile="apple-reference">
    <Card presentation="tile" label="Open Harbour" artwork="/media/harbour.jpg" alt="" attention={false} current={false} disabled={false}
      focusKey="record:harbour" onopen={() => opened.push("tile")} />
    <Card presentation="collection" label="Open collection Archive" title="Archive" subtitle="0 items" attention={false} current={false} disabled onopen={() => opened.push("archive")} />
    <Card presentation="summary" label="Open Tasks" describedBy="total" busy attention={false} current={false} disabled={false} onopen={() => opened.push("summary")}>
      <span id="total">3 Tasks</span>
    </Card>
    <output data-opened>{JSON.stringify(opened)}</output>
  </main>`, {}, await rendererCss());
  try {
    const { page } = f;
    const tile = page.getByRole("button", { name: "Open Harbour" });
    await tile.click();
    assert.equal(await page.evaluate(() => Reflect.get(window, "scope").lastActivated()), "record:harbour");
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    assert.equal(await page.evaluate(() => Reflect.get(window, "scope").focus("record:harbour")), true);
    assert.equal(await tile.evaluate(element => element === document.activeElement), true);
    assert.equal(await page.getByRole("button", { name: "Open collection Archive" }).isDisabled(), true);
    const summary = page.getByRole("button", { name: "Open Tasks" });
    assert.deepEqual([await summary.getAttribute("aria-describedby"), await summary.getAttribute("aria-busy")], ["total", "true"]);
    await summary.click();
    assert.equal(await page.locator("[data-opened]").textContent(), JSON.stringify(["tile", "summary"]));
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
