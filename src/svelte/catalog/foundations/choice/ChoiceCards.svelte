<script lang="ts">
  import * as RadioGroup from "../../../vendor/components/ui/radio-group/index.js";
  import { Checkbox } from "../../../vendor/components/ui/checkbox/index.js";
  import type { ChoiceOption } from "../../../../interaction/choice.ts";
  import ChoiceLeading from "./ChoiceLeading.svelte";
  // The options as cards: each card shows its artwork above its control and label, and the chosen card is ringed and
  // tinted. Activating the chosen card again reports it again (an appearance following the system becomes explicit).
  // Theme previews are miniatures, so their cards stay within 24rem; pictures sit at most three to a row, and never so
  // narrow (9rem) that a card's caption breaks a word per line beside its control.
  let { id, label, cardinality, options, selected, disabled, required, onchange }: { id: string; label: string;
    cardinality: "one" | "many"; options: readonly ChoiceOption[]; selected: readonly string[]; disabled: boolean; required: boolean;
    onchange: ((selected: string[]) => void) | undefined } = $props();
  const control = (value: string) => `${id}-${value}`;
  const tracks = (option: ChoiceOption | undefined) => option?.leading?.kind === "theme" ? "previews"
    : option?.leading?.kind === "image" || option?.leading?.kind === "artwork" ? "pictures" : "cards";
  let layout = $derived(tracks(options[0]));
  function toggle(value: string, checked: boolean) {
    onchange?.(checked ? [...selected, value] : selected.filter(item => item !== value));
  }
</script>

{#snippet cards()}
  <div class="grid" data-tracks={layout}>
    {#each options as option (option.value)}
      {@const chosen = selected.includes(option.value)}
      <label class="card material-pane" class:material-pane-selected={chosen} data-selected={chosen} for={control(option.value)}
        data-choice-option={option.value}>
        {#if option.leading}<ChoiceLeading leading={option.leading} frame="card" />{/if}
        <span class="caption">
          {#if cardinality === "one"}
            <RadioGroup.Item id={control(option.value)} value={option.value} aria-label={option.label} disabled={disabled || option.disabled}
              onclick={() => { if (chosen) onchange?.([option.value]); }} />
          {:else}
            <Checkbox id={control(option.value)} checked={chosen} aria-label={option.label} disabled={disabled || option.disabled}
              onCheckedChange={checked => toggle(option.value, checked)} />
          {/if}
          <span>{option.label}</span>
        </span>
      </label>
    {/each}
  </div>
{/snippet}

{#if cardinality === "one"}
  <RadioGroup.Root aria-label={label} value={selected[0] ?? ""} {disabled} {required} onValueChange={value => onchange?.(value ? [value] : [])}>
    {@render cards()}
  </RadioGroup.Root>
{:else}{@render cards()}{/if}

<style>
  .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,8rem),1fr)); gap:.75rem; }
  .grid[data-tracks="previews"] { max-width:24rem; }
  .grid[data-tracks="pictures"] { grid-template-columns:repeat(auto-fill,minmax(min(100%,max(9rem,(100% - 1.5rem) / 3)),1fr)); }
  /* A card is a control (the control radius); the artwork at its top corners is concentric with it (law 9d): the card's
     radius less its inset, the padding and the pane's 1px border. */
  .card { --card-inset:.625rem; --cover-radius:calc(var(--radius-control) - var(--card-inset) - 1px);
    min-width:0; display:grid; gap:.625rem; padding:var(--card-inset); border-radius:var(--radius-control); cursor:pointer; }
  .card[data-selected="true"] { outline:2px solid var(--ring); outline-offset:1px; }
  .card:has(:focus-visible) { outline:3px solid var(--ring); outline-offset:3px; }
  .card:has(:disabled) { cursor:default; opacity:.5; }
  .caption { display:flex; justify-content:center; align-items:center; gap:.5rem; padding:.125rem; }
</style>
