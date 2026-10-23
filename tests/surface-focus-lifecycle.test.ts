import assert from "node:assert/strict";
import test from "node:test";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";

const source = `<script>
  import { tick } from 'svelte';
  import { surfaceFocus } from '@desert/svelte/infra/surface-focus.svelte.ts';
  let panel=$state(null), trigger=$state(null), phase=$state('open'), revision=$state(0), closes=$state(0);
  const focus=surfaceFocus(()=>panel);
  const event=kind=>new Event(kind,{cancelable:true});
  const open=()=>focus.open ? focus.open(event('open')) : focus(event('open'));
  const close=(cancel=false)=>{const e=event('close');const callback=()=>{closes++;if(cancel)e.preventDefault();};
    if(focus.close)focus.close(e,callback);else callback();if(!e.defaultPrevented)trigger.focus();};
  globalThis.focusLifecycle={repeat:open,remount:()=>{close();open();},
    close:async(cancel=false)=>{phase='closed';await tick();close(cancel);},
    reopen:async()=>{phase='open';await tick();open();},
    replace:async()=>{revision++;await tick();open();},
    late:()=>{open();document.querySelector('[data-outside]').focus();}};
</script>
<button bind:this={trigger} onclick={open}>Open</button><button data-outside>Outside</button>
{#key revision}<section bind:this={panel} tabindex="-1" data-state={phase} aria-label="Panel">
  <button>First</button><button>Last</button>
</section>{/key}<output>{closes}</output>`;

const settle = async (f: Awaited<ReturnType<typeof svelteBrowser>>) => f.page.evaluate(() =>
  new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));

test("repeated open and synthetic scope remount preserve the person's current focus", async () => {
  const f = await svelteBrowser(source);
  try {
    await f.page.getByRole("button", { name: "Open", exact: true }).press("Enter");
    await f.page.waitForFunction(() => document.activeElement?.textContent === "First");
    for (const operation of ["repeat", "remount"]) {
      await f.page.getByRole("button", { name: "Last", exact: true }).focus();
      await f.page.evaluate(operation => (globalThis as any).focusLifecycle[operation](), operation);
      await settle(f);
      assert.equal(await f.page.getByRole("button", { name: "Last", exact: true }).evaluate(node => node === document.activeElement), true);
    }
    assert.equal(await f.page.locator("output").textContent(), "0", "a live scope remount is not a close callback");
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("real close resets retained-node entry and a replacement node receives legitimate focus", async () => {
  const f = await svelteBrowser(source);
  try {
    await f.page.getByRole("button", { name: "Open", exact: true }).press("Enter");
    await f.page.waitForFunction(() => document.activeElement?.textContent === "First");
    await f.page.getByRole("button", { name: "Last", exact: true }).focus();
    await f.page.evaluate(() => (globalThis as any).focusLifecycle.close());
    assert.equal(await f.page.getByRole("button", { name: "Open", exact: true }).evaluate(node => node === document.activeElement), true);
    assert.equal(await f.page.locator("output").textContent(), "1");
    await f.page.evaluate(() => (globalThis as any).focusLifecycle.reopen());
    await settle(f);
    assert.equal(await f.page.getByRole("button", { name: "First", exact: true }).evaluate(node => node === document.activeElement), true);
    await f.page.getByRole("button", { name: "Last", exact: true }).focus();
    await f.page.evaluate(() => (globalThis as any).focusLifecycle.replace());
    await settle(f);
    assert.equal(await f.page.getByRole("button", { name: "First", exact: true }).evaluate(node => node === document.activeElement), true);
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("deferred first entry never steals focus that already moved outside", async () => {
  const f = await svelteBrowser(source);
  try {
    await f.page.getByRole("button", { name: "Open", exact: true }).focus();
    await f.page.evaluate(() => (globalThis as any).focusLifecycle.late());
    await settle(f);
    assert.equal(await f.page.getByRole("button", { name: "Outside", exact: true }).evaluate(node => node === document.activeElement), true);
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("custom close cancellation and an outside focus destination remain authoritative", async () => {
  const f = await svelteBrowser(source);
  try {
    await f.page.getByRole("button", { name: "Open", exact: true }).press("Enter");
    await f.page.waitForFunction(() => document.activeElement?.textContent === "First");
    await f.page.getByRole("button", { name: "Last", exact: true }).focus();
    await f.page.evaluate(() => (globalThis as any).focusLifecycle.close(true));
    assert.equal(await f.page.getByRole("button", { name: "Last", exact: true }).evaluate(node => node === document.activeElement), true);
    await f.page.evaluate(() => (globalThis as any).focusLifecycle.reopen());
    await settle(f);
    await f.page.getByRole("button", { name: "Outside", exact: true }).focus();
    await f.page.evaluate(() => (globalThis as any).focusLifecycle.close());
    assert.equal(await f.page.getByRole("button", { name: "Outside", exact: true }).evaluate(node => node === document.activeElement), true);
    assert.equal(await f.page.locator("output").textContent(), "2");
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("removing an open popover restores its retained opener without a synthetic reopen", async () => {
  const f = await svelteBrowser(`<script>
    import * as Popover from '@desert/svelte/vendor/components/ui/popover/index.js';
    let present=$state(true);globalThis.removePopover=()=>present=false;
  </script><Popover.Root><Popover.Trigger>Open</Popover.Trigger>
    {#if present}<Popover.Content role="dialog" aria-label="Actions"><button>First</button></Popover.Content>{/if}
  </Popover.Root>`);
  try {
    await f.page.getByRole("button", { name: "Open", exact: true }).press("Enter");
    await f.page.waitForFunction(() => document.activeElement?.textContent === "First");
    await settle(f);
    await f.page.evaluate(() => (globalThis as any).removePopover());
    await f.page.getByRole("dialog").waitFor({ state: "hidden" });
    assert.equal(await f.page.getByRole("button", { name: "Open", exact: true }).evaluate(node => node === document.activeElement), true);
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("entry before the bound element exists retains its real opener for close", async () => {
  const f = await svelteBrowser(`<script>
    import { tick } from 'svelte';import { surfaceFocus } from '@desert/svelte/infra/surface-focus.svelte.ts';
    let panel=$state(null),present=$state(false),phase=$state('open');const focus=surfaceFocus(()=>panel);
    globalThis.closeLate=async()=>{phase='closed';await tick();focus.close(new Event('close',{cancelable:true}));};
  </script><button onclick={()=>{present=true;focus.open(new Event('open',{cancelable:true}));}}>Open</button>
  {#if present}<section bind:this={panel} data-state={phase} tabindex="-1" aria-label="Late panel"><button>First</button></section>{/if}`);
  try {
    await f.page.getByRole("button", { name: "Open", exact: true }).press("Enter");
    await f.page.waitForFunction(() => document.activeElement?.textContent === "First");
    await f.page.evaluate(() => (globalThis as any).closeLate());
    assert.equal(await f.page.getByRole("button", { name: "Open", exact: true }).evaluate(node => node === document.activeElement), true);
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
