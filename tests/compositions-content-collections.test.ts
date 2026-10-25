// Slices 3–4, composition lane C: the content, facts and collections compositions are composed of catalog pieces only (no
// element, style, vendor import or written sentence of their own); they read the same as the compositions they replace,
// frozen at 8f77519, except the changes the design lists; and they keep their behaviour, at 320px and 200% text too.
import assert from "node:assert/strict";
import { resolve } from "node:path";
import test from "node:test";
import { rendererCss } from "./fixtures/renderer-css.ts";
import { treeViolations } from "./fixtures/tree-violations.ts";
import { renderCases } from "./fixtures/parity.ts";
import { compositionsBefore } from "./fixtures/compositions-c-before.ts";
import { compositionCaseNames, compositionCases } from "./fixtures/compositions-c-cases.ts";
import { readCases, type Box, type Reading, type TextReading } from "./fixtures/composition-reading.ts";

const root = resolve(import.meta.dirname, "..");
const lane = ["information", "text-content", "fact-group", "context-panel", "context-properties", "reading-content", "view-destination-link",
  "collection", "collection-state", "attention-list", "attention-status", "view-attention", "summary-widget", "view-related-selection"];

test("lane C: its compositions draw no element, style, vendor, global or sentence, and mount only declared pieces", async () => {
  const found = await treeViolations(lane.map(id => `src/svelte/catalog/compositions/${id}/`), ["D", "D2", "E", "F", "G", "H", "I", "U", "V"]);
  // Lane B closed node-renderer's contract: the image NodeRenderers of fact-group and context-panel pass only its `node`.
  assert.deepEqual(found, []);
});

type Seen = TextReading & { box: Box };
const seen = (reading: Reading): Seen[] => reading.texts.filter((item): item is Seen => item.box !== "sr-only");
const line = (reading: Reading, text: string): Seen => {
  const found = seen(reading).find(item => item.text === text);
  if (!found) throw new Error(`PARITY: no line "${text}"`);
  return found;
};
/** The texts of a reading with some of their facts blanked (`box` and `style` indexes), where a change is measured apart. */
const blank = (reading: Reading, boxes: readonly number[], styles: readonly number[], which: (item: TextReading) => boolean = () => true) =>
  reading.texts.map(item => item.box === "sr-only" || !which(item) ? item : { ...item,
    box: item.box.map((value, index) => boxes.includes(index) ? null : value), style: item.style.map((value, index) => styles.includes(index) ? null : value) });
const Y = 1, WIDTH = 2, HEIGHT = 3, LINE_HEIGHT = 1, WEIGHT = 2, ALIGN = 4;
const bottom = (box: Box) => box[Y] + box[HEIGHT];

