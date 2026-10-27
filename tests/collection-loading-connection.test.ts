import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { svelteBrowser } from './fixtures/svelte-browser.ts';
import { rendererCss } from './fixtures/renderer-css.ts';

test('collection loading, empty and offline are distinct and retained records never flash empty', {timeout:60000}, async () => {
  const f = await svelteBrowser(`<script lang="ts">
    import Collection from '@desert/svelte/catalog/compositions/collection/Collection.svelte';
    import Action from '@desert/svelte/catalog/foundations/action/Action.svelte';
    let mode = $state('loading');
    const base={version:'desert.bank-node/1',kind:'collection',object:'note',fields:['title'],labels:{'note.title':'Title'},selectedId:null};
    const node=$derived({...base,loaded:['empty','records','cached'].includes(mode),disabled:mode!=='records',
      connection:['offline','cached'].includes(mode)?'offline':mode==='loading'?'loading':'ready',
      records:['records','cached'].includes(mode)?[{id:'one',version:1,facts:{title:'Saved note'}}]:[]});
  </script>
  <main style="padding:16px">
    <nav>{#each ['loading','empty','records','offline','cached'] as state}<button onclick={()=>mode=state}>{state}</button>{/each}</nav>
    <Collection {node} select={()=>{throw new Error('Disconnected read must not invoke')}} />
    <Action label="Create note" icon="create" state="unavailable" reason="Controller unavailable. Reconnect to create a note." emphasis="secondary" face="fit" type="button" />
  </main>`, {}, undefined, {initialCss:await rendererCss()});
  try {
    for (const width of [390,1600]) {
      await f.page.setViewportSize({width,height:900});
      await f.page.emulateMedia({reducedMotion:'reduce',colorScheme:'dark'});
      await f.page.getByRole('button',{name:'loading',exact:true}).click();
      // The collection state is one labelled group whose content says which state it is (composition lane C).
      const state=(content:string)=>f.page.locator(`[role="group"][aria-label="Collection state"]:has(${content})`);
      assert.equal(await state('[data-loading="lines"]').and(f.page.locator('[aria-busy="true"]')).count(),1);
      assert.equal(await f.page.getByText('Nothing here yet.',{exact:true}).count(),0);
      assert.equal(await f.page.locator('[data-slot="skeleton"]').count(),2);
      assert.equal(await f.page.locator('[data-slot="skeleton"]').first().evaluate(el=>getComputedStyle(el).animationName),'none');
      await f.page.getByRole('button',{name:'empty',exact:true}).click();
      assert.equal(await state('[data-status="neutral"]').count(),1);
      assert.equal(await f.page.getByRole('heading',{name:'Nothing here yet.',exact:true}).count(),1);
      await f.page.getByRole('button',{name:'offline',exact:true}).click();
      assert.equal(await state('[data-status="offline"]').count(),1);
      assert.equal(await f.page.getByText('Nothing here yet.',{exact:true}).count(),0);
      await f.page.getByRole('button',{name:'cached',exact:true}).click();
      assert.ok(await f.page.getByRole('button',{name:'Saved note',exact:true}).isDisabled());
      assert.equal(await f.page.locator('[aria-label="Collection state"]').count(),0);
      const create=f.page.getByRole('button',{name:'Create note',exact:true});
      assert.ok(await create.isDisabled());
      assert.ok(await create.getAttribute('aria-describedby'));
      await f.page.getByRole('button',{name:'records',exact:true}).click();
      assert.equal(await f.page.getByRole('button',{name:'Saved note',exact:true}).isDisabled(),false);
      assert.equal(await f.page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      await f.page.getByRole('button',{name:'loading',exact:true}).click();
      await mkdir('artifacts/connection-round3',{recursive:true});
      await f.page.screenshot({path:`artifacts/connection-round3/loading-${width}.png`,fullPage:true});
    }
    assert.deepEqual(f.errors,[]);
  } finally { await f.close(); }
});
