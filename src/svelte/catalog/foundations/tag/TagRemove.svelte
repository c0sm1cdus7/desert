<script lang="ts">
  import { Icon } from "../../index.ts";
  // F1-merge: press feedback — the vendor button's pressFeedback attachment (action's family) until its owner is settled.
  import { pressFeedbackProps } from "../../../vendor/components/ui/button/press-feedback.js";
  // The chip's own remove button: a 28px target (44px on coarse pointers) at the chip's trailing edge.
  let { label, disabled, onremove }: { label: string | undefined; disabled: boolean; onremove: (() => void) | undefined } = $props();
</script>
<!-- F1-merge: utility control-feedback / control-feedback-content / material-pane replace tm-control, data-button-content and data-material. -->
<button type="button" {...pressFeedbackProps} class="tm-control inline-flex shrink-0 items-center justify-center whitespace-nowrap gap-2 rounded-full
  type-control outline-none disabled:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 text-secondary-foreground size-[28px] min-h-[28px] p-0
  [@media(pointer:coarse)]:size-[44px] [@media(pointer:coarse)]:min-h-[44px]" data-material="pane" aria-label={label} {disabled}
  onclick={() => onremove?.()}><span class="content" data-button-content><Icon name="x" decorative /></span></button>
<style>
  .content { position:relative; display:flex; width:100%; min-width:0; flex-direction:inherit; align-items:inherit; justify-content:inherit; gap:inherit; }
</style>
