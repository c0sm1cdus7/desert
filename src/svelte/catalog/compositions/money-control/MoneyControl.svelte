<script lang="ts">
  import { untrack } from "svelte";
  import * as Field from "../../../vendor/components/ui/field/index.js";
  import * as Group from "../../../vendor/components/ui/input-group/index.js";
  import MaskedInput from "../../foundations/masked-input/MaskedInput.svelte";
  import SelectionField from "../../foundations/selection-field/SelectionField.svelte";
  import type { ControlProps } from "../../../renderer-contracts.ts";
  import { displayAmount, parseAmount } from "../../../../interaction/money.ts";
  import { formatMaskedValue, type InputMask } from "../../../../interaction/input-mask.ts";
  import FieldWell from "../../foundations/field-well/FieldWell.svelte";
  import MeasuredField from "../../foundations/measured-field/MeasuredField.svelte";
  import ClearInput from "../../foundations/clear-input/ClearInput.svelte";
  let { node, onevent }: ControlProps<"money"> = $props();
  const id = $props.id();
  let scale = $derived(node.currencies.find(currency => currency.code === node.currency)!.scale);
  let mask: InputMask = $derived({ kind: "decimal", locale: node.locale ?? "en-US", scale });
  const symbol = (currency: string) => new Intl.NumberFormat(mask.locale, {
    style: "currency", currency, currencyDisplay: "narrowSymbol",
  }).formatToParts(0).find(part => part.type === "currency")!.value;
  let options = $derived(node.currencies.map(item => ({ value: item.code, label: item.code, disabled: false })));
  let draft = $state(untrack(() => displayAmount(node.minorUnits, scale)));
  let display = $state("");
  let draftValid = true;
  let error = $state("");
  const ownerValue = () => ({ id: node.id, currency: node.currency, minorUnits: node.minorUnits, scale, locale: mask.locale });
  let observed = untrack(ownerValue);
  let pending: ReturnType<typeof ownerValue>[] = [];
  $effect(() => {
    const next = ownerValue();
    untrack(() => {
      const contextChanged = next.id !== observed.id || next.currency !== observed.currency || next.scale !== observed.scale || next.locale !== observed.locale;
      const acknowledgement = pending.findIndex(value => value.id === next.id && value.currency === next.currency &&
        value.scale === next.scale && value.locale === next.locale && value.minorUnits === next.minorUnits);
      // Acknowledgements preserve lexical writing, including a newer invalid draft.
      // Owner replacements reset both the display and errors without emitting an edit.
      if ((contextChanged || next.minorUnits !== observed.minorUnits) && acknowledgement < 0) {
        draft = displayAmount(next.minorUnits, next.scale); draftValid = true; error = ""; pending = [];
      } else if (acknowledgement >= 0) pending.splice(0, acknowledgement + 1);
      observed = next;
    });
  });
  function publish(currency: string, minorUnits: string | null) {
    pending.push({ id: node.id, currency, minorUnits, scale: node.currencies.find(item => item.code === currency)!.scale, locale: mask.locale });
    onevent({ kind: "money.change", control: node.id, currency, minorUnits });
  }
  function edit(value: string, valid: boolean, complete: boolean) {
    draft = value; draftValid = valid && complete;
    if (!draftValid) { error = `Enter an amount with up to ${scale} decimal places using ${mask.locale} formatting.`; return; }
    try { const minorUnits = parseAmount(value, scale); error = "";
      publish(node.currency, minorUnits);
    } catch (cause) { error = cause instanceof Error && cause.message === "MONEY_AMOUNT_TOO_LARGE"
      ? "This amount exceeds the supported size." : `Enter an amount with up to ${scale} decimal places.`; }
  }
  function currency(value: string) {
    if (value === node.currency) return;
    const nextScale = node.currencies.find(item => item.code === value)!.scale;
    try {
      if (!draftValid || draft && !/^-?\d+(\.\d+)?$/.test(draft)) throw new Error("INVALID_MONEY_AMOUNT");
      // Removing insignificant fractional zeros permits exact scale changes, never rounding or FX conversion.
      const exact = draft.includes(".") ? draft.replace(/0+$/, "").replace(/\.$/, "") : draft;
      const minorUnits = parseAmount(exact, nextScale);
      error = ""; publish(value, minorUnits);
    } catch { error = `Enter an amount representable in ${value} with up to ${nextScale} decimal places before changing currency.`; }
  }
</script>
{#snippet currencySymbol(currency: string)}
  <Group.Text data-currency-symbol aria-hidden="true">{symbol(currency)}</Group.Text>
{/snippet}
<MeasuredField kind="control.money" invalid={!!error} disabled={node.disabled}>
  <FieldWell {id} label={node.label} required={node.required} filled={true}>
    {#snippet accessory()}<ClearInput control={id} value={display} label={`Clear ${node.label}`} disabled={node.disabled} />{/snippet}
    {#snippet prefix()}
      <SelectionField selection={`${node.id}-currency`} label={`${node.label} currency`} triggerLabel={`${node.currency} · ${node.label} currency`}
        value={node.currency} {options}
        onchange={currency} disabled={node.disabled || node.currencies.length === 1}>
        {#snippet optionLeading(option)}{@render currencySymbol(option.value)}{/snippet}
        {#snippet selectedContent(selected)}
          <span class="flex items-center gap-2">
            {@render currencySymbol(selected?.value ?? node.currency)}
            <span>{selected?.label ?? node.currency}</span>
          </span>
        {/snippet}
      </SelectionField>
    {/snippet}
    <MaskedInput {id} {mask} bind:display identity={`${node.id}/${node.currency}`} value={draft} placeholder={formatMaskedValue(displayAmount("0", scale), mask)}
      disabled={node.disabled} required={node.required} aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined}
      onvalue={edit} />
  </FieldWell>
  {#if error}<Field.FieldDescription id={`${id}-error`} role="status">{error}</Field.FieldDescription>{/if}
</MeasuredField>
