<script lang="ts">
  // Adapted from Tres Marías design-system select-item; Apache-2.0 (vendor/LICENSE).
  import { Select } from "bits-ui";
  import type { Snippet } from "svelte";
  import RadioMark from "../radio-group/radio-mark.svelte";
  import { cn, type WithoutChildrenOrChild } from "../../../utils.js";
  let { class: className, label, description, leading, ...props }: WithoutChildrenOrChild<Select.ItemProps> & {
    description?: string | undefined; leading?: Snippet | undefined;
  } = $props();
  const descriptionId = $props.id();
</script>
<Select.Item {...props} label={label ?? props.value} aria-disabled={props.disabled} aria-describedby={description ? descriptionId : undefined}
  data-slot="select-item"
  class={cn("tm-control selection-option type-control relative flex w-full cursor-default items-center gap-3 rounded-xl px-3 outline-hidden select-none data-disabled:pointer-events-none data-disabled:opacity-50 data-highlighted:bg-accent data-highlighted:text-accent-foreground [&_svg]:size-4", className)}>
  {#snippet children({ selected })}
    <span class="flex min-w-0 flex-col gap-1"><span>{label ?? props.value}</span>
      {#if description}<span id={descriptionId} class="type-support text-muted-foreground">{description}</span>{/if}
    </span>
    <!-- Bits typeahead reads textContent: keep the label first in DOM order. -->
    <span class="order-first flex shrink-0 items-center gap-3">
      <RadioMark checked={selected} />
      {#if leading}{@render leading()}{/if}
    </span>
  {/snippet}
</Select.Item>
