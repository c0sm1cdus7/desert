<script lang="ts">
  import type { CatalogProps } from "../../types.d.ts";
  import ChoiceCards from "./ChoiceCards.svelte";
  import ChoiceMenu from "./ChoiceMenu.svelte";
  import ChoiceRows from "./ChoiceRows.svelte";
  import ChoiceSwatches from "./ChoiceSwatches.svelte";
  import { menuTriggerOf, swatchesOf } from "./choice-row.ts";
  let { label, labelVisibility, selected, disabled, required, presentation, cardinality, options, menuTrigger, placeholder, measure,
    frame = "pane", onchange }: CatalogProps<"choice"> = $props();
  const id = $props.id();
</script>

{#if presentation === "menu"}
  <ChoiceMenu {id} {label} trigger={menuTriggerOf(menuTrigger)} {placeholder} {measure} {options} {selected} {disabled} {required} {onchange} />
{:else}
  <fieldset class="min-w-0 gap-4 flex flex-col" data-choice={presentation} data-cardinality={cardinality}>
    <legend class="legend" class:sr-only={labelVisibility === "accessible"}>
      {label}{#if required}<span class="required" aria-hidden="true">*</span>{/if}</legend>
    {#if presentation === "rows"}<ChoiceRows {id} {label} {frame} {cardinality} {options} {selected} {disabled} {required} {onchange} />
    {:else if presentation === "cards"}<ChoiceCards {id} {label} {cardinality} {options} {selected} {disabled} {required} {onchange} />
    {:else}<ChoiceSwatches {id} {label} options={swatchesOf(options)} {selected} {disabled} {required} {onchange} />{/if}
  </fieldset>
{/if}

<style>
  /* The visible legend is a group label: caption ink at the rows' inset (today's options title). */
  .legend { max-width:100%; overflow-wrap:break-word; padding-inline:1rem; margin:0 0 .375rem; color:var(--muted-foreground);
    font-size:var(--text-caption); line-height:var(--text-caption--line-height); font-weight:400; }
</style>
