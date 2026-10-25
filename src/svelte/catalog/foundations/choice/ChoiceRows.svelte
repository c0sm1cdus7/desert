<script lang="ts">
  import * as RadioGroup from "../../../vendor/components/ui/radio-group/index.js";
  import { Checkbox } from "../../../vendor/components/ui/checkbox/index.js";
  import type { ChoiceOption } from "../../../../interaction/choice.ts";
  import ChoiceAnatomy from "./ChoiceAnatomy.svelte";
  import { rowDivider, rowFrame, rowGroup } from "./choice-row.ts";
  // The options as rows of one pane at the reading measure: a radio each for one, a checkbox each for many. A row's label
  // activates its control; a disabled option's control keeps full ink while its content dims.
  // In their own pane they keep the reading measure; inside a hosting pane (`interior`) they take its width, transparent.
  let { id, label, frame, cardinality, options, selected, disabled, required, onchange }: { id: string; label: string; frame: "pane" | "interior";
    cardinality: "one" | "many"; options: readonly ChoiceOption[]; selected: readonly string[]; disabled: boolean; required: boolean;
    onchange: ((selected: string[]) => void) | undefined } = $props();
  const control = (value: string) => `${id}-${value}`;
  const unavailable = (option: ChoiceOption) => disabled || option.disabled;
  function toggle(value: string, checked: boolean) {
    onchange?.(checked ? [...selected, value] : selected.filter(item => item !== value));
  }
</script>

{#snippet rows()}
  {#each options as option, index (option.value)}
    <label for={control(option.value)} class="group/field-label peer/field-label gap-2 leading-snug type-control select-none items-center
      {rowFrame} {index > 0 ? rowDivider : ''}" aria-disabled={unavailable(option)} data-choice-row data-choice-option={option.value}>
      <ChoiceAnatomy {option} labelId={`${control(option.value)}-label`} descriptionId={`${control(option.value)}-description`}
        dimmed={unavailable(option)}>
        {#snippet mark()}
          {#if cardinality === "one"}
            <RadioGroup.Item id={control(option.value)} value={option.value} disabled={unavailable(option)} class="disabled:opacity-100"
              aria-labelledby={`${control(option.value)}-label`}
              aria-describedby={option.description ? `${control(option.value)}-description` : undefined} />
          {:else}
            <Checkbox id={control(option.value)} checked={selected.includes(option.value)} disabled={unavailable(option)} class="disabled:opacity-100"
              onCheckedChange={checked => toggle(option.value, checked)} aria-labelledby={`${control(option.value)}-label`}
              aria-describedby={option.description ? `${control(option.value)}-description` : undefined} />
          {/if}
        {/snippet}
      </ChoiceAnatomy>
    </label>
  {/each}
{/snippet}

<div class="w-full min-w-0 {frame === 'pane' ? 'max-w-[34rem]' : ''}">
  <div class="{frame === 'pane' ? 'material-pane text-card-foreground' : 'material-interior'} overflow-hidden rounded-[var(--radius-group)] flex flex-col">
    {#if cardinality === "one"}
      <RadioGroup.Root value={selected[0] ?? ""} onValueChange={value => onchange?.(value ? [value] : [])} {disabled} {required}
        aria-label={label} class={rowGroup}>{@render rows()}</RadioGroup.Root>
    {:else}<div class={rowGroup}>{@render rows()}</div>{/if}
  </div>
</div>
