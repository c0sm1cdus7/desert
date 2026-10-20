import assert from 'node:assert/strict';
import type { Locator, Page } from 'playwright';

export async function tabTo(page: Page, target: Locator, limit = 40) {
  for (let step = 0; step < limit; step++) {
    if (await target.evaluate(element => element === document.activeElement)) return;
    await page.keyboard.press('Tab');
  }
  assert.fail(`Native Tab did not reach ${await target.getAttribute('aria-label') ?? await target.innerText()}`);
}

export async function navigateWithKeyboard(page: Page, name: string) {
  const destination = page.getByRole('button', { name, exact: true });
  const trigger = page.getByRole('button', { name: 'Show navigation', exact: true });
  await destination.or(trigger).first().waitFor({ state: 'visible' });
  if (!await destination.isVisible()) {
    await tabTo(page, trigger); await page.keyboard.press('Enter');
    await destination.waitFor({ state: 'visible' });
  }
  await tabTo(page, destination); await page.keyboard.press('Enter');
}
