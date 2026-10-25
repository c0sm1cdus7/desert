<script lang="ts">
  import { Icon } from "../../index.ts";
  import { pressFeedbackProps } from "../../mechanisms/press-feedback/press-feedback.ts";
  // The chip's own remove button: a 28px target (44px on coarse pointers) at the chip's trailing edge.
  let { label, disabled, onremove }: { label: string | undefined; disabled: boolean; onremove: (() => void) | undefined } = $props();
</script>
<button type="button" {...pressFeedbackProps} class="material-pane control-feedback inline-flex shrink-0 items-center justify-center whitespace-nowrap gap-2 rounded-[var(--radius)]
  type-control outline-none disabled:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 text-secondary-foreground size-[28px] min-h-[28px] p-0
  [@media(pointer:coarse)]:size-[44px] [@media(pointer:coarse)]:min-h-[44px]" aria-label={label} {disabled}
  onclick={() => onremove?.()}><span class="content control-feedback-content"><Icon name="x" decorative /></span></button>
<style>
  .content { position:relative; display:flex; width:100%; min-width:0; flex-direction:inherit; align-items:inherit; justify-content:inherit; gap:inherit; }
</style>
