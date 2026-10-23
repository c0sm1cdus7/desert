import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { svelteBrowser } from './fixtures/svelte-browser.ts';
import { rendererCss } from './fixtures/renderer-css.ts';
import { paneFamilySource } from './fixtures/pane-family.ts';

const owners='[data-sidebar="sidebar"],.field-well,[data-grouped-panel],[data-primitive="action"],[data-slot="badge"],[data-slot="popover-content"],[data-slot="dialog-content"]';

test('S1 all independent panes share material, with primary tint only for prominent actions', async()=>{
  const f=await svelteBrowser(paneFamilySource);
  try {
    await f.page.addStyleTag({content:await rendererCss()});
    await f.page.emulateMedia({reducedMotion:'reduce'});
    for(const theme of ['light','dark']) for(const state of ['ready','disabled','invalid','pending']) {
      await f.page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);
      await f.page.locator('[data-test-controls]').getByRole('button',{name:state,exact:true}).click();
      const values=await f.page.locator(owners).evaluateAll(nodes=>nodes.map(node=>{
        const s=getComputedStyle(node),canvas=new OffscreenCanvas(1,1),c=canvas.getContext('2d')!;
        c.fillStyle=s.backgroundColor;c.fillRect(0,0,1,1);
        return {name:node.getAttribute('data-slot')??node.className,primary:node.getAttribute('data-variant')==='default',fill:s.backgroundColor,alpha:c.getImageData(0,0,1,1).data[3]!/255,
          image:s.backgroundImage,blur:s.backdropFilter,border:s.borderTopWidth,borderStyle:s.borderTopStyle,borderColor:s.borderTopColor,opacity:s.opacity};
      }));
      assert.ok(values.length>=9);
      for(const value of values) {
        const label=theme+'/'+state+'/'+value.name;
        assert.ok(Math.abs(value.alpha-.88)<.005,label+' keeps shared 88% fill');
        if (value.primary) assert.notEqual(value.fill,values[0]!.fill,label+' prominent action is tinted');
        else assert.equal(value.fill,values[0]!.fill,label+' same neutral fill');
        assert.equal(value.blur,'blur(24px)',label+' blur only');
        assert.equal(value.image,'none',label+' no tinted overlay');
        assert.equal(value.border,'1px',label+' one perimeter');
        assert.equal(value.borderStyle,'solid',label);
        assert.equal(value.borderColor,values[0]!.borderColor,label+' same perimeter color');
        assert.equal(value.opacity,'1',label+' pane never dims');
      }
    }
    await f.page.getByRole('button',{name:'Open anchored',exact:true}).click();
    const portal=await f.page.locator('[data-slot="popover-content"]').evaluate(e=>getComputedStyle(e).backdropFilter);
    assert.equal(portal,'blur(24px)');
    await f.page.keyboard.press('Escape');
    await f.page.locator('[data-slot="popover-content"]').waitFor({state:'detached'});
    await f.page.getByRole('button',{name:'Open dialog',exact:true}).click();
    assert.equal(await f.page.getByRole('dialog').evaluate(e=>getComputedStyle(e).backdropFilter),'blur(24px)');
    await f.page.keyboard.press('Escape');
    // Accessibility material is measured on live panes, not an exit portal whose
    // DOM can disappear between Playwright's locator resolution and evaluation.
    await f.page.locator('[data-slot="dialog-content"]').waitFor({state:'detached'});
    for(const [name,value] of [['prefers-reduced-transparency','reduce'],['prefers-contrast','more']] as const) {
      const session=await f.page.context().newCDPSession(f.page);
      await session.send('Emulation.setEmulatedMedia',{features:[{name,value}]});
      await f.page.waitForFunction(({name,value})=>matchMedia(`(${name}:${value})`).matches,{name,value});
      for(const s of await f.page.locator(owners).evaluateAll(nodes=>nodes.map(n=>{const s=getComputedStyle(n),c=new OffscreenCanvas(1,1).getContext('2d')!;
        c.fillStyle=s.backgroundColor;c.fillRect(0,0,1,1);return {connected:n.isConnected,alpha:c.getImageData(0,0,1,1).data[3],blur:s.backdropFilter,border:s.borderTopWidth};}))) {
        assert.equal(s.connected,true,'Only live panes are material witnesses');
        assert.equal(s.blur,'none');assert.equal(s.border,'1px');
        assert.equal(s.alpha,255,'opaque accessibility fill');
      }
      await session.detach();
    }
    assert.deepEqual(f.errors,[]);
  } finally {await f.close();}
});

test('S1 material recipe has one explicit owner; legacy state tint owners are removed',async()=>{
  const material=await readFile('src/svelte/pieces/pane-material.css','utf8');
  assert.match(material,/88%/);assert.match(material,/blur\(24px\)/);
  assert.match(material,/data-material/);assert.match(material,/prefers-reduced-transparency/);
  for(const file of ['theme.css','vendor/styles/tokens.css','pieces/surface-chrome.css','pieces/anchored-surface.css','pieces/field-well.css','explorer/catalog-shell.css']) {
    const source=await readFile('src/svelte/'+file,'utf8');
    assert.doesNotMatch(source,/--(?:surface-pane|floating-pane|glass-primary|glass-action|glass-control-filter):/,file);
    assert.doesNotMatch(source,/background-image:linear-gradient\(color-mix/,file+' state overlay');
  }
});
