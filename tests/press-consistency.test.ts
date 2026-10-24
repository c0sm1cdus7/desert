import assert from "node:assert/strict";
import test from "node:test";
import { mkdir, writeFile } from "node:fs/promises";
import type { Locator, Page } from "playwright";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import { rendererCss } from "./fixtures/renderer-css.ts";

const variants = ["default", "secondary", "outline", "ghost", "destructive", "link"];
const source = `<script lang="ts">
  import { Button } from "@desert/svelte/vendor/components/ui/button/index.js";
  import * as Sidebar from "@desert/svelte/vendor/components/ui/sidebar/index.js";
  import * as Calendar from "@desert/svelte/vendor/components/ui/calendar/index.js";
  import Plus from "@lucide/svelte/icons/plus";
  import { CalendarDate } from "@internationalized/date";
  import Action from "@desert/svelte/catalog/foundations/action/Action.svelte";
  import SelectControl from "@desert/svelte/catalog/compositions/select-control/SelectControl.svelte";
  import PopoverControl from "@desert/svelte/catalog/compositions/popover-control/PopoverControl.svelte";
  import { applyControlEvent } from "@desert/interaction/control-nodes.ts";
  let popover = $state({version:'desert.control/1',kind:'popover',id:'help',label:'Popover action',disabled:false,
    open:false,title:'Help',locked:false,content:[{kind:'text',text:'Contextual information.'}]});
  const select = {version:'desert.control/1',kind:'select',id:'delivery',label:'Delivery',disabled:false,required:true,
    value:'collect',options:[{value:'collect',label:'Collect',disabled:false},{value:'ship',label:'Ship',disabled:false}]};
</script>
<main style="padding:24px;display:flex;flex-wrap:wrap;align-items:start;gap:12px;max-width:1100px">
  {#each ${JSON.stringify(variants)} as variant}
    <Button {variant} data-probe={variant+'-text'}>Save changes</Button>
    <Button {variant} size="icon" aria-label={variant+' icon'} data-probe={variant+'-icon'}><Plus /></Button>
  {/each}
  <div data-case="action-label"><Action label="Action label" icon="save" state="ready" emphasis="secondary" face="fit" type="button" /></div>
  <div data-case="action-icon" style="width:44px"><Action label="An intentionally long compact action" icon="save" state="ready" emphasis="secondary" face="fit" type="button" /></div>
  <Button disabled data-probe="disabled">Disabled action</Button>
  <div data-case="pending"><Action label="Saving" icon="save" state="pending" emphasis="secondary" face="fit" type="button" /></div>
  <Sidebar.Provider style="min-height:0;width:320px;display:block">
    <Sidebar.Trigger data-probe="sidebar-trigger" onclick={event=>event.preventDefault()} />
    <Sidebar.Menu><Sidebar.MenuItem><Sidebar.MenuButton data-probe="sidebar-standard"><Plus /><span>Destination</span></Sidebar.MenuButton></Sidebar.MenuItem>
      <Sidebar.MenuItem><Sidebar.MenuButton data-probe="sidebar-custom-button">{#snippet child({props})}<Button {...props} variant="row"><Plus /><span>Custom button</span></Button>{/snippet}</Sidebar.MenuButton></Sidebar.MenuItem>
      <Sidebar.MenuItem><Sidebar.MenuButton data-probe="sidebar-custom-raw">{#snippet child({props})}<a {...props} href="#target" onclick={event=>event.preventDefault()}><Plus /><span>Custom raw link</span></a>{/snippet}</Sidebar.MenuButton></Sidebar.MenuItem>
    </Sidebar.Menu>
  </Sidebar.Provider>
  <div data-case="select-control" style="width:250px"><SelectControl node={select} onevent={()=>{}} /></div>
  <div data-case="popover-control"><PopoverControl node={popover} onevent={event=>popover=applyControlEvent(popover,event).node} /></div>
  <div data-case="calendar" style="width:320px"><Calendar.Calendar type="single" placeholder={new CalendarDate(2026,10,16)} /></div>
  {#each ['button','raw'] as custom}
    <div data-case={'calendar-custom-'+custom} style="width:320px"><Calendar.Calendar type="single" placeholder={new CalendarDate(2026,10,16)}>
      {#snippet day()}<Calendar.Day>{#snippet child({props,day})}
        {#if custom==='button'}<Button {...props} variant="row">{day}</Button>{:else}<button {...props}><span>{day}</span></button>{/if}
      {/snippet}</Calendar.Day>{/snippet}
    </Calendar.Calendar></div>
  {/each}
</main>`;
const css = rendererCss();
const settle = (page: Page) => page.evaluate(async () => {
  await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  await Promise.all(document.getAnimations().filter(animation => animation.effect?.getComputedTiming().iterations !== Infinity)
    .map(animation => animation.finished.catch(() => {})));
});
const appearance = (node: Locator) => node.evaluate(element => {
  const style = getComputedStyle(element), content = element.querySelector(":scope > [data-button-content]")
    ?? (element.matches('[data-slot="sidebar-menu-button"]') ? element.firstElementChild : null);
  const glyph = element.querySelector("svg"), label = element.querySelector("[data-button-label]");
  return { box: element.getBoundingClientRect().toJSON(), transform: style.transform, background: style.backgroundColor,
    overlay: style.backgroundImage, material:(element.classList.contains('material-pane') ? 'pane' : element.classList.contains('material-interior') ? 'interior' : null), selected:element.hasAttribute('data-selected'),
    pressed: element.getAttribute("data-pressed"), focused: element === document.activeElement,
    contentScale: content ? new DOMMatrix(getComputedStyle(content).transform).m11 : null,
    contentBox: content?.getBoundingClientRect().toJSON() ?? null, glyphBox: glyph?.getBoundingClientRect().toJSON() ?? null,
    labelBox: label?.getBoundingClientRect().toJSON() ?? null, face: element.getAttribute("data-action-face") };
});
function target(page: Page, name: string) {
  if (name === "calendar-next") return page.locator('[data-case="calendar"] [data-calendar-next-button]');
  if (name.startsWith("calendar-day")) return page.locator(`[data-case="${name === "calendar-day" ? "calendar" : name.replace("-day", "")}"] [data-calendar-day]`).nth(15);
  if (["action-label", "action-icon", "pending", "select-control", "popover-control"].includes(name))
    return page.locator(`[data-case="${name}"] button`).first();
  return page.locator(`[data-probe="${name}"]`);
}
const names = [...variants.flatMap(variant => [`${variant}-text`, `${variant}-icon`]), "action-label", "action-icon",
  "sidebar-trigger", "sidebar-standard", "sidebar-custom-button", "sidebar-custom-raw",
  "select-control", "popover-control", "calendar-next", "calendar-day", "calendar-day-custom-button", "calendar-day-custom-raw"];
