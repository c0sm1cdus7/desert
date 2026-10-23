import assert from 'node:assert/strict';
import test from 'node:test';
import { svelteBrowser } from './fixtures/svelte-browser.ts';
import { rendererCss } from './fixtures/renderer-css.ts';
import type { Page } from 'playwright';

const source = `<script>
  import ControlBench from '@desert/svelte/catalog/ControlBench.svelte';
</script><main style="padding:24px"><ControlBench entryIds={['control.money','control.options']} /></main>`;

async function state(page: Page, entry: string, value: string) {
  await page.locator(`[data-catalog-entry="${entry}"]`).getByRole('button', {name:/^State ·/}).click();
  await page.getByRole('option', {name:value,exact:true}).click();
  assert.equal(await page.locator(`[data-catalog-entry="${entry}"] [data-specimen]:visible`).count(), 1);
}

// The bank must exercise the real renderer, including invalid lexical drafts;
// invalid money is never smuggled into the canonical minorUnits contract.
test('money specimens retain values, enforce disabled/fixed currency and recover from real invalid editing', async () => {
  const f = await svelteBrowser(source);
  try {
    await f.page.addStyleTag({content:await rendererCss()});
    const specimen = (state: string) => f.page.locator(`[data-specimen="control.money:${state}"]`);
    await state(f.page,'control.money','value');
    const value = specimen('value').getByRole('textbox');
    assert.equal(await value.inputValue(), '125,50');
    await state(f.page,'control.money','disabled');
    assert.ok(await specimen('disabled').getByRole('textbox').isDisabled());
    assert.equal(await specimen('disabled').getByRole('textbox').inputValue(), '125,50');
    await state(f.page,'control.money','constrained');
    assert.ok(await specimen('constrained').getByRole('button',{name:/currency/}).isDisabled());
    assert.equal(await specimen('constrained').getByRole('textbox').inputValue(), '2,500');
    await state(f.page,'control.money','value');
    await value.fill('-');
    assert.equal(await value.getAttribute('aria-invalid'), 'true');
    const feedback = specimen('value').getByRole('status');
    assert.ok(await feedback.isVisible());
    assert.equal(await value.getAttribute('aria-describedby'), await feedback.getAttribute('id'));
    const interaction = f.page.getByRole('group',{name:'Interaction',exact:true}).getByRole('status');
    assert.equal(await interaction.innerText(),'No interaction yet.','incomplete drafts do not publish canonical edits');
    await value.fill('42,75');
    assert.equal(await value.getAttribute('aria-invalid'), 'false');
    assert.equal(await value.inputValue(),'42,75');
    assert.match(await interaction.innerText(),/money.change/);
    await state(f.page,'control.money','empty');
    await state(f.page,'control.money','value');
    assert.equal(await value.inputValue(),'42,75','changing the example state retains its local draft');
    assert.deepEqual(f.errors,[]);
  } finally { await f.close(); }
});

test('constrained choices enforce selection capacity and disabled specimens preserve their selection', async () => {
  const f = await svelteBrowser(source);
  try {
    await f.page.addStyleTag({content:await rendererCss()});
    await state(f.page,'control.options','disabled');
    const disabled = f.page.locator('[data-specimen="control.options:disabled"]');
    for (const radio of await disabled.getByRole('radio').all()) assert.ok(await radio.isDisabled());
    assert.ok(await disabled.getByRole('radio',{name:'First option',exact:true}).isChecked());
    await state(f.page,'control.options','constrained');
    const constrained = f.page.locator('[data-specimen="control.options:constrained"]');
    const first = constrained.getByRole('checkbox',{name:'First option',exact:true});
    const second = constrained.getByRole('checkbox',{name:'Second option',exact:true});
    const third = constrained.getByRole('checkbox',{name:'Third option',exact:true});
    assert.ok(await first.isChecked() && await second.isChecked());
    assert.ok(await third.isDisabled(),'maximum reached');
    await second.uncheck();
    assert.ok(await first.isEnabled(),'required is a completeness rule, not a trap preventing an incomplete draft');
    assert.ok(await third.isEnabled(),'free capacity becomes available');
    await third.check();
    assert.ok(await third.isChecked() && await first.isChecked());
    assert.ok(await second.isDisabled(),'maximum restored');
    assert.deepEqual(f.errors,[]);
  } finally { await f.close(); }
});
