<script lang="ts">
  import { ToggleGroup } from "bits-ui";
  import RadioMark from "../../../vendor/components/ui/radio-group/radio-mark.svelte";
  import type { ChoiceOption } from "../../../../interaction/choice.ts";
  import ChoiceAnatomy from "./ChoiceAnatomy.svelte";
  import { rowDivider, rowFrame, rowGroup } from "./choice-row.ts";
  import { pressFeedback } from "../../mechanisms/press-feedback/press-feedback.ts";
  // The menu's options as one roving-focus listbox, in the popover and in the sheet alike. Moving through it only
  // explores; activation commits (and closes), typing a prefix moves to the next option it starts. A held option compresses
  // its content as a choice row does (press-feedback).
  let { id, label, value, options, required, activeValue = $bindable(null), ref = $bindable(null), onchange, onclose }: { id: string;
    label: string; value: string | null; options: readonly ChoiceOption[]; required: boolean; activeValue?: string | null;
    ref?: HTMLDivElement | null; onchange: (value: string) => void; onclose: () => void } = $props();
  let enabled = $derived(options.filter(option => !option.disabled));
  let focusValue = $derived(enabled.find(option => option.value === (activeValue ?? value))?.value ?? enabled[0]?.value);
  let prefix = "", lastKey = 0;
  function typeahead(event: KeyboardEvent) {
    if (event.key.length !== 1 || event.key === " " || event.altKey || event.metaKey || event.ctrlKey) return;
    if (!(event.currentTarget instanceof HTMLElement)) return;
    prefix = (event.timeStamp - lastKey < 500 ? prefix : "") + event.key.toLocaleLowerCase();
    lastKey = event.timeStamp;
    const needle = [...prefix].every(character => character === prefix[0]) ? prefix.slice(0, 1) : prefix;
    const start = Math.max(0, enabled.findIndex(option => option.value === activeValue) + (needle.length === 1 ? 1 : 0));
    const match = [...enabled.slice(start), ...enabled.slice(0, start)].find(option => option.label.toLocaleLowerCase().startsWith(needle));
    if (!match) return;
    const target = [...event.currentTarget.querySelectorAll<HTMLElement>('[role="option"]')].find(option => option.dataset.choiceOption === match.value);
    target?.focus();
    event.preventDefault();
  }
  function explore(event: FocusEvent) {
    const option = event.target instanceof Element ? event.target.closest<HTMLElement>('[role="option"]') : null;
    if (option?.dataset.choiceOption) activeValue = option.dataset.choiceOption;
  }
</script>

<ToggleGroup.Root type="single" value={value ?? ""} orientation="vertical" onValueChange={next => { if (next) onchange(next); onclose(); }}>
  {#snippet child({ props })}
    <div {...props} bind:this={ref} {id} role="listbox" aria-label={label} aria-required={required || undefined} class={rowGroup}
      onkeydown={typeahead} onfocusin={explore}>
      {#each options as option, index (option.value)}
        <ToggleGroup.Item value={option.value} disabled={option.disabled}>
          {#snippet child({ props: itemProps, pressed })}
            <!-- A listbox option is selected, never pressed or checked: the toggle item's own states are dropped. -->
            {@const { "aria-pressed": _pressed, "aria-checked": _checked, ...optionProps } = itemProps}
            <button {...optionProps} {@attach pressFeedback} type="button" role="option" aria-selected={pressed}
              tabindex={!option.disabled && focusValue === option.value ? 0 : -1} aria-disabled={option.disabled}
              class="shrink-0 items-center justify-start gap-2 type-control outline-none disabled:pointer-events-none [&_svg]:size-4
                [&_svg]:shrink-0 whitespace-normal h-auto text-foreground {rowFrame} {index > 0 ? rowDivider : ''}" data-choice-row
              data-choice-option={option.value} data-highlighted={activeValue === option.value ? "" : undefined}>
              <ChoiceAnatomy {option} labelId={undefined} descriptionId={undefined} dimmed={option.disabled}>
                {#snippet mark()}<RadioMark checked={pressed} />{/snippet}
              </ChoiceAnatomy>
            </button>
          {/snippet}
        </ToggleGroup.Item>
      {/each}
    </div>
  {/snippet}
</ToggleGroup.Root>