const customRaw = (name: string) => name.endsWith("custom-raw");
const opening = (name: string) => name === "select-control" || name === "popover-control";
async function save(name: string, evidence: unknown) {
  const directory = `artifacts/press-consistency/${process.env.DESERT_PRESS_PHASE ?? "current"}`;
  await mkdir(directory, { recursive: true });
  await writeFile(`${directory}/${name}.json`, JSON.stringify(evidence, null, 2));
}

for (const motion of ["no-preference", "reduce"] as const) for (const input of ["pointer", "Enter", "Space"] as const) {
  test(`${motion} ${input}: press feedback matrix separates paint, content and hitbox`, { timeout: 30000 }, async t => {
    const f = await svelteBrowser(source), evidence: Record<string, unknown> = {}, failures: string[] = [];
    try {
      await f.page.setViewportSize({ width: 1280, height: 1100 });
      await f.page.addStyleTag({ content: await css }); await f.page.emulateMedia({ reducedMotion: motion }); await settle(f.page);
      for (const name of names) {
        const button = target(f.page, name); await button.scrollIntoViewIfNeeded();
        await f.page.mouse.move(1200, 1000);
        if (input === "pointer") await button.hover(); else await button.focus();
        await settle(f.page); const before = await appearance(button);
        if (input === "pointer") await f.page.mouse.down(); else await f.page.keyboard.down(input);
        const immediate = await appearance(button); await settle(f.page); const held = await appearance(button);
        if (input === "pointer") await f.page.mouse.up(); else await f.page.keyboard.up(input);
        await settle(f.page); const released = await appearance(button);
        if (opening(name)) { await f.page.keyboard.press("Escape"); await settle(f.page); }
        const focusTransferred = input !== "pointer" && opening(name) && !held.focused;
        evidence[name] = { before, immediate, held, released, focusTransferred };
        const sameBox = ["x", "y", "width", "height"].every(key => Math.abs(before.box[key] - held.box[key]) < .1);
        if (!sameBox || held.transform !== "none") failures.push(`${name}: interactive hitbox moved`);
        if (customRaw(name) && name !== 'sidebar-custom-raw') { t.diagnostic(`${name}: custom calendar markup has no shared content wrapper; content=${held.contentScale}, pressed=${held.pressed}`); continue; }
        if (focusTransferred) {
          assert.equal(held.pressed, null, "Actual focus transfer cancels keyboard feedback, like any genuine blur");
          assert.equal(held.contentScale, 1); t.diagnostic(`${name}: keyboard feedback cancelled after opening moved focus`); continue;
        }
        const expected = motion === "reduce" ? 1 : .96;
        if (held.contentScale === null || Math.abs(held.contentScale - expected) > .001)
          failures.push(`${name}: held scale=${held.contentScale}; pressed=${held.pressed}; focused=${held.focused}`);
        const selectedDuringKeydown = name === 'calendar-day' && !before.selected && held.selected;
        if (held.overlay !== before.overlay || (!selectedDuringKeydown && held.background !== before.background))
          failures.push(`${name}: press repainted the shared material`);
        if (selectedDuringKeydown) {
          assert.equal(held.material,'pane','selection changes an interior day into a selected pane, not a held overlay');
          assert.equal(released.background,held.background,'selection survives key release');
        }
        if (held.pressed === null) failures.push(`${name}: no held state feedback`);
        if (released.contentScale !== 1 || released.pressed !== null) failures.push(`${name}: did not release feedback`);
      }
      for (const name of ["disabled", "pending"]) {
        const button = target(f.page, name); await button.scrollIntoViewIfNeeded(); await f.page.mouse.move(1200, 1000);
        await settle(f.page); const before = await appearance(button), box = before.box;
        await f.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await f.page.mouse.down();
        await settle(f.page); const held = await appearance(button); await f.page.mouse.up();
        assert.equal(await button.isDisabled(), true); assert.equal(held.pressed, null); assert.equal(held.contentScale, 1);
        assert.equal(held.overlay, before.overlay); assert.deepEqual(held.box, before.box); evidence[name] = { before, held };
      }
      await save(`${motion}-${input}`, { failures, evidence }); t.diagnostic(JSON.stringify(failures));
      assert.deepEqual(f.errors, []); assert.deepEqual(failures, []);
    } finally { await f.page.mouse.up().catch(() => {}); await f.page.keyboard.up(input === "pointer" ? "Enter" : input).catch(() => {}); await f.close(); }
  });
}

