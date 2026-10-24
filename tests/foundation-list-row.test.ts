// Slice 3 (F1.8): List absorbs grouped-panel and fact-list, Row is destination-row renamed and absorbs the record row,
// FactRow gains its control kind and FactValue its paragraph. Each keeps the pixels of the piece it absorbs (rendered
// live beside it, or from the frozen sources of the integration base ce6ed6f), and Row opens, explains and registers focus by key.
import assert from "node:assert/strict";
import { resolve } from "node:path";
import test from "node:test";
import { rendererCss } from "./fixtures/renderer-css.ts";
import { treeViolations } from "./fixtures/tree-violations.ts";
import { inlineImports, measureProbes, renderCases, type Probes } from "./fixtures/parity.ts";
import { contentBefore } from "./fixtures/content-before.ts";
import { marksBefore } from "./fixtures/marks-before.ts";
import { compositionsBefore } from "./fixtures/compositions-c-before.ts";

const root = resolve(import.meta.dirname, "..");
/** A composition as it was before composition lane C recomposed it on these foundations. */
const composedBefore = (id: string, entry: string) => {
  const path = `src/svelte/catalog/compositions/${id}/${entry}`;
  return { [resolve(root, path)]: compositionsBefore[path] ?? "" };
};
const folders = ["list", "row", "fact-row", "fact-value"].map(id => `src/svelte/catalog/foundations/${id}/`);
const imports = `
  import GroupedPanel from "@desert/svelte/catalog/foundations/grouped-panel/GroupedPanel.svelte";
  import DestinationRow from "@desert/svelte/catalog/foundations/destination-row/DestinationRow.svelte";
  import FactList from "@desert/svelte/catalog/foundations/fact-list/FactList.svelte";
  import FactRow from "@desert/svelte/catalog/foundations/fact-row/FactRow.svelte";
  import FactValue from "@desert/svelte/catalog/foundations/fact-value/FactValue.svelte";
  import List from "@desert/svelte/catalog/foundations/list/List.svelte";
  import Row from "@desert/svelte/catalog/foundations/row/Row.svelte";
  import Collection from "@desert/svelte/catalog/compositions/collection/Collection.svelte";
  import ObjectStateRow from "@desert/svelte/catalog/compositions/object-state-row/ObjectStateRow.svelte";
  import SelectionField from "@desert/svelte/catalog/foundations/selection-field/SelectionField.svelte";
  import ReadingContent from "@desert/svelte/catalog/compositions/reading-content/ReadingContent.svelte";`;
const reference = "10000000-0000-4000-8000-000000000001";
const selector = `{ field: "status", label: "Status", value: "draft", disabled: false, options: [
  { value: "draft", label: "Draft", journey: "draft", available: true }, { value: "done", label: "Done", journey: "finish", available: true }] }`;
const records = `{ version: "desert.bank-node/1", kind: "collection", object: "note", fields: ["title", "status"], loaded: true, disabled: false,
  selectedId: "1", labels: { "note.title": "Title", "note.status": "Status" }, createLabel: "Create", attention: { "1": [{ kind: "review" }] },
  records: [{ id: "1", version: 1, facts: { title: "iPhone ideas", status: "Draft" } }] }`;

