// An Action's label is never cut short (owner decision, 2026-10-26). On a narrow phone at its largest text (320px, 200%)
// a text label wraps between words and its button grows taller, as a platform button does; a word wider than its whole
// line sets the label just small enough for that word to fit whole (English never hyphenates a capitalised word), the
// two halves of a bottom pair draw one size, keep one width, one height and one top, and keep the control's radius. A
// label that fits keeps its size and its one line, and at 390px and 100% nothing changes.
import assert from "node:assert/strict";
import test from "node:test";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import { rendererCss } from "./fixtures/renderer-css.ts";

const source = `<script lang="ts">
  import Action from "@desert/svelte/catalog/foundations/action/Action.svelte";
  import Bar from "@desert/svelte/catalog/foundations/bar/Bar.svelte";
  const command = (label: string) => ({ label, icon: "archive" as const, state: "ready" as const, intent: { kind: "journey" as const, journey: label } });
</script>
<main style="display:grid;grid-template-columns:minmax(0,1fr);gap:16px;padding:16px">
  <div data-case="lone"><Action label="Use another identity" icon="back" state="ready" emphasis="secondary" face="text" type="button" /></div>
  <div data-case="word"><Action label="Internationalisation" icon="open" state="ready" emphasis="primary" face="text" type="button" /></div>
  <div data-case="pair"><Bar edge="bottom" purpose="steps" identityRole="heading" trailing={[]} secondary={command("Back")}
    primary={command("Continue")} settingsPlaceholder={false} inert={false} /></div>
  <div data-case="icon"><Action label="Archive" icon="archive" state="ready" emphasis="secondary" face="icon" type="button" /></div>
</main>`;

const read = () => [...document.querySelectorAll<HTMLElement>("[data-case]")].map(host => ({
  case: host.dataset.case!, actions: [...host.querySelectorAll<HTMLElement>("[data-action]")].map(button => {
    const caption = button.querySelector<HTMLElement>("[data-button-label]")!, box = button.getBoundingClientRect();
    const node = caption.firstChild as Text, range = document.createRange(), tops = new Set<number>(), breaks: string[] = [];
    for (let at = 0; at < node.length; at++) {
      range.setStart(node, at); range.setEnd(node, at + 1);
      const top = Math.round([...range.getClientRects()].at(-1)?.top ?? -1);
      if (at && /\p{L}/u.test(node.data[at - 1]!) && /\p{L}/u.test(node.data[at]!) && !tops.has(top)) breaks.push(node.data.slice(0, at));
      tops.add(top);
    }
    range.selectNodeContents(caption);
    const text = range.getBoundingClientRect(), style = getComputedStyle(button);
    return { width: box.width, height: box.height, top: box.top, lines: tops.size, broken: breaks, font: parseFloat(getComputedStyle(caption).fontSize),
      base: parseFloat(style.fontSize), radius: style.borderTopLeftRadius, inside: text.left >= box.left - 1 && text.right <= box.right + 1 && text.bottom <= box.bottom + 1,
      clipped: caption.scrollWidth > caption.clientWidth + 1 || caption.scrollHeight > caption.clientHeight + 1, styled: caption.getAttribute("style") };
  }) }));

async function open(width: number, size: string) {
  const f = await svelteBrowser(source);
  await f.page.addStyleTag({ content: await rendererCss() });
  await f.page.setViewportSize({ width, height: 900 });
  await f.page.evaluate(async value => { document.documentElement.style.setProperty("font-size", value); await document.fonts.ready;
    for (let frame = 0; frame < 6; frame++) await new Promise(requestAnimationFrame); }, size);
  return f;
}

test("at 320px and 200% a label wraps between words, a too-wide word shrinks its label to fit whole, the pair keeps one size", { timeout: 60000 }, async () => {
  const f = await open(320, "200%");
  try {
    const first = await f.page.evaluate(read);
    for (let frame = 0; frame < 10; frame++) await f.page.evaluate(() => new Promise(requestAnimationFrame));
    const cases = Object.fromEntries((await f.page.evaluate(read)).map(item => [item.case, item.actions]));
    assert.deepEqual(Object.values(cases).flat().map(action => action.font), first.flatMap(item => item.actions).map(action => action.font),
      "the label size is stable: a smaller label never narrows its button into a smaller label still");
    for (const [name, actions] of Object.entries(cases)) for (const action of name === "icon" ? [] : actions) {
      assert.deepEqual(action.broken, [], `${name}: a word breaks only between words`);
      assert.ok(action.inside && !action.clipped, `${name}: the whole label is drawn inside its button`);
      assert.equal(action.radius, "12px", `${name}: the control's radius, however tall the button grows`);
    }
    const lone = cases.lone![0]!, word = cases.word![0]!, [back, next] = cases.pair! as [typeof lone, typeof lone];
    assert.ok(lone.lines >= 2 && lone.font === lone.base && lone.height > 60, `a long label wraps at its full size and its button grows (${lone.lines} lines, ${lone.height}px)`);
    assert.ok(word.lines === 1 && word.font < word.base && word.font >= word.base / 2, `a word wider than its line fits whole at a smaller size (${word.font}px)`);
    assert.equal(back.font, next.font, "the pair's halves draw one label size");
    assert.ok(next.font < next.base, "«Continue» cannot fit half the row at full size, so the pair draws it smaller");
    assert.ok(Math.abs(back.width - next.width) <= .5 && Math.abs(back.height - next.height) <= .5 && Math.abs(back.top - next.top) <= .5,
      "the pair keeps one width, one height and one top");
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("at 390px and 100% every label keeps its size and its one line, and nothing is styled", { timeout: 60000 }, async () => {
  const f = await open(390, "100%");
  try {
    for (const item of await f.page.evaluate(read)) for (const action of item.actions) {
      if (item.case === "icon") continue;
      assert.ok(!action.styled && action.font === action.base, `${item.case}: no label is resized`);
      assert.equal(action.lines, 1, `${item.case}: one line`);
      assert.equal(Math.round(action.height), 44, `${item.case}: the control height`);
    }
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
