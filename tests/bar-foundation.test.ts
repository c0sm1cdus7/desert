// Bar (slice 3, F1.9, DESIGN §3.2): the toolbar foundation built from the toolbar-layout composition. Each purpose draws
// what the composition drew for the same toolbar (pixels compared pair by pair), and it raises intents and events
// instead of taking callbacks in its content.
import test from "node:test";
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import { rendererCss } from "./fixtures/renderer-css.ts";
import { pixelDifference } from "./fixtures/pixel-difference.ts";
import { settle } from "./fixtures/parity.ts";

const source = `<script lang="ts">
  import ToolbarLayout from "@desert/svelte/catalog/compositions/toolbar-layout/ToolbarLayout.svelte";
  import Bar from "@desert/svelte/catalog/foundations/bar/Bar.svelte";
  const back = { label: "Back", icon: "back" as const, state: "ready" as const, intent: { kind: "back" as const } };
  const action = (label: string, output: string, icon: "review" | "archive" | "create" | "open" | "media" | "save") =>
    ({ label, icon, state: "ready" as const, intent: { kind: "view.output" as const, view: "notes", output } });
  const many = [action("Review", "review", "review"), action("Archive", "archive", "archive"), action("Create", "create", "create"),
    action("Open", "open", "open"), action("Media", "media", "media")];
  const save = action("Save", "save", "save");
  const top = { edge: "top" as const, title: "Weekly plan", subtitle: "Edited today", leading: back, trailing: [many[0]!], primary: save,
    availability: { state: "ready" as const, label: "Connected" } };
  const cancel = { label: "Cancel", icon: "close" as const, state: "ready" as const, intent: { kind: "close" as const } };
  const confirm = { label: "Move to Trash", icon: "archive" as const, state: "ready" as const, intent: { kind: "accept" as const } };
  let events = $state<string[]>([]);
  const note = (value: string) => { events = [...events, value]; };
  let open = $state(false), query = $state("");
  Reflect.set(window, "events", () => events);
</script>
<div style="width:640px">
  <section data-pair="top"><ToolbarLayout content={{kind:"commands",toolbar:top,invoke:()=>{}}} /></section>
  <section data-pair="top"><Bar edge="top" purpose="commands" identity={{title:top.title,subtitle:top.subtitle}} identityRole="heading"
    leading={back} trailing={top.trailing} primary={save} availability={top.availability} settingsPlaceholder={false} inert={false} /></section>
  <section data-pair="commit"><ToolbarLayout content={{kind:"commands",toolbar:{edge:"bottom",secondary:cancel,primary:confirm},invoke:()=>{}}} /></section>
  <section data-pair="commit"><Bar edge="bottom" purpose="commit" identityRole="heading" trailing={[]} secondary={cancel} primary={confirm}
    settingsPlaceholder={false} inert={false} /></section>
  <section data-pair="steps"><ToolbarLayout content={{kind:"commands",toolbar:{edge:"bottom",navigation:"steps",secondary:back,primary:save},invoke:()=>{}}} /></section>
  <section data-pair="steps"><Bar edge="bottom" purpose="steps" identityRole="heading" trailing={[]} secondary={back} primary={save}
    settingsPlaceholder={false} inert={false} /></section>
  <section data-pair="navigation"><ToolbarLayout identity={{title:"Notebook",subtitle:"Your writing"}} content={{kind:"actions",actions:[],onevent:()=>{}}} /></section>
  <section data-pair="navigation"><Bar edge="top" purpose="navigation" identity={{title:"Notebook",subtitle:"Your writing"}} identityRole="heading"
    trailing={[]} settingsPlaceholder={false} inert={false} /></section>
  <section data-pair="place" style="position:relative;height:72px"><ToolbarLayout layer="content" identity={{title:"Places",subtitle:"Explore places."}} identityRole="continuation"
    content={{kind:"place-navigation",detail:true,onback:()=>{},topActions:[many[0]!],invoke:()=>{},searchAvailable:true}} /></section>
  <section data-pair="place" style="position:relative;height:72px"><Bar edge="top" purpose="commands" layer="content" identity={{title:"Places",subtitle:"Explore places."}}
    identityRole="continuation" leading={back} trailing={[many[0]!]} search={{title:"Places",query:"",open:false,resultsId:"r"}}
    settingsPlaceholder={false} inert={false} /></section>
  <section data-pair="search" style="position:relative;height:72px"><ToolbarLayout layer="search" searching={false} edge="top"
    content={{kind:"search",title:"Places",query:"",onquery:()=>{},searching:false,resultsId:"r",onsearch:()=>{},oncancel:()=>{}}} /></section>
  <section data-pair="search" style="position:relative;height:72px"><Bar edge="top" purpose="commands" layer="search" identityRole="heading" trailing={[]}
    search={{title:"Places",query:"",open:false,resultsId:"r"}} settingsPlaceholder={false} inert={false} /></section>
</div>
<div style="width:300px">
  <section data-pair="overflow"><ToolbarLayout content={{kind:"commands",toolbar:{edge:"top",title:"A deliberately descriptive place title",trailing:many},invoke:()=>{}}} /></section>
  <section data-pair="overflow"><Bar edge="top" purpose="commands" identity={{title:"A deliberately descriptive place title"}} identityRole="heading"
    trailing={many} settingsPlaceholder={false} inert={false} /></section>
</div>
<div data-behaviour style="width:640px">
  <Bar edge="top" purpose="commands" identity={{title:"Notes"}} identityRole="heading" leading={back} trailing={[many[0]!]}
    primary={{...save, submit: "edit-note"}} settingsPlaceholder={false} inert={false} oninvoke={intent => note(JSON.stringify(intent))} />
  <Bar edge="top" purpose="commands" identityRole="heading" trailing={[]} layer="search" search={{title:"Notes",query,open,resultsId:"results"}}
    settingsPlaceholder={false} inert={false} onquery={value => { query = value; note("query:" + value); }}
    onsearchopen={() => { open = true; note("open"); }} onsearchcancel={() => { open = false; note("cancel"); }} />
  <Bar edge="bottom" purpose="navigation" identityRole="heading" trailing={[]} navigationToggle={{expanded:false,controls:"panel"}}
    settingsPlaceholder={true} inert={false} onnavigationtoggle={() => note("toggle")} />
</div>`;

