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
