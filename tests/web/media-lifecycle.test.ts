import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import type { Route } from 'playwright';
import { publicCatalogFixture } from './public-catalog-fixture.ts';
import { settle } from './public-catalog-expectations.ts';

const directory = 'artifacts/media-integration-v126';
for (const width of [390,1280]) for (const theme of ['light','dark'] as const) {
  test(`media lifecycle and visual acceptance: ${width}/${theme}`, async () => {
    // We deliberately abandon these pending image requests by paging/navigating.
    // Only ERR_ABORTED for these exact assets is expected; all other diagnostics fail.
    const f = await publicCatalogFixture(request => /^\/media\/place-(1016|1017|1019)$/.test(new URL(request.url()).pathname)), {page} = f;
    const held: Route[] = [];
    try {
      await mkdir(directory,{recursive:true});
      await page.setViewportSize({width,height:820}); await page.emulateMedia({colorScheme:theme});
      await page.route('**/media/place-1019*', route=>{held.push(route);});
      await page.goto(f.origin, {waitUntil:'domcontentloaded'});
      const header=page.locator('[data-place-header]'), media=header.locator('[data-media-image]');
      await header.locator('[data-image-state="ready"]').waitFor(); await settle(page);
      await page.screenshot({path:`${directory}/${width}-${theme}-header.png`});
      const dots=header.locator('[data-media-dots] button');
      const a=(await dots.nth(0).boundingBox())!, b=(await dots.nth(1).boundingBox())!;
      assert.equal(b.x-a.x,24); assert.equal(a.height,44);
      assert.equal(await header.locator('[data-header-collection]').evaluate(e=>getComputedStyle(e,'::before').zIndex),'1','contrast protection remains above the photo, below the controls');
      await dots.nth(1).click();
      await page.waitForFunction(()=>document.querySelector('[data-place-header] img')?.getAttribute('src')?.includes('place-1019'));
      assert.equal(await media.getAttribute('data-image-state'),'loading');
      assert.equal(await media.locator('img').evaluate(e=>getComputedStyle(e).visibility),'hidden');
      assert.equal(await page.getByText('Loading image',{exact:true}).count(),0);
      assert.equal(await header.locator('[role="progressbar"],[role="status"]').count(),0);
      await page.screenshot({path:`${directory}/${width}-${theme}-silent.png`});
      // Open while pending: no preceding photo in either surface.
      await header.locator('[data-media-open]').click();
      const viewer=page.locator('[data-media-viewer]'); await viewer.waitFor();
      assert.equal(await viewer.locator('[data-media-stage] img').evaluate(e=>getComputedStyle(e).visibility),'hidden');
      await viewer.getByRole('button',{name:'Next media',exact:true}).click();
      await viewer.locator('[data-media-stage] [data-image-state="ready"]').waitFor();
      await page.unroute('**/media/place-1019*');
      await Promise.all(held.splice(0).map(route=>route.continue().catch(()=>{})));
      await settle(page);
      assert.match((await viewer.locator('[data-media-stage] img').getAttribute('src'))!,/place-1001/,'late completion cannot replace selected photo');
      await page.screenshot({path:`${directory}/${width}-${theme}-viewer.png`});
      assert.equal(await viewer.evaluate(e=>Math.round(e.getBoundingClientRect().width)),width);
      await page.keyboard.press('Escape'); await viewer.waitFor({state:'hidden'});
      assert.equal(await dots.nth(2).getAttribute('aria-current'),'true');
      // The actual A → home → B flow, with B's intent prefetch and display both delayed.
      await page.getByRole('button',{name:'Mount Fuji',exact:true}).first().click();
      await header.locator('[data-image-state="ready"]').waitFor();
      assert.equal(await header.locator('[data-media-dots]').count(),0);
      await page.getByRole('button',{name:'Back',exact:true}).first().click();
      await page.route('**/media/place-1017*',route=>{held.push(route);});
      await page.getByRole('button',{name:'Wulingyuan',exact:true}).first().click();
      await page.waitForFunction(()=>document.querySelector('[data-place-header] h1')?.textContent==='Wulingyuan');
      assert.equal(await media.getAttribute('data-image-state'),'loading');
      assert.match((await media.locator('img').getAttribute('src'))!,/place-1017/);
      assert.equal(await media.locator('img').evaluate(e=>getComputedStyle(e).visibility),'hidden');
      await page.screenshot({path:`${directory}/${width}-${theme}-destination-pending.png`});
      await page.unroute('**/media/place-1017*');
      await Promise.all(held.splice(0).map(route=>route.continue().catch(()=>{})));
      await header.locator('[data-image-state="ready"]').waitFor();
      await header.locator('[data-media-open]').click(); await viewer.waitFor();
      assert.equal(await viewer.locator('[data-media-thumbs]').count(),0);
      assert.equal(await viewer.getByRole('button',{name:'Next media',exact:true}).count(),0);
      await page.keyboard.press('Escape');
      await writeFile(`${directory}/${width}-${theme}-lifecycle.json`,JSON.stringify({width,theme,
        dotsPitch:24, silentLoading:true, staleCompletionIgnored:true, navigationRemovesPreviousPixels:true,
        singleImageHasNoPaging:true, nativeSafari:'not qualified'},null,2));
    } finally { await Promise.all(held.map(route=>route.abort().catch(()=>{}))); await f.close(); }
  });
}
