import assert from 'node:assert/strict';
import test from 'node:test';
import { publicCatalogFixture } from './public-catalog-fixture.ts';
import { selectionTrigger, settle } from './public-catalog-expectations.ts';

const fields = ['[data-primitive="input.text"]', '[data-choice-measure="choice"] > div', '[data-control="date"]', '[data-measure="amount"] > [data-slot="field"]', '[data-primitive="input.multiline"]'];
test('control families snap to their own container without narrow leftover strips', async () => {
  const f = await publicCatalogFixture(); const { page } = f;
  try {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`${f.origin}/?place=travel-kit`); await settle(page);
    // Independent expected measures: writing 32rem, choice 26rem, date 20rem,
    // compound amount 22rem. Within 3rem of the available width, fill it.
    for (const [available, expected] of [
      [640, [512, 416, 320, 352, 512]], [561, [512, 416, 320, 352, 512]],
      [560, [560, 416, 320, 352, 560]], [465, [465, 416, 320, 352, 465]],
      [464, [464, 464, 320, 352, 464]], [401, [401, 401, 320, 352, 401]],
      [400, [400, 400, 320, 400, 400]], [369, [369, 369, 320, 369, 369]],
      [368, [368, 368, 368, 368, 368]], [354, [354, 354, 354, 354, 354]],
      [280, [280, 280, 280, 280, 280]],
    ] as const) {
      await page.locator('.place-content').evaluate((el, width) => {
        (el as HTMLElement).style.width = `${width}px`; (el as HTMLElement).style.maxWidth = 'none';
      }, available);
      await settle(page);
      const boxes = await Promise.all(fields.map(selector => page.locator(selector).first().boundingBox()));
      boxes.forEach((box, i) => {
        assert.ok(box && Math.abs(box.width - expected[i]!) < 1, `${fields[i]} at ${available}: ${box?.width}, expected ${expected[i]}`);
        assert.ok(Math.abs(box!.x - boxes[0]!.x) < 1, 'Every family remains leading-aligned');
      });
    }
  } finally { await f.close(); }
});

test('choosing a date or destination preserves its measure and the shared text axis', async () => {
  const f = await publicCatalogFixture(); const { page } = f;
  try {
    await page.setViewportSize({ width: 1280, height: 1000 });
    await page.goto(`${f.origin}/?place=travel-kit`); await settle(page);
    const select = selectionTrigger(page, 'Destination');
    const date = page.getByRole('button', { name: /^Arrival date ·/ });
    const before = await Promise.all([select, date].map(field => field.boundingBox()));
    await select.click();
    await page.getByRole('option', { name: 'Mount Fuji', exact: true }).click(); await settle(page);
    assert.match(await select.innerText(), /Mount Fuji/);
    await date.click();
    const calendar = page.getByRole('application'); await calendar.waitFor();
    await calendar.locator('[data-calendar-day]:not([data-outside-month]):not([data-disabled])').nth(19).click();
    await calendar.waitFor({ state: 'hidden' }); await settle(page);
    assert.doesNotMatch(await date.innerText(), /No date selected/);
    for (const [index, field] of [select, date].entries()) {
      assert.equal((await field.boundingBox())!.width, before[index]!.width, 'Content changes do not resize the field');
    }
    // Compound money's amount label follows its currency prefix, not the outer
    // leading axis. Compare the standalone writing/date/choice labels here.
    const xs = await page.locator('[data-control-measure]:not([data-control-measure="amount"]) [data-slot="field-label"]').evaluateAll(elements =>
      elements.map(el => el.getBoundingClientRect().left));
    assert.ok(xs.every(x => Math.abs(x - xs[0]!) <= 1), 'Standalone field text shares one leading axis');
    const headingX = await page.locator('[data-place-header] h1').evaluate(el => el.getBoundingClientRect().left);
    assert.ok(Math.abs(xs[0]! - headingX) <= 1, 'Field text aligns with the place title');
  } finally { await f.close(); }
});

test('resizing preserves the same editor, focus and draft; large text fits', async () => {
  const f = await publicCatalogFixture(); const { page } = f;
  try {
    await page.goto(`${f.origin}/?place=travel-kit`); await settle(page);
    const input = page.getByRole('textbox', { name: 'Trip name', exact: false });
    await input.fill('My unchanged trip'); const original = await input.elementHandle();
    for (const width of [1280, 480, 390, 320, 1280]) {
      await page.setViewportSize({ width, height: 900 }); await settle(page);
      assert.equal(await original!.evaluate(el => el === document.activeElement), true);
      assert.equal(await input.inputValue(), 'My unchanged trip');
      assert.equal(await page.locator('[data-catalog-scroll]').evaluate(el => el.scrollWidth > el.clientWidth), false);
    }
    await page.setViewportSize({ width: 390, height: 900 });
    await page.evaluate(() => document.documentElement.style.setProperty('--text-scale', '2'));
    await settle(page);
    const available = (await page.locator('.place-content').boundingBox())!.width;
    for (const selector of fields) {
      const box = (await page.locator(selector).first().boundingBox())!;
      assert.ok(Math.abs(box.width - available) < 1, `${selector} must fill at enlarged text`);
    }
  } finally { await f.close(); }
});
