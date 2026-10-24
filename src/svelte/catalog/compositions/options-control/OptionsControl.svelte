<script lang="ts">
  import * as Field from "../../../vendor/components/ui/field/index.js";
  import * as RadioGroup from "../../../vendor/components/ui/radio-group/index.js";
  import { Checkbox } from "../../../vendor/components/ui/checkbox/index.js";
  import { GroupedPanel } from "../../index.ts";
  import { ChoiceRow } from "../../index.ts";
  import { ChoiceList } from "../../index.ts";
  import type { ControlProps } from "../../../renderer-contracts.ts";
  import { permitsOptionsSelection, optionsInputRequired } from "../../../../interaction/extended-controls.ts";
  import { currentStackTitle } from "../../../infra/stack-context.ts";
  let { node, onevent }: ControlProps<"options"> = $props();
  const prefix = $props.id();
  const stackTitle = currentStackTitle();
  let inputRequired = $derived(optionsInputRequired(node));
  const change = (selected: readonly string[]) => {
    if (permitsOptionsSelection(node, selected)) onevent({ kind: "options.change", control: node.id, selected });
  };
  const nextSelection = (value: string) => node.maxSelected === 1 ? [value] :
    node.selected.includes(value) ? node.selected.filter(item => item !== value) : [...node.selected, value];
  const disabled = (value: string, unavailable: boolean) => unavailable || !permitsOptionsSelection(node, nextSelection(value));
</script>
{#snippet choices()}
    {#each node.options as option (option.value)}
      <ChoiceRow id={`${prefix}-${option.value}`} labelId={`${prefix}-${option.value}-label`}
        descriptionId={`${prefix}-${option.value}-description`} label={option.label} description={option.description}
        disabled={disabled(option.value, option.disabled)}>
          {#if node.maxSelected === 1}
            <RadioGroup.Item id={`${prefix}-${option.value}`} value={option.value} disabled={disabled(option.value, option.disabled)}
              aria-labelledby={`${prefix}-${option.value}-label`} aria-describedby={option.description ? `${prefix}-${option.value}-description` : undefined} />
          {:else}
            <Checkbox id={`${prefix}-${option.value}`} bind:checked={() => node.selected.includes(option.value),
              checked => change(checked ? [...node.selected, option.value] : node.selected.filter(value => value !== option.value))}
              disabled={disabled(option.value, option.disabled)} aria-labelledby={`${prefix}-${option.value}-label`}
              aria-describedby={option.description ? `${prefix}-${option.value}-description` : undefined} />
          {/if}
      </ChoiceRow>
    {/each}
{/snippet}
<Field.FieldSet data-control="options" data-cardinality={node.maxSelected === 1 ? "one" : "many"}>
  <Field.FieldLegend variant="label" class={stackTitle() === node.label ? "sr-only" : "options-title"}>{node.label}{#if inputRequired}<span class="required" aria-hidden="true">*</span>{/if}</Field.FieldLegend>
  <GroupedPanel><ChoiceList>{#if node.maxSelected === 1}
    <RadioGroup.Root bind:value={() => node.selected[0] ?? "", value => change(value ? [value] : [])}
      disabled={node.disabled} required={inputRequired} aria-label={node.label} data-grouped-rows>{@render choices()}</RadioGroup.Root>
  {:else}<Field.FieldGroup data-grouped-rows>{@render choices()}</Field.FieldGroup>{/if}</ChoiceList></GroupedPanel>
</Field.FieldSet>