const before = `<script lang="ts">${imports}</script>
<main style="display:grid;gap:16px;padding:16px;width:640px">
  <div data-case="destinations"><GroupedPanel><div data-grouped-rows>
    <DestinationRow destination="notes" label="Notes" icon="catalog" available open={() => {}} />
    <DestinationRow destination="trash" label="A destination whose title wraps onto a second line of the row" icon="archive" available open={() => {}} />
    <DestinationRow destination="archive" label="Archive" icon="archive" available={false} reason="Archive opens once a note is saved." open={() => {}} />
  </div></GroupedPanel></div>
  <div data-case="overview"><GroupedPanel measure="overview"><div data-grouped-rows>
    <DestinationRow destination="notes" label="Notes" icon="catalog" available open={() => {}} />
  </div></GroupedPanel></div>
  <div data-case="records"><Collection node={${records}} select={() => {}} /></div>
  <div data-case="facts"><FactList>
    <FactRow label="city" value="Buenos Aires" /><FactRow label="phone" value={null} />
    <FactRow label="tags" value={["Design", "Research"]} />
    <FactRow label="projects" value={["${reference}"]} references={[{ value: "${reference}", label: "Personal", color: "blue" }]} />
  </FactList></div>
  <div data-case="state"><dl class="bank-stack material-pane"><ObjectStateRow selector={${selector}} /></dl></div>
  <div data-case="narrow" style="width:180px"><FactList><FactRow label="city" value="Buenos Aires" /></FactList></div>
</main>`;
const after = `<script lang="ts">${imports}
  const selector = ${selector};
</script>
<main style="display:grid;gap:16px;padding:16px;width:640px">
  <div data-case="destinations"><List kind="rows" measure="reading">
    <Row label="Notes" leading={{ kind: "face", face: { kind: "icon", icon: "catalog" } }} trailing="chevron" interaction="open" available current={false} />
    <Row label="A destination whose title wraps onto a second line of the row" leading={{ kind: "face", face: { kind: "icon", icon: "archive" } }}
      trailing="chevron" interaction="open" available current={false} />
    <Row label="Archive" leading={{ kind: "face", face: { kind: "icon", icon: "archive" } }} trailing="chevron" interaction="open"
      available={false} reason="Archive opens once a note is saved." current={false} />
  </List></div>
  <div data-case="overview"><List kind="rows" measure="overview">
    <Row label="Notes" leading={{ kind: "face", face: { kind: "icon", icon: "catalog" } }} trailing="chevron" interaction="open" available current={false} />
  </List></div>
  <div data-case="records"><List kind="rows" measure="reading">
    <Row label="iPhone ideas" metadata={["Status · Draft"]} leading={{ kind: "attention", required: true }} trailing="chevron" interaction="open" available current />
  </List></div>
  <div data-case="facts"><List kind="facts" measure="reading">
    <FactRow kind="value" label="city" value="Buenos Aires" /><FactRow kind="value" label="phone" value={null} />
    <FactRow kind="value" label="tags" value={["Design", "Research"]} />
    <FactRow kind="value" label="projects" value={["${reference}"]} references={[{ value: "${reference}", label: "Personal", color: "blue" }]} />
  </List></div>
  <div data-case="state"><List kind="facts" measure="reading"><FactRow kind="control" label="Status">
    {#snippet control()}<SelectionField selection={selector.field} label={selector.label} value={selector.value} contextual disabled={false}
      options={selector.options.map(option => ({ value: option.value, label: option.label, disabled: false }))} onchange={() => {}} />{/snippet}
  </FactRow></List></div>
  <div data-case="narrow" style="width:180px"><List kind="facts" measure="reading"><FactRow kind="value" label="city" value="Buenos Aires" /></List></div>
</main>`;

const rowProbes = (pane: string, row: string, label: string) => ({ pane, row, content: `${row} > [data-button-content]`, face: '[data-piece="face"]',
  glyph: '[data-piece="face"] svg', label, chevron: "[data-control-chevron]" });
const factProbes = { pane: "dl", row: ".fact-row", label: ".fact-label", value: ".fact-value" };
const probes = (side: "before" | "after"): Probes => ({
  destinations: side === "before" ? rowProbes("[data-grouped-panel]", '[data-piece="destination-row"]', "text:.destination-title")
    : rowProbes("[data-list]", "[data-row]", "text:.row-label"),
  overview: side === "before" ? { pane: "[data-grouped-panel]" } : { pane: "[data-list]" },
  records: side === "before"
    ? { pane: "[data-grouped-panel]", row: "[data-grouped-action]", dot: "[data-attention-indicator]", label: "text:strong", metadata: "[data-record-metadata]",
      chevron: "[data-control-chevron]" }
    : { pane: "[data-list]", row: "[data-row]", dot: "[data-attention-indicator]", label: "text:.row-label", metadata: ".row-metadata",
      chevron: "[data-control-chevron]" },
  facts: { ...factProbes, tags: ".fact-labels", tag: '[data-slot="badge"]' },
  state: { ...factProbes, trigger: "button" },
  narrow: factProbes,
});

