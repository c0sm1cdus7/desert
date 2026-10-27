<script lang="ts">
  import { untrack } from "svelte";
  import { Choice, Field } from "../../index.ts";
  import type { CatalogProps } from "../../types.d.ts";
  import { displayAmount, parseAmount } from "../../../../interaction/money.ts";
  import { formatMaskedValue, type InputMask } from "../../../../interaction/input-mask.ts";
  import { say } from "../../../infra/messages.ts";
  import { m } from "../../../../messages/keys.ts";
  let { node, onevent }: CatalogProps<"money-control"> = $props();
  let scale = $derived(node.currencies.find(currency => currency.code === node.currency)!.scale);
  let mask: InputMask = $derived({ kind: "decimal", locale: node.locale ?? "en-US", scale });
  const symbol = (currency: string) => new Intl.NumberFormat(mask.locale, {
    style: "currency", currency, currencyDisplay: "narrowSymbol",
  }).formatToParts(0).find(part => part.type === "currency")!.value;
  // Each currency leads with its narrow symbol, in the list and in the inline value beside the amount.
  let options = $derived(node.currencies.map(item => ({ value: item.code, label: item.code, disabled: false,
    leading: { kind: "symbol" as const, text: symbol(item.code) } })));
  let draft = $state(untrack(() => displayAmount(node.minorUnits, scale)));
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
    onevent?.({ kind: "money.change", control: node.id, currency, minorUnits });
  }
  function edit(value: string, valid: boolean, complete: boolean) {
    draft = value; draftValid = valid && complete;
    if (!draftValid) { error = say(m.moneyControl.format, { scale: String(scale), locale: mask.locale }); return; }
    try { const minorUnits = parseAmount(value, scale); error = "";
      publish(node.currency, minorUnits);
    } catch (cause) { error = cause instanceof Error && cause.message === "MONEY_AMOUNT_TOO_LARGE"
      ? say(m.moneyControl.tooLarge) : say(m.moneyControl.scale, { scale: String(scale) }); }
  }
  function currency(value: string | undefined) {
    if (value === undefined || value === node.currency) return;
    const nextScale = node.currencies.find(item => item.code === value)!.scale;
    try {
      if (!draftValid || draft && !/^-?\d+(\.\d+)?$/.test(draft)) throw new Error("INVALID_MONEY_AMOUNT");
      // Removing insignificant fractional zeros permits exact scale changes, never rounding or FX conversion.
      const exact = draft.includes(".") ? draft.replace(/0+$/, "").replace(/\.$/, "") : draft;
      const minorUnits = parseAmount(exact, nextScale);
      error = ""; publish(value, minorUnits);
    } catch { error = say(m.moneyControl.currencyScale, { currency: value, scale: String(nextScale) }); }
  }
</script>
<Field primitive="input.text" purpose="text" label={node.label} labelVisibility="visible" measure="amount" {mask}
  identity={`${node.id}/${node.currency}`} value={draft} placeholder={formatMaskedValue(displayAmount("0", scale), mask)}
  required={node.required} invalid={!!error} disabled={node.disabled} error={error || undefined} clear
  onmasked={({ value, valid, complete }) => edit(value, valid, complete)}>
  {#snippet prefix()}
    <Choice presentation="menu" cardinality="one" menuTrigger="inline" label={say(m.moneyControl.currency, { label: node.label })}
      labelVisibility="visible" selected={[node.currency]} {options} disabled={node.disabled || node.currencies.length === 1} required={false}
      onchange={selected => currency(selected[0])} />
  {/snippet}
</Field>
