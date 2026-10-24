import assert from 'node:assert/strict';
import test from 'node:test';
import { publicCatalogFixture } from './public-catalog-fixture.ts';
import { navigationAction, settle } from './public-catalog-expectations.ts';

test('browser history restores place, draft and detail without leaving the application', async () => {
  const f = await publicCatalogFixture();
  try {
    const {page} = f;
    await page.setViewportSize({width:1280,height:900});
    await (await navigationAction(page,'Travel kit')).click();
    await page.getByRole('textbox',{name:'Trip name'}).fill('A trip to remember');
    await page.getByRole('button',{name:/Arrival date ·/}).click();
    await page.getByRole('dialog',{name:'Arrival date',exact:true}).waitFor();
    await page.goBack(); await settle(page);
    assert.equal(await page.getByRole('dialog',{name:'Arrival date',exact:true}).count(),0,
      'leaving a retained place dismisses its portal');
    await page.goForward(); await settle(page);
    assert.equal(await page.getByRole('textbox',{name:'Trip name'}).inputValue(),'A trip to remember');
    assert.equal(await page.getByRole('dialog',{name:'Arrival date',exact:true}).count(),0,
      'returning preserves writing, not an orphaned presentation');
    await (await navigationAction(page,'Landmarks')).click();
    await page.getByRole('button',{name:'Learn More',exact:true}).click();
    await page.locator('[data-catalog-detail] [data-place-title]').waitFor();
    await page.goBack(); await settle(page);
    assert.equal(await page.locator('[data-catalog-detail] [data-place-title]').count(),0);
    assert.equal(new URL(page.url()).origin,f.origin);
    await page.goForward();
    await page.locator('[data-catalog-detail] [data-place-title]').waitFor();
    await page.reload();
    await page.locator('[data-catalog-detail] [data-place-title]').waitFor();
    await page.getByRole('button',{name:'Back',exact:true}).click();
    await page.waitForFunction(() => !document.querySelector('[data-catalog-detail] [data-place-title]'));
  } finally { await f.close(); }
});