test("list, row, fact-row and fact-value: their folders draw only their own marks and cover every state and variant", async () => {
  const found = await treeViolations(folders, ["E", "F", "G", "H", "I", "J"]);
  // F1-merge: Row presses through the vendor button's attachment until its owner is settled.
  const merging = (line: string) => line.startsWith("VENDOR_OUTSIDE_OWNER: src/svelte/catalog/foundations/row/Row.svelte:4: imports vendor family button");
  assert.deepEqual(found.filter(line => !merging(line)), []);
});

test("list and row keep the pixels of the grouped panel, the destination row, the record row, the fact list and the state row", { timeout: 60000 }, async () => {
  const frozen = { [resolve(root, "src/svelte/catalog/foundations/fact-row/FactRow.svelte")]: contentBefore["src/svelte/catalog/foundations/fact-row/FactRow.svelte"] ?? "",
    ...composedBefore("collection", "Collection.svelte") };
  // The frozen theme imports the stylesheets F1f moved (the place heading's, the scroll edges' and the shell's) from where they were.
  const frozenCss = (path: string) => [path, contentBefore[path] ?? ""] as const;
  const was = await renderCases(before, frozen, await rendererCss([], inlineImports(marksBefore["src/svelte/theme.css"] ?? "", Object.fromEntries([
    frozenCss("src/svelte/catalog/mechanisms/structured-content/structured-content.css"),
    ...["src/svelte/catalog/compositions/place-heading/place-heading.css", "src/svelte/catalog/foundations/scroll-edges/scroll-edges.css",
      "src/svelte/catalog/mechanisms/catalog-shell/catalog-shell.css"].map(frozenCss)]))));
  const is = await renderCases(after, {}, await rendererCss());
  try {
    const [old, now] = [await measureProbes(was.page, probes("before")), await measureProbes(is.page, probes("after"))];
    // The grouped panel took its reading measure from a wrapper around its pane; the list pane holds it itself.
    // The record row aligned "start", justified "space-between" and was an inline-flex at full width: with one content
    // child spanning the row, in a left-to-right reading, each draws as the destination row's left, flex-start and flex
    // (the boxes compared below prove it). A destination title now wraps a word longer than the row anywhere, as the
    // record title did, instead of overflowing it; ordinary titles draw the same (their text boxes are compared).
    const without = (keys: readonly string[]) => (value: unknown) => JSON.parse(JSON.stringify(value), (key, item) => keys.includes(key) ? undefined : item);
    const ignored: Readonly<Record<string, readonly string[]>> = { destinations: ["max-width", "text-align", "overflow-wrap"], overview: ["max-width"],
      records: ["max-width", "text-align", "justify-content", "display"] };
    for (const name of Object.keys(old)) {
      const strip = without(ignored[name] ?? []);
      const [left, right] = [strip(old[name]), strip(now[name])];
      assert.deepEqual(right, left, name);
    }
    assert.deepEqual([was.errors, is.errors], [[], []]);
  } finally { await was.close(); await is.close(); }
});

