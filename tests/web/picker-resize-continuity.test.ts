import assert from 'node:assert/strict';
import test from 'node:test';
import { catalogLifecycleFixture as publicCatalogFixture } from './catalog-lifecycle-fixture.ts';
import { navigationAction, selectionTrigger, settle } from './public-catalog-expectations.ts';
import { lifecycleEvidence } from './catalog-lifecycle-evidence.ts';

// Resizing changes presentation, not the user's current task or draft.
for (const kind of ['date', 'select'] as const) for (const direction of ['narrow', 'widen'] as const)
test(`${kind}: ${direction} an open picker retains task, usable focus and trigger return`, async () => {
  const f = await publicCatalogFixture();
  const { page } = f;
  try {
    await page.setViewportSize({ width: direction === 'narrow' ? 600 : 320, height: 900 });
    await (await navigationAction(page, 'Travel kit')).click();
    const trigger = kind === 'date' ? page.getByRole('button', { name: /^Arrival date ·/ }) : selectionTrigger(page, 'Destination');
    await trigger.click(); await settle(page);
    const name = `${kind}-${direction}`;
    const surface = kind === 'date' ? page.getByRole('application') : page.getByRole('listbox');
    await surface.waitFor();
    let month: string | null = null;
    if (kind === 'date') {
      await page.getByRole('button', { name: /Next month/i }).click(); await settle(page);
      month = await page.locator('[data-date-calendar] .toolbar-title').textContent();
    } else {
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('ArrowDown');
    }
    const before = await lifecycleEvidence(page, `${name}-before`, { month });
    await page.setViewportSize({ width: direction === 'narrow' ? 320 : 600, height: 900 });
    await settle(page);
    const after = await lifecycleEvidence(page, `${name}-after`, { month });
    assert.equal(await surface.count(), 1, 'An open task survives a presentation change exactly once');
    assert.ok(after.active.visible && !after.active.inert && after.active.tag !== 'BODY', 'Focus remains on a usable target, not the document body');
    if (kind === 'date') {
      assert.equal(await page.locator('[data-date-calendar] .toolbar-title').textContent(), month, 'Resizing must not reset the browsed month');
    } else {
      assert.ok(before.active.option, 'Keyboard exploration identifies an option before resize');
      assert.equal(after.active.option, before.active.option, 'Presentation changes preserve the option being explored with the keyboard');
      assert.match(await trigger.innerText(), /Not selected/, 'Exploration and resize must not commit a choice');
      await page.keyboard.press('Enter'); await settle(page);
      assert.equal(await surface.count(), 0);
      assert.ok((await trigger.innerText()).includes(before.active.option), 'Enter commits the retained exploration target');
      assert.ok(await trigger.evaluate(element => element === document.activeElement));
      return;
    }
    await page.keyboard.press('Escape'); await settle(page);
    assert.equal(await surface.count(), 0);
    assert.ok(await trigger.evaluate(element => element === document.activeElement), 'Dismissal returns focus to the current trigger instance');
  } finally { await f.close(); }
});
