import assert from 'node:assert/strict';
import test from 'node:test';
import { controlResolvedNode } from '../../src/interaction/resolved-node.ts';
import { svelteBrowser } from '../fixtures/svelte-browser.ts';
import { rendererCss } from '../fixtures/renderer-css.ts';
import { settle, near } from './public-catalog-expectations.ts';

test('always-visible sibling Stacks retain independent labels, requirements and shared insets', async () => {
  const base = { version: 'desert.control/1', disabled: false } as const;
  const files = (id: string) => controlResolvedNode({ ...base, kind: 'files', id, label: 'Shared label', files: [],
    limits: { maxCount: 2, maxFileBytes: 1024, maxTotalBytes: 2048, accept: ['text/plain'] } });
  const definitions = [{ id: 'direct', title: 'Shared label', items: [files('direct')] },
    { id: 'details', title: 'Details', items: [controlResolvedNode({ ...base, kind: 'options', id: 'choices', label: 'Shared label', minSelected: 1,
      maxSelected: 1, selected: ['first'], options: [{ value: 'first', label: 'First', disabled: false },
        { value: 'second', label: 'Second', disabled: false }] }), files('details-files')],
  }];
  const f = await svelteBrowser(`<script>
    import Stack from '@desert/svelte/catalog/compositions/stack/Stack.svelte';
    import { LocalFileHost } from '@desert/svelte/infra/file-host.ts';
    const definitions=${JSON.stringify(definitions)}, host=new LocalFileHost();
  </script>{#each definitions as definition}<Stack {definition} {host} onevent={()=>{}} />{/each}`);
  try {
    await f.page.addStyleTag({ content: await rendererCss() });
    await f.page.setViewportSize({ width: 390, height: 900 });
    const direct = f.page.locator('[data-place-stack="direct"]');
    const details = f.page.locator('[data-place-stack="details"]');
    assert.equal(await f.page.locator('[data-place-stack]').count(), 2);
    assert.equal(await f.page.locator('[data-place-stack] [data-place-stack]').count(), 0);
    assert.equal(await f.page.locator('details, summary, [data-stack-kind="disclosure"], [data-slot^="collapsible"], [data-slot^="accordion"], .stack-disclosure').count(), 0);
    const directLabel = direct.locator('[data-control="files"] [data-slot="field-label"]');
    assert.equal(await directLabel.evaluate(element => element.classList.contains('sr-only')), true,
      'Direct file label remains accessible without duplicating its visible Stack heading');
    const choicesLegend = details.locator('[data-choice="rows"] > legend');
    assert.equal(await choicesLegend.evaluate(element => element.classList.contains('sr-only')), false,
      'A sibling Stack owns its label scope independently of the previous heading');
    assert.equal(await choicesLegend.locator('.required').count(), 0,
      'A retained contextual choice has no required marker');
    assert.equal(await details.getByRole('radio', { name: 'First', exact: true }).isVisible(), true,
      'Choice content is immediately available without expansion');
    assert.equal(await details.locator('[data-control="files"] [data-slot="field-label"]').evaluate(element => element.classList.contains('sr-only')), false);
    assert.equal(await f.page.locator('.place-stack-title .required').count(), 0,
      'A differently labeled choice does not attach its requirement to either Stack heading');
    for (const scale of [1, 2]) {
      await f.page.evaluate(value => document.documentElement.style.setProperty('--text-scale', String(value)), scale);
      await settle(f.page);
      const positions = await f.page.evaluate(() => {
        const x = (selector: string) => document.querySelector(selector)!.getBoundingClientRect().left;
        const textX = (selector: string) => { const range = document.createRange(); range.selectNodeContents(document.querySelector(selector)!);
          return range.getBoundingClientRect().left; };
        return { title: x('[data-place-stack="direct"] .place-stack-title h2'),
          detailsTitle: x('[data-place-stack="details"] .place-stack-title h2'),
          choicesLabel: textX('[data-choice="rows"] > legend'),
          detailsFile: textX('[data-place-stack="details"] [data-control="files"] [data-slot="field-label"]'),
          support: textX('[data-control="files"] [data-slot="field-description"]') };
      });
      near(positions.detailsTitle, positions.title, 'Sibling headings follow one caption guide', .1);
      near(positions.choicesLabel, positions.title, 'Choice label follows caption guide', .1);
      near(positions.detailsFile, positions.title, 'Sibling file label follows caption guide', .1);
      near(positions.support, positions.title, 'File support follows caption guide', .1);
    }
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