test("row: opens when available, explains when not, marks the current object, and returns focus by key", async () => {
  const f = await renderCases(`<script lang="ts">
    import List from "@desert/svelte/catalog/foundations/list/List.svelte";
    import Row from "@desert/svelte/catalog/foundations/row/Row.svelte";
    import { provideFocusScope } from "@desert/svelte/infra/focus-scope.ts";
    const scope = provideFocusScope();
    let opened = $state([]);
    Object.assign(window, { scope });
  </script>
  <List kind="rows" measure="reading" label="Notes">
    <Row label="Archive" interaction="open" trailing="chevron" available={false} reason="Archive opens once a note is saved." current={false} onopen={() => opened.push("archive")} />
    <Row label="iPhone ideas" interaction="open" trailing="chevron" available current focusKey="record:1" onopen={() => opened.push("record")} />
    <Row label="Requires your attention" leading={{ kind: "attention", required: true }} interaction="static" trailing="none" available current={false} />
  </List>
  <output data-opened>{JSON.stringify(opened)}</output>`, {}, await rendererCss());
  try {
    const { page } = f, list = page.getByRole("group", { name: "Notes" });
    const archive = list.getByRole("button", { name: "Archive" }), record = list.getByRole("button", { name: "iPhone ideas" });
    assert.equal(await archive.isDisabled(), true);
    assert.equal(await archive.getAttribute("title"), "Archive opens once a note is saved.");
    assert.equal(await page.locator(`#${await archive.getAttribute("aria-describedby")}`).textContent(), "Archive opens once a note is saved.");
    assert.equal(await record.getAttribute("aria-current"), "true");
    assert.equal(await list.getByRole("button").count(), 2, "a static row is not a control");
    const hairlines = await page.locator("[data-row]").evaluateAll(rows => rows.map(row => getComputedStyle(row).borderTopWidth));
    assert.deepEqual(hairlines, ["0px", "1px", "1px"], "every row after the first draws one hairline, after an explained one too");
    assert.equal(await page.evaluate(() => Reflect.get(window, "scope").focus("record:1")), true);
    assert.equal(await record.evaluate(element => element === document.activeElement), true);
    await record.click();
    assert.equal(await page.locator("[data-opened]").textContent(), JSON.stringify(["record"]));
    assert.equal(await page.evaluate(() => Reflect.get(window, "scope").lastActivated()), "record:1");
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("fact-value: a paragraph reads a long text fact at the body role, inset like the reading copy it replaces", async () => {
  const f = await renderCases(`<script lang="ts">
    import FactValue from "@desert/svelte/catalog/foundations/fact-value/FactValue.svelte";
    import ReadingContent from "@desert/svelte/catalog/compositions/reading-content/ReadingContent.svelte";
  </script>
  <div data-case="reading" style="width:640px"><ReadingContent fields={["body"]} facts={{ body: "First line.\\nSecond line." }} object="note" labels={{ "note.body": "Body" }} /></div>
  <div data-case="paragraph" style="width:640px"><FactValue value={"First line.\\nSecond line."} presentation="paragraph" /></div>`,
    composedBefore("reading-content", "ReadingContent.svelte"), await rendererCss());
  try {
    const [reading, paragraph] = await f.page.evaluate(() => ["reading", "paragraph"].map(name => {
      const element = document.querySelector(`[data-case="${name}"] p`)!, style = getComputedStyle(element);
      return { padding: [style.paddingLeft, style.paddingRight], white: style.whiteSpace, wrap: style.overflowWrap, max: style.maxWidth,
        size: style.fontSize, height: style.lineHeight, text: element.textContent };
    }));
    const body = await f.page.evaluate(() => [getComputedStyle(document.documentElement).getPropertyValue("--text-body").trim(),
      getComputedStyle(document.documentElement).getPropertyValue("--text-body--line-height").trim()]);
    assert.deepEqual({ ...paragraph, size: undefined, height: undefined, max: undefined }, { ...reading, size: undefined, height: undefined, max: undefined },
      "the reading copy's inset, wrapping and text");
    assert.notEqual(paragraph?.max, "none", "the paragraph keeps a reading measure (68ch)");
    // Visual change (design §7.3): prose (1rem/1.625) becomes body.
    assert.deepEqual([paragraph?.size, paragraph?.height], body.map(value => `${Number.parseFloat(value) * (value.endsWith("rem") ? 16 : 1)}px`));
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
