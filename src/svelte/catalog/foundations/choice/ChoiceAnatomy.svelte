<script lang="ts">
  import type { Snippet } from "svelte";
  import type { ChoiceOption } from "../../../../interaction/choice.ts";
  import ChoiceLeading from "./ChoiceLeading.svelte";
  // One choice's anatomy inside its row: the selection mark, the leading artwork, then its label over its description.
  // The row (a label or a listbox option) owns behaviour; a disabled option dims its content, never its row.
  let { option, labelId, descriptionId, dimmed, mark }: { option: ChoiceOption; labelId: string | undefined;
    descriptionId: string | undefined; dimmed: boolean; mark: Snippet } = $props();
</script>
<span class="control-feedback-content flex w-full min-w-0 min-h-11 px-4 py-3 gap-3 items-center" class:opacity-50={dimmed} data-choice-anatomy>
  {@render mark()}
  {#if option.leading}<ChoiceLeading leading={option.leading} frame="mark" />{/if}
  <span class="flex flex-1 min-w-0 flex-col gap-1 text-start [overflow-wrap:anywhere]" data-choice-copy>
    <span id={labelId} class="type-control font-normal">{option.label}</span>
    {#if option.description}<span id={descriptionId} class="type-caption text-muted-foreground">{option.description}</span>{/if}
  </span>
</span>
