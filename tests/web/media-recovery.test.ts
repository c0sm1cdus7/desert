import test from 'node:test';
import assert from 'node:assert/strict';
import { publicCatalogFixture } from './public-catalog-fixture.ts';

test('failed image has a working retry; loaded images select bounded responsive derivatives', async () => {
  const f=await publicCatalogFixture(),{page}=f;
  try {
    await page.setViewportSize({width:390,height:820});
    let fail=true;
    await page.route('**/media/place-1017*',route=>fail
      ? route.fulfill({status:200,contentType:'image/jpeg',body:'intentionally invalid test image'}) : route.continue());
    await page.getByRole('button',{name:'Wulingyuan',exact:true}).first().click();
    const header=page.locator('[data-place-header]');
    await header.locator('[data-image-state="error"]').waitFor();
    assert.equal(await header.locator('h1').innerText(),'Wulingyuan');
    assert.equal(await header.getByText('Loading image').count(),0);
    fail=false; await header.getByRole('button',{name:'Retry',exact:true}).click();
    await header.locator('[data-image-state="ready"]').waitFor();
    const small=(await header.locator('img').getAttribute('src'))!;
    assert.match(small,/\?w=1280$/);
    await page.setViewportSize({width:1440,height:900});
    await page.waitForFunction(()=>document.querySelector('[data-place-header] img')?.getAttribute('src')?.endsWith('?w=2560'));
    assert.equal(await header.locator('img').evaluate(e=>getComputedStyle(e).visibility),'visible','same-photo resize keeps decoded pixels');
    const derivative=await page.request.get(`${f.origin}/media/place-1017?w=640`);
    const original=await page.request.head(`${f.origin}/media/place-1017`);
    assert.equal(derivative.headers()['content-type'],'image/webp');
    assert.ok((await derivative.body()).length < Number(original.headers()['content-length'])*.1);
  } finally { await f.close(); }
});