for (const input of ["pointer", "Enter"] as const) test(`fast ${input}: actual opening controls retain observable feedback evidence`, async t => {
  const f = await svelteBrowser(source), evidence: Record<string, unknown> = {};
  try {
    await f.page.setViewportSize({ width: 1280, height: 1100 }); await f.page.addStyleTag({ content: await css });
    for (const name of ["secondary-text", "select-control", "popover-control"]) {
      const button = target(f.page, name); await button.scrollIntoViewIfNeeded();
      if (input === "pointer") await button.hover(); else await button.focus();
      await settle(f.page); const before = await appearance(button);
      if (input === "pointer") await f.page.mouse.down(); else await f.page.keyboard.down(input);
      await f.page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => resolve())));
      const firstFrame = await appearance(button);
      if (input === "pointer") await f.page.mouse.up(); else await f.page.keyboard.up(input);
      await settle(f.page); const released = await appearance(button);
      evidence[name] = { before, firstFrame, released };
      if (opening(name)) { await f.page.keyboard.press("Escape"); await settle(f.page); }
      t.diagnostic(`${name}: scale after first frame=${firstFrame.contentScale}, pressed=${firstFrame.pressed}, focused=${firstFrame.focused}`);
    }
    await save(`fast-${input}`, evidence); assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
