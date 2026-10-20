<script lang="ts">
	import { type WithElementRef, cn } from "@desert/svelte/vendor/utils.js";
	import type { HTMLAttributes } from "svelte/elements";

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLElement>> = $props();
</script>

<div {...restProps} bind:this={ref} class={cn("flex w-full min-w-0 flex-col gap-4", className)}>
	{@render children?.()}
</div>
