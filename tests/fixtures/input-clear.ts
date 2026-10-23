import type { Page } from "playwright";

export const textClearSource = `<script lang="ts">
  import { tick } from 'svelte';
  import TextInput from '@desert/svelte/catalog/foundations/text-input/TextInput.svelte';
  let props = $state({ primitive: 'input.text', label: 'Writing', value: '', disabled: false });
  let events = $state([]), submissions = $state(0);
  window.echoClear = true;
  window.replaceClear = async patch => { props = { ...props, ...patch }; await tick(); };
</script>
<form onsubmit={event => { event.preventDefault(); submissions += 1; }}>
  <TextInput {...props} onchange={value => { events.push(value); if (window.echoClear) props = { ...props, value }; }} />
  <button type="button">Outside</button>
</form>
<output data-events>{JSON.stringify(events)}</output><output data-submissions>{submissions}</output>`;

export const moneyClearSource = `<script lang="ts">
  import { tick } from 'svelte';
  import MoneyControl from '@desert/svelte/catalog/compositions/money-control/MoneyControl.svelte';
  let node = $state({ id: 'budget', label: 'Amount', currency: 'ARS', minorUnits: null,
    currencies: [{ code: 'ARS', scale: 2 }, { code: 'USD', scale: 2 }], locale: 'es-AR', disabled: false, required: false });
  let events = $state([]);
  window.echoClear = true;
  window.replaceClear = async patch => { node = { ...node, ...patch }; await tick(); };
</script>
<main style="padding:16px">
  <MoneyControl {node} onevent={event => { events.push(event); if (window.echoClear) node = { ...node, currency: event.currency, minorUnits: event.minorUnits }; }} />
</main>
<output data-events>{JSON.stringify(events)}</output><output data-currency>{node.currency}</output>`;

export const searchClearSource = `<script lang="ts">
  import SearchField from '@desert/svelte/catalog/foundations/search-field/SearchField.svelte';
  let value = $state(''), events = $state([]);
  window.echoClear = true;
</script>
<SearchField aria-label="Find things" {value}
  onvalue={next => { events.push(next); if (window.echoClear) value = next; }} />
<output data-events>{JSON.stringify(events)}</output>`;

export const selectionClearSource = `<script lang="ts">
  import SelectionField from '@desert/svelte/catalog/foundations/selection-field/SelectionField.svelte';
  import DateControl from '@desert/svelte/catalog/foundations/date-control/DateControl.svelte';
</script>
<section data-select>
  <SelectionField selection="choice" label="Choice" value="one" fieldControl
    options={[{ value: 'one', label: 'One', disabled: false }]} onchange={() => {}} />
</section>
<section data-calendar>
  <DateControl node={{ id: 'arrival', label: 'Arrival', value: '2026-10-16', disabled: false, required: false }} onevent={() => {}} />
</section>`;

export const layoutClearSource = `<script lang="ts">
  import TextInput from '@desert/svelte/catalog/foundations/text-input/TextInput.svelte';
  const longLabel = 'A descriptive field label that must remain readable when text is enlarged';
  let title = $state('An editable thought'), notes = $state('First line\\nLast editable line');
</script>
<main style="padding:16px;max-width:760px;display:grid;gap:24px">
  <TextInput primitive="input.text" label={longLabel} value={title} onchange={value => title = value} />
  <TextInput primitive="input.multiline" label="Notes with a trailing clear accessory" value={notes}
    maxLength={280} onchange={value => notes = value} />
</main>`;

export const updateClear = (page: Page, patch: object) => page.evaluate(value =>
  (window as unknown as { replaceClear: (patch: object) => Promise<void> }).replaceClear(value), patch);
export const clearEvents = async (page: Page) => JSON.parse(await page.locator("[data-events]").innerText());
export const withoutClearEcho = (page: Page) => page.evaluate(() => {
  (window as unknown as { echoClear: boolean }).echoClear = false;
});
