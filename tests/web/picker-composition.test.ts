import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdir } from 'node:fs/promises';
import { publicCatalogFixture } from './public-catalog-fixture.ts';
import { navigationAction, selectionTrigger, settle } from './public-catalog-expectations.ts';
import { navigateWithKeyboard, tabTo } from './native-keyboard-navigation.ts';

// Expectations describe available space, never a device category: the compact
// calendar fits 390px in portrait, but not 320px or a short landscape viewport.
const cases = [
  { width: 320, height: 900, datePresentation: 'sheet' },
  { width: 390, height: 900, datePresentation: 'anchored' },
  { width: 600, height: 900, datePresentation: 'anchored' },
  { width: 844, height: 390, datePresentation: 'sheet' },
] as const;
for (const { width, height, datePresentation } of cases) for (const colorScheme of ['light','dark'] as const)
test(`compiled pickers preserve shape and direct selection at ${width}x${height} in ${colorScheme}`,async()=>{
  const f=await publicCatalogFixture();
  try {
    const {page}=f;
    await page.setViewportSize({width,height});await page.emulateMedia({colorScheme});
    await (await navigationAction(page,'Travel kit')).click();
    const date=page.getByRole('button',{name:/^Arrival date ·/});
    // Deliberately do not settle navigation first. A queued real click must
    // recover after its scrim exits, not enter an endless header/scroll loop.
    await date.click();await page.getByRole('application').waitFor();await settle(page);
    assert.equal(await page.locator('[data-picker-sheet]').count(),datePresentation==='sheet'?1:0);
    const bounds=await page.getByRole('application').boundingBox();
    assert.ok(bounds && bounds.x>=0 && bounds.x+bounds.width<=width);
    const folder=`artifacts/picker-composition/${process.env.DESERT_CATALOG_BUILD?.split('/').pop()}`;
    await mkdir(folder,{recursive:true});
    await page.screenshot({path:`${folder}/date-${width}x${height}-${colorScheme}.png`});
    const day=page.getByRole('application').locator('[data-calendar-day]:not([data-outside-month]):not([data-disabled])').nth(19);
    const chosen=await day.innerText();await day.click();await page.getByRole('application').waitFor({state:'hidden'});
    assert.ok((await date.innerText()).includes(chosen));
    assert.ok(await date.evaluate(el=>el===document.activeElement));
    const destination=selectionTrigger(page,'Destination');await destination.click();
    const list=page.getByRole('listbox');await list.waitFor();await settle(page);
    assert.equal(await list.locator('[data-selection-mark="single"]').count(),await list.getByRole('option').count());
    await page.screenshot({path:`${folder}/select-${width}x${height}-${colorScheme}.png`});
    await list.getByRole('option',{name:'Mount Fuji',exact:true}).click();await list.waitFor({state:'hidden'});
    assert.match(await destination.innerText(),/Mount Fuji/);
    assert.ok(await destination.evaluate(el=>el===document.activeElement));
  } finally {await f.close();}
});

for (const width of [320, 600]) test(`picker keyboard entry selects a meaningful target and restores its trigger at ${width}px`, async () => {
  const f = await publicCatalogFixture();
  try {
    const { page } = f;
    await page.setViewportSize({ width, height: 900 });
    await navigateWithKeyboard(page, 'Travel kit');
    await settle(page);
    const destination = selectionTrigger(page, 'Destination');
    await tabTo(page, destination); await page.keyboard.press('Enter'); await settle(page);
    const first = page.getByRole('option', { name: 'Mount Fuji', exact: true });
    // Anchored selects use aria-activedescendant; sheets move DOM focus. Both
    // patterns must identify the same usable option to keyboard and AT users.
    const ownsSelectionFocus = (element: Element) => element === document.activeElement
      || !!element.id && document.activeElement?.getAttribute('aria-activedescendant') === element.id;
    assert.ok(await first.evaluate(ownsSelectionFocus), 'Initial selection focus belongs to the first usable option');
    await page.keyboard.press('ArrowDown');
    assert.ok(await page.getByRole('option', { name: 'Wulingyuan', exact: true }).evaluate(ownsSelectionFocus));
    await page.keyboard.press('Escape'); await settle(page);
    assert.ok(await destination.evaluate(element => element === document.activeElement));
    const date = page.getByRole('button', { name: /^Arrival date ·/ });
    await tabTo(page, date); await page.keyboard.press('Enter'); await settle(page);
    assert.ok(await page.evaluate(() => document.activeElement?.matches('[data-calendar-day]')),
      'Calendar keyboard entry focuses a usable date, not month navigation');
    await page.keyboard.press('Escape'); await settle(page);
    assert.ok(await date.evaluate(element => element === document.activeElement));
  } finally { await f.close(); }
});
