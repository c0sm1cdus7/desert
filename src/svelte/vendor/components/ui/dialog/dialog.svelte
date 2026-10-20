<script lang="ts">
	import { Dialog as DialogPrimitive } from "bits-ui";
  import { dismissWhenInactive } from '@desert/svelte/pieces/surface-activity.svelte.ts';

	let { open = $bindable(false), dismissOnInactive = true, ...restProps }:
    DialogPrimitive.RootProps & { dismissOnInactive?: boolean } = $props();
  dismissWhenInactive(() => {
    if (!dismissOnInactive) return;
    open = false; restProps.onOpenChange?.(false);
  });
</script>

<DialogPrimitive.Root bind:open {...restProps} />
