import assert from 'node:assert/strict';
import test from 'node:test';
import { svelteBrowser } from './fixtures/svelte-browser.ts';
import { rendererCss } from './fixtures/renderer-css.ts';

const source = `<script>
  import ControlBench from '@desert/svelte/catalog/ControlBench.svelte';
</script><main style="padding:24px"><ControlBench entryIds={['control.money','control.options']} /></main>`;

// The bank must exercise the real renderer, including invalid lexical drafts;
// invalid money is never smuggled into the canonical minorUnits contract.
test('money specimens retain values, enforce disabled/fixed currency and recover from real invalid editing', async () => {
  const f = await svelteBrowser(source);
  try {
    await f.page.addStyleTag({content:await rendererCss()});
    const specimen = (state: string) => f.page.locator(`[data-specimen="control.money:${state}"]`);
    const value = specimen('value').getByRole('textbox');
    assert.equal(await value.inputValue(), '125,50');
    assert.ok(await specimen('disabled').getByRole('textbox').isDisabled());
    assert.equal(await specimen('disabled').getByRole('textbox').inputValue(), '125,50');
    assert.ok(await specimen('constrained').getByRole('button',{name:/currency/}).isDisabled());
    assert.equal(await specimen('constrained').getByRole('textbox').inputValue(), '2,500');
    await value.fill('-');
    assert.equal(await value.getAttribute('aria-invalid'), 'true');
    const feedback = specimen('value').getByRole('status');
    assert.ok(await feedback.isVisible());
    assert.equal(await value.getAttribute('aria-describedby'), await feedback.getAttribute('id'));
    assert.equal(await f.page.locator('[data-control-bench] > [role="status"]').innerText(),'No interaction yet.','incomplete drafts do not publish canonical edits');
    await value.fill('42,75');
    assert.equal(await value.getAttribute('aria-invalid'), 'false');
    assert.equal(await value.inputValue(),'42,75');
    assert.match(await f.page.locator('[data-control-bench] > [role="status"]').innerText(),/money.change/);
    assert.deepEqual(f.errors,[]);
  } finally { await f.close(); }
});

test('constrained choices enforce selection capacity and disabled specimens preserve their selection', async () => {
  const f = await svelteBrowser(source);
  try {
    await f.page.addStyleTag({content:await rendererCss()});
    const disabled = f.page.locator('[data-specimen="control.options:disabled"]');
    for (const radio of await disabled.getByRole('radio').all()) assert.ok(await radio.isDisabled());
    assert.ok(await disabled.getByRole('radio',{name:'First option',exact:true}).isChecked());
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
