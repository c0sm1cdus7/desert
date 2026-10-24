import assert from "node:assert/strict";
import test from "node:test";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";

test("browser lifecycle consumes invitation once, protects live drafts, and disposes its subscription", async () => {
  const f = await svelteBrowser(`<script>
    import {mountBrowserSession} from '@desert/web/client/browser-session.ts';
    let draft={}, prepared=null, subscriber;
    let starts=$state([]), changes=$state(0), stopped=$state(false), unsubscribed=$state(false);
    const model={snapshot:()=>({state:{draft,prepared}}),
      subscribe:listener=>{subscriber=listener;return()=>{unsubscribed=true;}},
      start:async invitation=>{starts=[...starts,invitation]}, stop:()=>{stopped=true;}};
    history.replaceState(null,'','?keep=1#access=one-use');
    const dispose=mountBrowserSession(model,()=>changes++);
    function change(value){draft=value;subscriber();}
  </script>
  <button onclick={()=>change({title:'Unsent'})}>Draft</button>
  <button onclick={()=>change({})}>Clear</button>
  <button onclick={()=>{prepared={id:'pending'};subscriber();}}>Prepared</button>
  <button onclick={dispose}>Dispose</button>
  <output>{JSON.stringify({starts,changes,stopped,unsubscribed})}</output>`, {}, 'http://session.test/');
  try {
    const state = async () => JSON.parse((await f.page.locator('output').textContent())!);
    const protectedDraft = () => f.page.evaluate(() => {
      const event = new Event('beforeunload', { cancelable: true });
      window.dispatchEvent(event); return event.defaultPrevented;
    });
    assert.equal(f.page.url(), 'http://session.test/?keep=1');
    assert.deepEqual((await state()).starts, ['one-use']);
    assert.equal(await protectedDraft(), false);
    await f.page.getByRole('button', { name: 'Draft', exact: true }).click();
    assert.equal(await protectedDraft(), true);
    await f.page.getByRole('button', { name: 'Clear', exact: true }).click();
    assert.equal(await protectedDraft(), false);
    await f.page.getByRole('button', { name: 'Prepared', exact: true }).click();
    assert.equal(await protectedDraft(), true);
    await f.page.getByRole('button', { name: 'Dispose', exact: true }).click();
    assert.equal(await protectedDraft(), false);
    assert.deepEqual(await state(), { starts: ['one-use'], changes: 3, stopped: true, unsubscribed: true });
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

// DESIGN §8 Q3: AccessGate's lifecycle, moved out of the composition into the session module.
test("access lifecycle consumes the invitation once, refreshes while visible when the page returns to view, and disposes", async () => {
  const f = await svelteBrowser(`<script>
    import {mountAccessSession} from '@desert/web/client/browser-session.ts';
    let subscriber;
    let starts=$state([]), changes=$state(0), refreshes=$state(0), stopped=$state(false), unsubscribed=$state(false);
    const client={subscribe:listener=>{subscriber=listener;return()=>{unsubscribed=true;}},
      start:async invitation=>{starts=[...starts,invitation]}, refresh:async()=>{refreshes++;}, stop:()=>{stopped=true;}};
    history.replaceState(null,'','?keep=1#access=one-use');
    const dispose=mountAccessSession(client,()=>changes++);
  </script>
  <button onclick={()=>subscriber()}>Change</button>
  <button onclick={dispose}>Dispose</button>
  <output>{JSON.stringify({starts,changes,refreshes,stopped,unsubscribed})}</output>`, {}, 'http://session.test/');
  try {
    const state = async () => JSON.parse((await f.page.locator('output').textContent())!);
    const visibility = (value: string) => f.page.evaluate(next => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => next });
      document.dispatchEvent(new Event('visibilitychange'));
    }, value);
    assert.equal(f.page.url(), 'http://session.test/?keep=1');
    assert.deepEqual(await state(), { starts: ['one-use'], changes: 0, refreshes: 0, stopped: false, unsubscribed: false });
    await f.page.getByRole('button', { name: 'Change', exact: true }).click();
    await f.page.evaluate(() => window.dispatchEvent(new Event('focus')));
    assert.deepEqual(await state(), { starts: ['one-use'], changes: 1, refreshes: 1, stopped: false, unsubscribed: false });
    await visibility('hidden');
    await f.page.evaluate(() => window.dispatchEvent(new Event('focus')));
    assert.equal((await state()).refreshes, 1, 'a hidden page does not refresh');
    await visibility('visible');
    assert.equal((await state()).refreshes, 2, 'becoming visible refreshes');
    await f.page.getByRole('button', { name: 'Dispose', exact: true }).click();
    await f.page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await visibility('visible');
    assert.deepEqual(await state(), { starts: ['one-use'], changes: 1, refreshes: 2, stopped: true, unsubscribed: true });
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("access lifecycle refreshes every five seconds while the page is visible", async () => {
  const f = await svelteBrowser(`<script>
    import {mountAccessSession} from '@desert/web/client/browser-session.ts';
    let refreshes=$state(0), dispose=null;
    const client={subscribe:()=>()=>{}, start:async()=>{}, refresh:async()=>{refreshes++;}, stop:()=>{}};
    window.session={mount:()=>{dispose=mountAccessSession(client,()=>{});}, dispose:()=>dispose?.()};
  </script><output>{refreshes}</output>`, {}, 'http://session.test/');
  try {
    const refreshes = async () => Number(await f.page.locator('output').textContent());
    const session = (step: "mount" | "dispose") => f.page.evaluate(name => (window as unknown as { session: Record<string, () => void> }).session[name]!(), step);
    await f.page.clock.install();
    await session("mount");
    // The installed clock still flows in real time between steps: leave it a margin below five seconds.
    await f.page.clock.runFor(4900);
    assert.equal(await refreshes(), 0);
    await f.page.clock.runFor(100);
    assert.equal(await refreshes(), 1);
    await f.page.clock.runFor(10000);
    assert.equal(await refreshes(), 3);
    await session("dispose");
    await f.page.clock.runFor(20000);
    assert.equal(await refreshes(), 3, 'disposing stops the timer');
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