test("each purpose draws the pixels the toolbar-layout composition drew for the same toolbar", { timeout: 60000 }, async () => {
  const f = await svelteBrowser(source);
  try {
    await f.page.addStyleTag({ content: await rendererCss() });
    await f.page.emulateMedia({ reducedMotion: "reduce" });
    await f.page.setViewportSize({ width: 1000, height: 1400 });
    await f.page.evaluate(async () => { await document.fonts.ready; });
    // The stylesheet arrives after mount: the controls' color transitions (not motion, so not reduced) run from the
    // unstyled ink, and a pair shot mid-transition differs. Every transition finishes before the first shot.
    await settle(f.page);
    for (const pair of ["top", "commit", "steps", "navigation", "overflow", "place", "search"]) {
      const [before, after] = [f.page.locator(`[data-pair="${pair}"]`).nth(0), f.page.locator(`[data-pair="${pair}"]`).nth(1)];
      const [a, b] = [await before.boundingBox(), await after.boundingBox()];
      assert.deepEqual([b?.width, b?.height], [a?.width, a?.height], `${pair}: same box`);
      const shots = [await before.screenshot(), await after.screenshot()];
      if (process.env.BAR_SHOTS) for (const [index, shot] of shots.entries()) await writeFile(`${process.env.BAR_SHOTS}/${pair}-${index}.png`, shot);
      // The search toggle's glyph is drawn by Action's Icon instead of the vendor toggle's own svg: the same glyph at the
      // same place, antialiased differently (a few pixels by a few levels). Every other pair is byte-identical.
      if (pair === "search") assert.deepEqual(await pixelDifference(f.page, shots[0]!, shots[1]!, 8), { count: 0, within: true }, pair);
      else assert.ok(shots[0]!.equals(shots[1]!), `${pair}: same pixels`);
    }
    const overflow = f.page.locator('[data-pair="overflow"]');
    assert.equal(await overflow.nth(1).locator("[data-toolbar-overflow]").count(), 1, "the narrow rail overflows into one menu");
    assert.equal(await overflow.nth(1).locator("[data-toolbar-command]").count(), await overflow.nth(0).locator("[data-toolbar-command]").count());
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("commands raise their intent; a submit command submits its form instead", { timeout: 30000 }, async () => {
  const f = await svelteBrowser(source);
  try {
    const bar = f.page.locator("[data-behaviour]");
    await bar.getByRole("button", { name: "Back", exact: true }).click();
    await bar.getByRole("button", { name: "Review", exact: true }).click();
    assert.equal(await bar.getByRole("button", { name: "Save", exact: true }).getAttribute("type"), "submit");
    await bar.getByRole("button", { name: "Save", exact: true }).click();
    assert.deepEqual(await f.page.evaluate(() => Reflect.get(window, "events")()),
      ['{"kind":"back"}', '{"kind":"view.output","view":"notes","output":"review"}']);
  } finally { await f.close(); }
});

test("the search toggle opens the field and focuses it, typing raises the query, and the toggle closes it", { timeout: 30000 }, async () => {
  const f = await svelteBrowser(source);
  try {
    const bar = f.page.locator("[data-behaviour] [data-catalog-toolbar]");
    const toggle = bar.getByRole("button", { name: "Search", exact: true });
    assert.equal(await toggle.getAttribute("aria-expanded"), "false");
    await toggle.click();
    const field = bar.getByRole("searchbox");
    await f.page.waitForFunction(() => document.activeElement?.getAttribute("type") === "search");
    assert.equal(await field.getAttribute("aria-controls"), "results");
    await f.page.keyboard.type("pl");
    const close = bar.getByRole("button", { name: "Close search", exact: true });
    assert.equal(await close.getAttribute("aria-expanded"), "true");
    await close.click();
    assert.deepEqual(await f.page.evaluate(() => Reflect.get(window, "events")()), ["open", "query:p", "query:pl", "cancel"]);
    assert.equal(await bar.locator("[data-catalog-search]").getAttribute("aria-hidden"), "true");
  } finally { await f.close(); }
});

test("the navigation bar raises its toggle and shows the unavailable settings placeholder", { timeout: 30000 }, async () => {
  const f = await svelteBrowser(source);
  try {
    const bar = f.page.locator('[data-behaviour] [data-toolbar="bottom"]');
    const toggle = bar.getByRole("button", { name: "Show navigation", exact: true });
    // A disclosure (DESIGN §3.1): it names the pane it controls only while that pane is open.
    assert.deepEqual([await toggle.getAttribute("aria-expanded"), await toggle.getAttribute("aria-haspopup"), await toggle.getAttribute("aria-controls")],
      ["false", "dialog", null]);
    await toggle.click();
    assert.deepEqual(await f.page.evaluate(() => Reflect.get(window, "events")()), ["toggle"]);
    assert.equal(await bar.getByRole("button", { name: "Settings", exact: true }).isDisabled(), true);
  } finally { await f.close(); }
});

test("a message identity reserves no action targets: the bar draws its own message geometry", { timeout: 30000 }, async () => {
  const f = await svelteBrowser(`<script lang="ts">
  import Bar from "@desert/svelte/catalog/foundations/bar/Bar.svelte";
</script>
<Bar edge="top" purpose="commands" identity={{title:"Move note to Trash?"}} identityRole="message"
  leading={{label:"Back",icon:"back",state:"ready",intent:{kind:"back"}}} trailing={[]} settingsPlaceholder={false} inert={false} />`);
  try {
    await f.page.addStyleTag({ content: await rendererCss() });
    const bar = f.page.locator('[data-toolbar="top"]');
    assert.deepEqual(await bar.evaluate(element => [getComputedStyle(element).paddingBottom,
      getComputedStyle(element.querySelector(".toolbar-row")!).minHeight]), ["0px", "0px"]);
    assert.equal(await bar.getByRole("button", { name: "Back" }).count(), 0, "a message has no navigation");
    assert.equal(await bar.getByRole("heading", { name: "Move note to Trash?" }).count(), 1);
  } finally { await f.close(); }
});

// A bar's Actions take its target through their typed placement (Action's `bar`), never through the bar's stylesheet:
// at twice the text, a command is a square at the toolbar target, a commit keeps one line, the two steps share their
// row, and every one is as tall as the toolbar target (more than 44px there).
test("a bar's Actions take its target at any text size through their typed placement", { timeout: 30000 }, async () => {
  const f = await svelteBrowser(`<script lang="ts">
  import Bar from "@desert/svelte/catalog/foundations/bar/Bar.svelte";
  const command = (label: string) => ({ label, icon: "archive" as const, state: "ready" as const, intent: { kind: "journey" as const, journey: label } });
</script>
<div style="width:640px">
  <Bar edge="top" purpose="commands" identity={{title:"Notes"}} identityRole="heading" leading={{label:"Back",icon:"back",state:"ready",intent:{kind:"back"}}}
    trailing={[command("Archive")]} settingsPlaceholder={false} inert={false} />
  <Bar edge="bottom" purpose="commit" identityRole="heading" trailing={[]} secondary={command("Keep")} primary={command("Move to Trash")}
    settingsPlaceholder={false} inert={false} />
  <Bar edge="bottom" purpose="steps" identityRole="heading" trailing={[]} secondary={command("Back")} primary={command("Continue")}
    settingsPlaceholder={false} inert={false} />
</div>`);
  try {
    await f.page.addStyleTag({ content: await rendererCss() });
    await f.page.evaluate(() => document.documentElement.style.setProperty("--text-scale", "2"));
    const placements = await f.page.locator("[data-action]").evaluateAll(buttons => buttons.map(button => {
      const style = getComputedStyle(button), box = button.getBoundingClientRect();
      const target = getComputedStyle(button.closest('[data-piece="toolbar"]')!).getPropertyValue("--toolbar-target");
      const probe = document.createElement("div"); probe.style.height = target; button.closest('[data-piece="toolbar"]')!.append(probe);
      const targetPx = probe.getBoundingClientRect().height; probe.remove();
      return { placement: button.getAttribute("data-action-bar"), height: Math.round(box.height) === Math.round(targetPx), tall: targetPx > 44,
        width: Math.round(box.width), square: Math.round(box.width) === Math.round(box.height), wrap: style.whiteSpace };
    }));
    assert.deepEqual(placements.map(item => item.placement), ["command", "command", "commit", "commit", "step", "step"]);
    for (const item of placements) assert.ok(item.height && item.tall, `${item.placement}: as tall as the toolbar target (more than 44px at twice the text)`);
    assert.deepEqual(placements.slice(0, 2).map(item => item.square), [true, true], "a command is a square");
    assert.deepEqual(placements.slice(2, 4).map(item => item.wrap), ["nowrap", "nowrap"], "a commit keeps one line");
    assert.equal(placements[4]!.width, placements[5]!.width, "the two steps share their row");
    const css = (await (await import("node:fs/promises")).readFile("src/svelte/catalog/foundations/bar/bar.css", "utf8")).replace(/\/\*[\s\S]*?\*\//g, "");
    for (const rule of css.match(/[^{}]*(?:data-slot="button"|(?<![-\w])button(?![-\w]))[^{}]*\{/g) ?? [])
      assert.match(rule, /\.toolbar-row:not\(\[data-bar-row\]\)/, `no bar rule on buttons reaches a bar's Actions: ${rule.trim()}`);
    assert.equal(await f.page.locator('[data-piece="toolbar"] > .toolbar-row:not([data-bar-row])').count(), 0, "every row a bar draws is marked");
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
