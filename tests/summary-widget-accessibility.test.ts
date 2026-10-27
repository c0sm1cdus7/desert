import assert from 'node:assert/strict';
import test from 'node:test';
import { svelteBrowser } from './fixtures/svelte-browser.ts';
import { rendererCss } from './fixtures/renderer-css.ts';

test('summary widget describes rendered metrics and connection state without replacing its action name', async () => {
  const f = await svelteBrowser(`<script>
    import SummaryWidget from '@desert/svelte/catalog/compositions/summary-widget/SummaryWidget.svelte';
    let state = $state(0);
    let visits = $state(0);
    const ready = {
      version:'desert.bank-node/1', kind:'collection', object:'task', fields:['status'],
      labels:{'task.status':'Status'}, loaded:true, disabled:false, selectedId:null, connection:'online',
      records:[{id:'a',version:1,facts:{status:'open'}},{id:'b',version:1,facts:{status:'open'}},
        {id:'c',version:1,facts:{status:'completed'}}],
      presentation:{kind:'summary-widget',title:'Tasks',description:'Your work at a glance.',totalLabel:'Tasks',
        field:'status',segments:[{value:'open',label:'Open'},{value:'completed',label:'Completed'}]}
    };
    const states = [{...ready,loaded:false,records:[]},ready,{...ready,connection:'offline'},
      {...ready,loaded:false,records:[],connection:'offline'},
      {...ready,presentation:{...ready.presentation,truncated:true}}];
  </script>
  <SummaryWidget node={states[state]} activate={()=>visits++} />
  <SummaryWidget node={ready} activate={()=>{}} />
  <button onclick={()=>state++}>Next state</button>
  <output>{visits}</output>`, {}, undefined, { initialCss: await rendererCss() });
  try {
    const cdp = await f.page.context().newCDPSession(f.page);
    const widgets = f.page.getByRole('button', { name: 'Open Tasks', exact: true });
    assert.equal(await widgets.count(), 2);
    const expected = [
      /^Loading summary…$/,
      /^3 Tasks 2 Open 1 Completed$/,
      /^3 Tasks 2 Open 1 Completed Offline · Last loaded summary$/,
      /^Reconnect to load this summary\. Offline · Controller unavailable$/,
      /^3 Tasks 2 Open 1 Completed Showing the first 3 items\.$/,
    ];
    for (const [index, description] of expected.entries()) {
      if (index) await f.page.getByRole('button', { name: 'Next state', exact: true }).click();
      const { nodes } = await cdp.send('Accessibility.getFullAXTree');
      const buttons = nodes.filter(node => !node.ignored && node.role?.value === 'button' && node.name?.value === 'Open Tasks');
      assert.equal(buttons.length, 2);
      assert.match(String(buttons[0]?.description?.value).replace(/\s+/g, ' ').trim(), description);
      assert.equal(await widgets.first().getAttribute('aria-busy'), String(index === 0));
      const references = await widgets.evaluateAll(elements => elements.map(element => {
        const ids = (element.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean);
        return { ids, local: ids.every(id => {
          const target = document.getElementById(id);
          return target !== null && element.contains(target);
        }) };
      }));
      assert.ok(references.every(reference => reference.ids.length > 0 && reference.local), JSON.stringify(references));
      const ids = references.flatMap(reference => reference.ids);
      assert.equal(new Set(ids).size, ids.length, 'each rendered widget owns distinct description targets');
    }
    await widgets.first().focus();
    await f.page.keyboard.press('Enter');
    assert.equal(await f.page.locator('output').innerText(), '1');
    assert.deepEqual(f.errors, []);
  } finally {
    await f.close();
  }
});
