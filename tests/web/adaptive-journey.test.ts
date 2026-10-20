import assert from 'node:assert/strict';
import test from 'node:test';
import { browserFixture, settleMotion } from './fixture.ts';

test('one real journey retains its editor, caret and scroll across three presentations', { timeout: 60000 }, async () => {
  const f = await browserFixture();
  try {
    await f.page.setViewportSize({ width: 1800, height: 360 });
    const opener = f.page.getByRole('button', { name: 'Create note', exact: true }).first();
    await opener.click(); await settleMotion(f.page);
    const pane = f.page.locator('[data-adaptive-surface]');
    const input = pane.getByRole('textbox', { name: 'Title', exact: true });
    await input.fill('Keep this exact draft and selected range');
    await input.evaluate((node: HTMLInputElement) => { node.focus(); node.setSelectionRange(6, 10); });
    const handle = await input.elementHandle(), paneHandle = await pane.elementHandle();
    const viewport = pane.locator('[data-surface-slot="content"]');
    const position = await viewport.evaluate(node => { node.scrollTop = 40; return node.scrollTop; });
    assert.ok(position > 0, 'the test must exercise nonzero scroll');
    for (const [width, mode, edge, expectedWidth] of [
      [1319, 'transient', 'right', 576], [1320, 'docked', 'right', 576],
      [599, 'transient', 'bottom', 575], [600, 'transient', 'right', 576], [1800, 'docked', 'right', 576],
    ] as const) {
      await f.page.setViewportSize({ width, height: 360 });
      await f.page.waitForFunction(([mode, edge]) => {
        const node = document.querySelector('[data-adaptive-surface]');
        return node?.getAttribute('data-presentation') === mode && node?.getAttribute('data-edge') === edge;
      }, [mode, edge]);
      assert.equal(await handle!.evaluate(node => node.isConnected && document.activeElement === node), true);
      assert.equal(await paneHandle!.evaluate(node => node === document.querySelector('[data-adaptive-surface]')), true);
      assert.deepEqual(await input.evaluate((node: HTMLInputElement) => [node.selectionStart, node.selectionEnd]), [6, 10]);
      assert.equal(await input.inputValue(), 'Keep this exact draft and selected range');
      assert.ok(Math.abs((await pane.boundingBox())!.width - expectedWidth) < 1, `pane width at ${width}`);
      assert.equal(await viewport.evaluate(node => node.scrollTop), position, `internal scroll at ${width}`);
      assert.equal(await pane.evaluate(node => node.getAnimations().length), 0, 'resize does not replay entrance');
    }
    await f.page.setViewportSize({ width: 390, height: 700 });
    await f.page.waitForFunction(() => document.querySelector('[data-adaptive-surface]')?.getAttribute('data-edge') === 'bottom');
    for (let i = 0; i < 12; i++) {
      await f.page.keyboard.press('Tab');
      assert.equal(await pane.evaluate(node => node.contains(document.activeElement)), true);
    }
    await f.page.keyboard.press('Escape'); await pane.waitFor({ state: 'hidden' });
    assert.equal(await opener.evaluate(node => document.activeElement === node), true,
      await f.page.evaluate(() => (document.activeElement as HTMLElement)?.outerHTML));
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test('pending and uncertain journeys cannot be dismissed or orphaned by docked navigation', { timeout: 60000 }, async () => {
  const f = await browserFixture();
  let release!: () => void;
  try {
    await f.page.setViewportSize({ width: 1800, height: 900 });
    await f.page.getByRole('button', { name: 'Create note', exact: true }).click();
    const pane = f.page.locator('[data-adaptive-surface]');
    await pane.getByRole('textbox', { name: 'Title', exact: true }).fill('Protected operation');
    await pane.getByRole('textbox', { name: 'Content', exact: true }).fill('Retain the operation identity through resize.');
    const held = new Promise<void>(resolve => release = resolve);
    await f.page.route('**/api/accept', async route => { await held; await route.abort('failed'); });
    await pane.getByRole('button', { name: 'Create note', exact: true }).click();
    await f.page.waitForFunction(() => document.querySelector('[data-adaptive-surface]')?.hasAttribute('data-locked'));
    const node = await pane.elementHandle();
    assert.equal(await f.page.getByRole('button', { name: 'Renderer catalog', exact: true }).isDisabled(), true);
    await f.page.keyboard.press('Escape');
    assert.equal(await pane.isVisible(), true);
    await f.page.setViewportSize({ width: 390, height: 844 });
    await f.page.waitForFunction(() => document.querySelector('[data-adaptive-surface]')?.getAttribute('data-edge') === 'bottom');
    await f.page.keyboard.press('Escape');
    assert.equal(await node!.evaluate(element => element.isConnected), true);
    assert.equal(await pane.getByRole('button', { name: 'Close panel', exact: true }).isDisabled(), true);
    release();
    const failure = f.page.getByRole('dialog', { name: 'The result isn’t confirmed', exact: true });
    await failure.waitFor();
    await f.page.setViewportSize({ width: 1800, height: 900 });
    for (const width of [1800, 390, 1800]) {
      await f.page.setViewportSize({ width, height: 900 });
      for (let index = 0; index < 6; index++) {
        await f.page.keyboard.press('Tab');
        assert.equal(await failure.evaluate(element => element.contains(document.activeElement)), true, `nested failure at ${width}`);
      }
    }
    await f.page.keyboard.press('Escape'); await failure.waitFor({ state: 'hidden' });
    assert.equal(await pane.isVisible(), true);
    assert.equal(await pane.getAttribute('data-locked'), 'true');
    assert.equal(await f.page.getByRole('button', { name: 'Renderer catalog', exact: true }).isDisabled(), true);
    await f.page.keyboard.press('Escape'); assert.equal(await pane.isVisible(), true);
    assert.deepEqual(f.errors, []);
  } finally { release?.(); await f.close(); }
});
