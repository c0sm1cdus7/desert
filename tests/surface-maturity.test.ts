import assert from 'node:assert/strict';
import test from 'node:test';
import { svelteBrowser } from './fixtures/svelte-browser.ts';
import { rendererCss } from './fixtures/renderer-css.ts';

const source = `<script>
import DateControl from '@desert/svelte/controls/DateControl.svelte';
let node = $state({version:'desert.control/1',kind:'date',id:'arrival',label:'Arrival date',
required:false,disabled:false,value:'2026-10-17'});
</script><main style="padding:24px"><DateControl {node} onevent={e => node={...node,value:e.value}} /></main>`;

for (const width of [390, 1024]) test(`picker focus belongs to the opening modality at ${width}`, async () => {
  const f = await svelteBrowser(source);
  try {
    await f.page.addStyleTag({content:await rendererCss()});
    await f.page.setViewportSize({width,height:900});
    await f.page.emulateMedia({reducedMotion:'reduce'});
    const trigger = f.page.locator('[data-date-trigger]');
    await trigger.click();
    const dialog = f.page.getByRole('dialog', {name:'Arrival date',exact:true});
    await dialog.waitFor();
    await f.page.waitForFunction(() => document.activeElement?.getAttribute('role') === 'dialog');
    if (width === 1024) assert.ok((await dialog.boundingBox())!.width <= 324, 'anchored calendar is compact');
    await f.page.keyboard.press('Escape');
    await dialog.waitFor({state:'hidden'});
    await f.page.keyboard.press('Enter');
    await dialog.waitFor();
    await f.page.waitForFunction(() => document.activeElement?.hasAttribute('data-calendar-day'));
    assert.equal(await f.page.locator(':focus').getAttribute('data-selected'), '');
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test('enlarged calendar keeps navigation outside its locally scrolling day grid', async () => {
  const f = await svelteBrowser(source);
  try {
    await f.page.addStyleTag({content:await rendererCss()});
    await f.page.setViewportSize({width:320,height:568});
    await f.page.emulateMedia({reducedMotion:'reduce'});
    await f.page.evaluate(() => document.documentElement.style.setProperty('--text-scale','2'));
    await f.page.locator('[data-date-trigger]').focus();
    await f.page.keyboard.press('Enter');
    await f.page.waitForFunction(() => document.activeElement?.hasAttribute('data-calendar-day'));
    const toolbar = f.page.locator('[data-date-calendar] .workspace-header');
    const before = (await toolbar.boundingBox())!;
    const day = (await f.page.locator(':focus').boundingBox())!;
    assert.ok(day.y >= before.y + before.height && day.y + day.height <= 568, 'initial day is visible below fixed chrome');
    const dates = await f.page.locator('[data-date-calendar] button[data-calendar-day]').evaluateAll(buttons => buttons.map(button => {
      const text = document.createTreeWalker(button,NodeFilter.SHOW_TEXT);
      let node: Node | null;
      while (node=text.nextNode()) if (/^\d{1,2}$/.test(node.textContent?.trim() ?? '')) {
        const range = document.createRange(); range.selectNodeContents(node);
        const glyph = range.getBoundingClientRect(), cell = button.getBoundingClientRect();
        return {label:node.textContent, room:cell.width-glyph.width};
      }
      return null;
    }));
    assert.ok(dates.length>=28 && dates.every(date=>date && date.room>=4),
      `dates keep readable spacing, not merely bounded button boxes: ${JSON.stringify(dates)}`);
    assert.ok(await f.page.locator('[data-date-calendar] button[data-calendar-day]').evaluateAll(buttons => buttons.every(button => {
      const cell=button.closest('td')!.getBoundingClientRect(), target=button.getBoundingClientRect();
      return target.left>=cell.left-0.5 && target.right<=cell.right+0.5;
    })), 'date hit targets must not extend into adjacent columns');
    await f.page.locator('[data-calendar-grid-viewport]').evaluate(el => el.scrollTop=1000);
    assert.equal((await toolbar.boundingBox())!.y, before.y);
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test('a date outside the current month opens its selected month', async () => {
  const f = await svelteBrowser(source.replace('2026-10-17','2031-03-17'));
  try {
    await f.page.addStyleTag({content:await rendererCss()});
    await f.page.locator('[data-date-trigger]').click();
    await f.page.getByRole('heading',{name:'March 2031',exact:true}).waitFor();
  } finally { await f.close(); }
});

test('optional date can be removed inside the picker without a clear accessory on the well', async () => {
  const f = await svelteBrowser(source);
  try {
    await f.page.addStyleTag({content:await rendererCss()});
    await f.page.locator('[data-date-trigger]').click();
    assert.equal(await f.page.locator('[data-date-trigger] [data-input-clear]').count(),0);
    await f.page.getByRole('button',{name:'Clear date',exact:true}).click();
    await f.page.getByRole('button',{name:'Arrival date · No date selected',exact:true}).waitFor();
    assert.deepEqual(f.errors,[]);
  } finally { await f.close(); }
});
