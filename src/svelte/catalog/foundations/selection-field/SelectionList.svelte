<script lang="ts">
  import type { Snippet } from "svelte";
  import { ToggleGroup } from "bits-ui";
  import { Button } from "../../../vendor/components/ui/button/index.js";
  import RadioMark from "../../../vendor/components/ui/radio-group/radio-mark.svelte";
  import { Face } from "../../index.ts";
  import { ChoiceItem } from "../../index.ts";
  import { ChoiceList } from "../../index.ts";
  import type { SelectionOption } from "../../../../interaction/selection-option.ts";
  let { label, value, options, optionLeading, onchange, onclose, required = false, activeValue = $bindable(null), ref = $bindable(null) }: {
    label: string; value: string | null;
    required?: boolean;
    activeValue?: string | null; ref?: HTMLDivElement | null;
    options: readonly (SelectionOption & { readonly description?: string })[];
    optionLeading?: Snippet<[SelectionOption]> | undefined;
    onchange: (value: string) => void; onclose: () => void;
  } = $props();
  let enabled = $derived(options.filter(option => !option.disabled));
  let focusValue = $derived(enabled.find(option => option.value === (activeValue ?? value))?.value ?? enabled[0]?.value);
  let prefix = "", lastKey = 0;
  function typeahead(event: KeyboardEvent) {
    if (event.key.length !== 1 || event.key === " " || event.altKey || event.metaKey || event.ctrlKey) return;
    prefix = (event.timeStamp - lastKey < 500 ? prefix : "") + event.key.toLocaleLowerCase();
    lastKey = event.timeStamp;
    const needle = [...prefix].every(character => character === prefix[0]) ? prefix[0]! : prefix;
    const start = Math.max(0, enabled.findIndex(option => option.value === activeValue) + (needle.length === 1 ? 1 : 0));
    const ordered = [...enabled.slice(start), ...enabled.slice(0, start)];
    const match = ordered.find(option => option.label.toLocaleLowerCase().startsWith(needle));
    if (!match) return;
    const root = event.currentTarget as HTMLElement;
    root.querySelectorAll<HTMLElement>('[role="option"]').forEach(option => {
      if (option.dataset.value === match.value) option.focus();
    });
    event.preventDefault();
  }
</script>
<!-- Both presentations use the same roving-focus list. Exploration belongs
     to the field owner; only activation changes its selected value. -->
<ChoiceList><ToggleGroup.Root type="single" value={value ?? ""} orientation="vertical"
  onValueChange={next => { if (next) onchange(next); onclose(); }}>
  {#snippet child({ props })}
    <div {...props} bind:this={ref} role="listbox" aria-label={label} aria-required={required || undefined} data-grouped-rows onkeydown={typeahead}
      onfocusin={event => {
        const option = (event.target as HTMLElement).closest<HTMLElement>('[role="option"]');
        if (option?.dataset.value) activeValue = option.dataset.value;
      }}>
      {#each options as option (option.value)}
        <ToggleGroup.Item value={option.value} disabled={option.disabled}>
          {#snippet child({ props: itemProps, pressed })}
            <Button {...itemProps} role="option" aria-checked={undefined} aria-pressed={undefined} aria-selected={pressed}
              tabindex={!option.disabled && focusValue === option.value ? 0 : -1}
              aria-disabled={option.disabled} variant="row" size="well" data-slot="select-item"
              data-grouped-row data-choice-row data-material="interior"
              data-highlighted={activeValue === option.value ? '' : undefined}>
              <ChoiceItem label={option.label} description={option.description}>
                <RadioMark checked={pressed} />
                {#if optionLeading}{@render optionLeading(option)}
                {:else if option.face}<Face face={option.face} compact />{/if}
              </ChoiceItem>
            </Button>
          {/snippet}
        </ToggleGroup.Item>
      {/each}
    </div>
  {/snippet}
</ToggleGroup.Root></ChoiceList>
