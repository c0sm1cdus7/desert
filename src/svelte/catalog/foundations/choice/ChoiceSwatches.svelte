<script lang="ts">
  import * as RadioGroup from "../../../vendor/components/ui/radio-group/index.js";
  import type { SwatchOption } from "../../../../interaction/choice.ts";
  // One tint swatch per option: a 44px target around a 32px dot of the tint, its name for assistive technology and as
  // the pointer's title; the chosen dot is ringed.
  let { id, label, options, selected, disabled, required, onchange }: { id: string; label: string; options: readonly SwatchOption[];
    selected: readonly string[]; disabled: boolean; required: boolean; onchange: ((selected: string[]) => void) | undefined } = $props();
  const control = (value: string) => `${id}-${value}`;
  // The radio inside a swatch is another component's element: the swatch states its disabled and keyboard-focus states
  // as its own marks (a scoped `:has()` never reaches that element).
  let focused = $state<string | undefined>(undefined);
</script>

<RadioGroup.Root aria-label={label} value={selected[0] ?? ""} {disabled} {required} onValueChange={value => onchange?.(value ? [value] : [])}>
  <div class="rail">
    {#each options as option (option.value)}
      <label class="swatch" for={control(option.value)} title={option.label} data-swatch-tint={option.leading.color}
        data-selected={selected.includes(option.value)} data-choice-option={option.value} data-disabled={disabled || option.disabled}
        data-focus-visible={focused === option.value}
        onfocusin={event => { focused = event.target instanceof Element && event.target.matches(":focus-visible") ? option.value : undefined; }}
        onfocusout={() => { if (focused === option.value) focused = undefined; }}>
        <RadioGroup.Item presentation="swatch" id={control(option.value)} value={option.value} aria-label={option.label}
          disabled={disabled || option.disabled} aria-describedby={option.description ? `${control(option.value)}-description` : undefined} />
        <span class="sr-only">{option.label}</span>
        {#if option.description}<span id={`${control(option.value)}-description`} class="sr-only">{option.description}</span>{/if}
      </label>
    {/each}
  </div>
</RadioGroup.Root>

<style>
  .rail { display:flex; flex-wrap:wrap; gap:.25rem; padding:.25rem; }
  .swatch { position:relative; display:grid; place-items:center; width:2.75rem; height:2.75rem; border-radius:50%; cursor:pointer; }
  .swatch::before { content:""; position:absolute; width:2rem; height:2rem; border-radius:50%; border:1px solid var(--border);
    background:var(--choice-swatch); pointer-events:none; }
  /* F1-merge: the tint tokens (var(--tint-color-<tint>), DESIGN §7.4) replace these paints of the old appearance swatches. */
  .swatch[data-swatch-tint="blue"] { --choice-swatch:#2967be; } .swatch[data-swatch-tint="violet"] { --choice-swatch:#7452ac; }
  .swatch[data-swatch-tint="rose"] { --choice-swatch:#a23e69; } .swatch[data-swatch-tint="green"] { --choice-swatch:#26745f; }
  .swatch[data-swatch-tint="slate"] { --choice-swatch:#586575; }
  .swatch[data-selected="true"]::before { outline:2px solid var(--ring); outline-offset:2px; }
  .swatch[data-focus-visible="true"] { outline:3px solid var(--ring); outline-offset:3px; }
  .swatch[data-disabled="true"] { cursor:default; opacity:var(--disabled-opacity); }
</style>