test("lane C reads the same as the compositions it replaces, but for the design's changes", { timeout: 90000 }, async () => {
  const frozen = Object.fromEntries(Object.entries(compositionsBefore).map(([path, source]) => [resolve(root, path), source]));
  // The frozen side draws with the stylesheets its markup was drawn with: lane M deleted structured-content.css, whose
  // `.bank-stack` rule gave the frozen fact list its group radius (List draws it itself today); frozen sources bring it back.
  const was = await renderCases(compositionCases, frozen, await rendererCss(Object.values(compositionsBefore)));
  const is = await renderCases(compositionCases, {}, await rendererCss());
  try {
    const [old, now] = [await readCases(was.page, compositionCaseNames), await readCases(is.page, compositionCaseNames)];
    const pair = (name: string): readonly [Reading, Reading] => {
      const [before, after] = [old[name], now[name]];
      if (!before || !after) throw new Error(`PARITY: no case ${name}`);
      return [before, after];
    };
    const changed = new Set(["destination", "destination-unavailable", "attention-list", "attention-one", "attention-many", "context-panel-full",
      "context-panel-actions", "summary", "summary-truncated", "summary-loading"]);
    for (const name of compositionCaseNames.filter(name => !changed.has(name))) {
      const [before, after] = pair(name);
      assert.deepEqual(after, before, name);
    }

    // One piece, one implementation: a Row aligns its label `start`, the frozen destination row's `left` in this reading.
    for (const name of ["destination", "destination-unavailable"]) {
      const [before, after] = pair(name);
      assert.deepEqual({ ...after, texts: blank(after, [], [ALIGN]) }, { ...before, texts: blank(before, [], [ALIGN]) }, name);
      assert.deepEqual(seen(after).map(item => item.style[ALIGN]), ["start"], name);
    }
    // One piece: Row has one label weight (medium), where the attention rows drew their title bold and the attention
    // status its sentence regular; a static Row keeps every row's 44px minimum, 2px more than the status drew.
    const titles = (item: TextReading) => ["Finish your note", "Saved activity"].includes(item.text);
    {
      const [before, after] = pair("attention-list");
      assert.deepEqual({ ...after, texts: blank(after, [WIDTH], [WEIGHT], titles) }, { ...before, texts: blank(before, [WIDTH], [WEIGHT], titles) });
      assert.deepEqual(seen(after).filter(titles).map(item => item.style[WEIGHT]), ["500", "500"]);
    }
    for (const name of ["attention-one", "attention-many"]) {
      const [before, after] = pair(name);
      assert.deepEqual([before.panes[0]?.box[HEIGHT], after.panes[0]?.box[HEIGHT]], [44, 46], name);
      assert.deepEqual(blank(after, [Y, WIDTH], [WEIGHT]), blank(before, [Y, WIDTH], [WEIGHT]), name);
      assert.deepEqual(seen(after).map(item => item.style[WEIGHT]), ["500"], name);
    }
    {
      const [before, after] = pair("context-panel-full");
      assert.deepEqual(["Body", "Properties", "City", "Status"].map(text => line(after, text).box[Y] - line(before, text).box[Y]), [2, 2, 2, 2],
        "the context's attention status is that static Row, and what follows it moves with it");
    }
    // Design §7.10: the Context "Actions" heading becomes a group heading; the space above it, its pane and its rows stay.
    for (const name of ["context-panel-full", "context-panel-actions"]) {
      const [before, after] = pair(name);
      assert.deepEqual(line(after, "Actions").style.slice(0, 4), ["11px", "16px", "400", "rgb(101, 101, 107)"], `${name}: the group heading role`);
      const actions = (reading: Reading) => reading.panes.at(-1)?.box ?? [0, 0, 0, 0] as const;
      const above = (reading: Reading) => {
        const pane = reading.panes.filter(item => item.box[WIDTH] > 100 && item.box[Y] < actions(reading)[Y]).at(-1);
        return line(reading, "Actions").box[Y] - (pane ? bottom(pane.box) : 0);
      };
      const rows = (reading: Reading) => ["Archive", "Share"].map(text => line(reading, text).box[Y] - actions(reading)[Y]);
      assert.deepEqual(actions(after).slice(WIDTH), actions(before).slice(WIDTH), `${name}: the actions pane`);
      assert.deepEqual(rows(after), rows(before), `${name}: the action rows`);
      assert.equal(above(after), above(before), `${name}: the space above the actions`);
    }
    // One piece: Meter draws the total in the display role (32px/38px/600, where the widget drew it 32px/32px/bold), so
    // the total and its label sit a little narrower on their line. Every other reading keeps its place on its line, its
    // width and its style; the card grows by the 6px of the taller line, and the 13rem card, which centres its readings,
    // does not grow.
    const placed = (reading: Reading) => {
      const total = reading.texts.findIndex(item => item.text === "3");
      return reading.texts.map((item, index) => item.box === "sr-only" ? item : { text: item.text, height: item.box[HEIGHT],
        ...index === total || index === total + 1 ? {} : { x: item.box[0], width: item.box[WIDTH] },
        style: index === total ? item.style.filter((_, at) => at !== LINE_HEIGHT && at !== WEIGHT) : item.style });
    };
    for (const name of ["summary", "summary-truncated"]) {
      const [before, after] = pair(name);
      assert.deepEqual([line(before, "3").style.slice(0, 3), line(after, "3").style.slice(0, 3)], [["32px", "32px", "700"], ["32px", "38px", "600"]], name);
      assert.deepEqual(placed(after), placed(before), name);
      assert.deepEqual(after.marks.map(mark => [mark.box[0], mark.box[WIDTH], mark.box[HEIGHT], mark.ink]),
        before.marks.map(mark => [mark.box[0], mark.box[WIDTH], mark.box[HEIGHT], mark.ink]), `${name}: the meter`);
    }
    const height = (reading: Reading) => reading.size[1] ?? Number.NaN;
    assert.equal(height(pair("summary-truncated")[1]) - height(pair("summary-truncated")[0]), 6, "the 6px taller total line");
    assert.equal(height(pair("summary")[1]), height(pair("summary")[0]), "the 13rem summary card");
    // One piece: Loading draws its lines 8px apart, where the widget drew them 4px apart; the card keeps its size.
    {
      const [before, after] = pair("summary-loading");
      const spacing = (reading: Reading) => {
        const [first, second] = reading.marks;
        return first && second ? second.box[Y] - bottom(first.box) : Number.NaN;
      };
      assert.deepEqual([spacing(before), spacing(after)], [4, 8]);
      assert.deepEqual(after.size, before.size);
      assert.deepEqual(blank(after, [Y], []), blank(before, [Y], []));
    }
    assert.deepEqual([was.errors, is.errors], [[], []]);
  } finally { await was.close(); await is.close(); }
});
